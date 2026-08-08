// ---------------------------------------------------------------------------
// Data-access layer for prompts & categories — backed by Cloudflare D1.
//
// This is the ONLY module the rest of the app imports for prompt data. It
// reads the `DB` binding via the Workers `env`. Public functions return
// approved prompts only; pending/rejected items are visible to the submitter
// (via getPromptsByAuthor with includeAll) and to admins (via getPendingPrompts).
//
// Types still live in src/data (which doubles as the D1 seed source via
// scripts/gen-seed.ts).
// ---------------------------------------------------------------------------

import { env } from 'cloudflare:workers';
import type { Prompt } from '../data/prompts';
import type { Category } from '../data/categories';
import type { Tag } from '../data/tags';
import { tags as ALL_TAGS } from '../data/tags';
import { generateSlug, logActivity } from './cms';

export type { Prompt, Category, Tag };

function getDB(): D1Database {
	const db = env.DB;
	if (!db) {
		throw new Error(
			'D1 binding "DB" is not available. Check wrangler.jsonc d1_databases and that the DB is seeded.',
		);
	}
	return db;
}

interface PromptRow {
	slug: string;
	title: string;
	description: string;
	prompt_text: string;
	category: string;
	tags: string;
	author: string;
	date: string;
	cover_image: string | null;
	images: string | null;
	featured: number;
	liked: number;
	popularity: number;
	save_count: number;
	like_count: number;
	share_count: number;
	view_count: number;
	publish_at: string | null;
	updated_at: string | null;
	cover_w: number | null;
	cover_h: number | null;
	how_to_use: string | null;
	source_url: string | null;
	created_by: string | null;
	status?: string;
	submitted_by?: string | null;
	submitted_at?: string | null;
	reviewed_by?: string | null;
	reviewed_at?: string | null;
	rejection_reason?: string | null;
}

function rowToPrompt(r: PromptRow): Prompt {
	let images: string[] = [];
	try {
		const parsed = JSON.parse(r.images || '[]');
		if (Array.isArray(parsed)) images = parsed;
	} catch {}
	return {
		slug: r.slug,
		title: r.title,
		description: r.description,
		promptText: r.prompt_text,
		category: r.category,
		tags: JSON.parse(r.tags || '[]'),
		author: r.author,
		date: r.date,
		coverImage: r.cover_image ?? undefined,
		images,
		featured: !!r.featured,
		liked: !!r.liked,
		popularity: r.popularity,
		saveCount: r.save_count,
		likeCount: r.like_count,
		shareCount: r.share_count,
		viewCount: r.view_count,
		publishAt: r.publish_at ?? undefined,
		updatedAt: r.updated_at ?? undefined,
		coverW: r.cover_w ?? undefined,
		coverH: r.cover_h ?? undefined,
		howToUse: r.how_to_use ?? undefined,
		sourceUrl: r.source_url ?? undefined,
		createdBy: r.created_by ?? undefined,
		status: (r.status as Prompt['status']) ?? 'approved',
		submittedBy: r.submitted_by ?? undefined,
		submittedAt: r.submitted_at ?? undefined,
		reviewedBy: r.reviewed_by ?? undefined,
		reviewedAt: r.reviewed_at ?? undefined,
		rejectionReason: r.rejection_reason ?? undefined,
	};
}

const PROMPT_COLS =
	'slug, title, description, prompt_text, category, tags, author, date, cover_image, images, featured, liked, popularity, save_count, like_count, share_count, view_count, publish_at, updated_at, cover_w, cover_h, how_to_use, source_url, created_by, status, submitted_by, submitted_at, reviewed_by, reviewed_at, rejection_reason';

// Public visibility gate. A prompt is live only when it's approved AND either
// has no scheduled time or that time has passed. Centralized here so every
// public query (lists, detail, category, related, popular, trending, POD,
// saved, author, stats, sitemap) honours scheduling with no extra code.
// publish_at is unambiguous in JOIN queries (only `prompts` has the column).
const APPROVED =
	"status = 'approved' AND (publish_at IS NULL OR publish_at <= datetime('now'))";

/**
 * All approved prompts, newest first. `date` is day-granularity, so prompts
 * published on the same day are tiebroken by created_at (matches the admin list)
 * to keep the "Recent" feed deterministic and truly newest-first.
 */
export async function getAllPrompts(): Promise<Prompt[]> {
	const { results } = await getDB()
		.prepare(`SELECT ${PROMPT_COLS} FROM prompts WHERE ${APPROVED} ORDER BY date DESC, created_at DESC`)
		.all<PromptRow>();
	return results.map(rowToPrompt);
}

// Public "newest" ordering for the home Recent/All tabs. Primary key is the
// publish date (day-granularity `date`); within a day we order by the precise
// publish time — the scheduled `publish_at` when set, else the row's
// `created_at` — so same-day prompts (including ones that went live today on a
// schedule) sort in true publish order instead of an arbitrary/alphabetical
// fallback. `slug` is the final deterministic tiebreaker (needed for stable
// keyset pagination).
const NEWEST_TS = 'COALESCE(publish_at, created_at)';
const NEWEST_ORDER = `date DESC, ${NEWEST_TS} DESC, slug ASC`;

/**
 * Earliest still-pending scheduled go-live time (UTC 'YYYY-MM-DD HH:MM:SS'), or
 * null when nothing is queued. Lets the CDN cache TTL be shortened so a scheduled
 * prompt appears promptly at its publish_at instead of lingering behind a stale
 * cached page. One indexed MIN lookup; runs only on cache misses (in middleware).
 */
export async function getNextPublishAt(): Promise<string | null> {
	const row = await getDB()
		.prepare(
			`SELECT MIN(next) AS next FROM (
				SELECT MIN(publish_at) AS next FROM prompts
				WHERE status = 'approved' AND publish_at IS NOT NULL AND publish_at > datetime('now')
				UNION ALL
				SELECT MIN(publish_at) AS next FROM posts
				WHERE status = 'published' AND publish_at IS NOT NULL AND publish_at > datetime('now')
			)`,
		)
		.first<{ next: string | null }>();
	return row?.next ?? null;
}

/** The newest N approved prompts — bounded "what's new" view for the home Recent tab. */
export async function getRecentPrompts(limit = 24, category?: string): Promise<Prompt[]> {
	const categoryFilter = category ? ' AND category = ?' : '';
	const { results } = await getDB()
		.prepare(`SELECT ${PROMPT_COLS} FROM prompts WHERE ${APPROVED}${categoryFilter} ORDER BY ${NEWEST_ORDER} LIMIT ?`)
		.bind(...(category ? [category, limit] : [limit]))
		.all<PromptRow>();
	return results.map(rowToPrompt);
}

export interface PromptPage {
	prompts: Prompt[];
	/** Opaque cursor for the next page, or null when the last page was returned. */
	nextCursor: string | null;
}

/**
 * Keyset-paginated page of approved prompts in the same order as the Recent tab,
 * powering the home "All" tab's infinite scroll. The cursor encodes the 3-part
 * sort key `${date}|${sortTs}|${slug}` of the last row (sortTs = NEWEST_TS).
 * Pass null for the first page. Stable under inserts (no OFFSET drift); we
 * over-fetch one row to learn whether a further page exists.
 */
export async function getPromptsPage(cursor: string | null, limit = 24, category?: string): Promise<PromptPage> {
	const db = getDB();
	const probe = limit + 1;
	const SELECT = `SELECT ${PROMPT_COLS}, ${NEWEST_TS} AS sort_ts FROM prompts`;
	const categoryFilter = category ? ' AND category = ?' : '';
	type Row = PromptRow & { sort_ts: string | null };

	let results: Row[];
	if (cursor) {
		const parts = cursor.split('|');
		const date = parts[0];
		const ts = parts[1];
		const slug = parts.slice(2).join('|');
		({ results } = await db
			.prepare(
				`${SELECT} WHERE ${APPROVED}${categoryFilter} AND (
					date < ?
					OR (date = ? AND ${NEWEST_TS} < ?)
					OR (date = ? AND ${NEWEST_TS} = ? AND slug > ?)
				) ORDER BY ${NEWEST_ORDER} LIMIT ?`,
			)
			.bind(...(category ? [category, date, date, ts, date, ts, slug, probe] : [date, date, ts, date, ts, slug, probe]))
			.all<Row>());
	} else {
		({ results } = await db
			.prepare(`${SELECT} WHERE ${APPROVED}${categoryFilter} ORDER BY ${NEWEST_ORDER} LIMIT ?`)
			.bind(...(category ? [category, probe] : [probe]))
			.all<Row>());
	}

	const hasMore = results.length > limit;
	const pageRows = hasMore ? results.slice(0, limit) : results;
	const last = pageRows[pageRows.length - 1];
	return {
		prompts: pageRows.map(rowToPrompt),
		nextCursor: hasMore && last ? `${last.date}|${last.sort_ts ?? ''}|${last.slug}` : null,
	};
}

/**
 * A single prompt by slug. By default returns only approved prompts so pending
 * items can't be opened by URL guessing. Pass { includeAll: true } from admin
 * surfaces or from the author's self-view.
 */
export async function getPromptBySlug(
	slug: string,
	opts: { includeAll?: boolean } = {},
): Promise<Prompt | undefined> {
	const where = opts.includeAll ? 'WHERE slug = ?' : `WHERE slug = ? AND ${APPROVED}`;
	const row = await getDB()
		.prepare(`SELECT ${PROMPT_COLS} FROM prompts ${where}`)
		.bind(slug)
		.first<PromptRow>();
	return row ? rowToPrompt(row) : undefined;
}

/** Approved prompts in a category, newest first. */
export async function getPromptsByCategory(categorySlug: string): Promise<Prompt[]> {
	const { results } = await getDB()
		.prepare(
			`SELECT ${PROMPT_COLS} FROM prompts WHERE category = ? AND ${APPROVED} ORDER BY date DESC`,
		)
		.bind(categorySlug)
		.all<PromptRow>();
	return results.map(rowToPrompt);
}

/** A bounded, server-rendered page of category prompts for category landing pages. */
export async function getPromptsByCategoryPage(
	categorySlug: string,
	page = 1,
	limit = 48,
): Promise<{ prompts: Prompt[]; total: number; totalPages: number }> {
	const safePage = Math.max(1, Math.floor(page) || 1);
	const offset = (safePage - 1) * limit;
	const db = getDB();
	const [countRow, result] = await Promise.all([
		db
			.prepare(`SELECT COUNT(*) AS count FROM prompts WHERE category = ? AND ${APPROVED}`)
			.bind(categorySlug)
			.first<{ count: number }>(),
		db
			.prepare(
				`SELECT ${PROMPT_COLS} FROM prompts WHERE category = ? AND ${APPROVED} ORDER BY ${NEWEST_ORDER} LIMIT ? OFFSET ?`,
			)
			.bind(categorySlug, limit, offset)
			.all<PromptRow>(),
	]);
	const total = countRow?.count ?? 0;
	return {
		prompts: result.results.map(rowToPrompt),
		total,
		totalPages: Math.max(1, Math.ceil(total / limit)),
	};
}

/** Featured + approved prompts. */
export async function getFeaturedPrompts(): Promise<Prompt[]> {
	const { results } = await getDB()
		.prepare(`SELECT ${PROMPT_COLS} FROM prompts WHERE featured = 1 AND ${APPROVED} ORDER BY date DESC`)
		.all<PromptRow>();
	return results.map(rowToPrompt);
}

/** Related prompts: same category first, then most popular, excluding self. Approved only. */
export async function getRelatedPrompts(prompt: Prompt, limit = 3): Promise<Prompt[]> {
	// Rank by genuine relevance: how many of THIS prompt's own tags another prompt
	// shares (in its tags/title/description). Specific overlaps (e.g. "couple prompt")
	// add to the count alongside generic ones, so the most similar prompts rank
	// highest and the rail varies per page — instead of always showing the same
	// most-popular prompts. Falls back to category + popularity when there's no
	// tag overlap (or the prompt has no tags).
	const terms = [...new Set((prompt.tags ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean))]
		.slice(0, 10);
	if (terms.length > 0) {
		const cond = '(LOWER(tags) LIKE ? OR LOWER(title) LIKE ? OR LOWER(description) LIKE ?)';
		const where = terms.map(() => cond).join(' OR ');
		const score = terms.map(() => `(CASE WHEN ${cond} THEN 1 ELSE 0 END)`).join(' + ');
		const like = terms.map((t) => `%${t}%`);
		// Binds, in placeholder order: score block (3/term), slug for slug!=?, WHERE
		// block (3/term), category for the ORDER BY tiebreak, then limit.
		const { results } = await getDB()
			.prepare(
				`SELECT ${PROMPT_COLS}, (${score}) AS rank FROM prompts
				 WHERE slug != ? AND ${APPROVED} AND (${where})
				 ORDER BY rank DESC, (category = ?) DESC, popularity DESC, save_count DESC
				 LIMIT ?`,
			)
			.bind(
				...like.flatMap((l) => [l, l, l]),
				prompt.slug,
				...like.flatMap((l) => [l, l, l]),
				prompt.category,
				limit,
			)
			.all<PromptRow>();
		if (results.length > 0) return results.map(rowToPrompt);
	}
	// Fallback: no tags or no overlap — same-category, most-popular prompts.
	const { results } = await getDB()
		.prepare(
			`SELECT ${PROMPT_COLS} FROM prompts
			 WHERE slug != ? AND ${APPROVED}
			 ORDER BY (category = ?) DESC, popularity DESC
			 LIMIT ?`,
		)
		.bind(prompt.slug, prompt.category, limit)
		.all<PromptRow>();
	return results.map(rowToPrompt);
}

/** All categories, in display order. */
export async function getAllCategories(): Promise<Category[]> {
	const { results } = await getDB()
		.prepare('SELECT slug, name, description, emoji FROM prompt_categories ORDER BY sort_order')
		.all<Category>();
	return results;
}

/** A single category by slug. */
export async function getCategoryBySlug(slug: string): Promise<Category | undefined> {
	const row = await getDB()
		.prepare('SELECT slug, name, description, emoji FROM prompt_categories WHERE slug = ?')
		.bind(slug)
		.first<Category>();
	return row ?? undefined;
}

// ---------------------------------------------------------------------------
// SEO tag pages — keyword landing pages at /<slug>. Tags are static
// (keyword research from src/data/tags.ts); the prompts shown are matched live
// from D1 by the tag's significant terms, falling back to popular prompts so a
// page never renders empty (a keyword may not match any prompt's tags/title).
// ---------------------------------------------------------------------------

/** All keyword tags, in research order. */
export function getAllTags(): Tag[] {
	return ALL_TAGS;
}

/** A single tag by slug, or undefined when the slug isn't a known keyword. */
export function getTagBySlug(slug: string): Tag | undefined {
	return ALL_TAGS.find((t) => t.slug === slug);
}

/**
 * Approved prompts relevant to a tag's keyword. A prompt matches when any of the
 * tag's significant terms appears in its tags, title, or description; results are
 * ranked by how many distinct terms match, then popularity. When nothing matches
 * (the keyword has no related prompts yet) we fall back to the most popular
 * prompts so the page still has content. `matched` reports whether the rows are a
 * real keyword match (true) or the popular fallback (false).
 */
export async function getPromptsByTag(
	tag: Tag,
	limit = 60,
): Promise<{ prompts: Prompt[]; matched: boolean }> {
	const terms = tag.matchTerms.filter(Boolean);
	if (terms.length > 0) {
		// One LIKE-across-fields predicate per term; score = count of matching terms.
		const cond = (t: string) =>
			'(LOWER(tags) LIKE ? OR LOWER(title) LIKE ? OR LOWER(description) LIKE ?)';
		const where = terms.map(cond).join(' OR ');
		const score = terms.map((t) => `(CASE WHEN ${cond(t)} THEN 1 ELSE 0 END)`).join(' + ');
		// Binds: score block (3/term) first, then the WHERE block (3/term).
		const like = terms.map((t) => `%${t.toLowerCase()}%`);
		const binds = [...like.flatMap((l) => [l, l, l]), ...like.flatMap((l) => [l, l, l]), limit];
		const { results } = await getDB()
			.prepare(
				`SELECT ${PROMPT_COLS}, (${score}) AS rank FROM prompts
				 WHERE ${APPROVED} AND (${where})
				 ORDER BY rank DESC, save_count DESC, date DESC
				 LIMIT ?`,
			)
			.bind(...binds)
			.all<PromptRow>();
		if (results.length > 0) return { prompts: results.map(rowToPrompt), matched: true };
	}
	// Fallback: keyword matched nothing — show popular prompts so the page isn't empty.
	const popular = await getPopularPrompts(limit);
	return { prompts: popular, matched: false };
}

/**
 * Total approved prompts + total likes across them. Powers the header
 * stat counter. One indexed COUNT/SUM, runs <2 ms on warm D1.
 */
export async function getSiteStats(): Promise<{ promptCount: number; likeTotal: number }> {
	const row = await getDB()
		.prepare(
			`SELECT COUNT(*) AS n, COALESCE(SUM(like_count), 0) AS l
			 FROM prompts WHERE ${APPROVED}`,
		)
		.first<{ n: number; l: number }>();
	return { promptCount: row?.n ?? 0, likeTotal: row?.l ?? 0 };
}

/** Map of category slug -> approved-prompt count. */
export async function getCategoryCounts(): Promise<Record<string, number>> {
	const { results } = await getDB()
		.prepare(`SELECT category, COUNT(*) AS n FROM prompts WHERE ${APPROVED} GROUP BY category`)
		.all<{ category: string; n: number }>();
	const map: Record<string, number> = {};
	for (const r of results) map[r.category] = r.n;
	return map;
}

/** Rough read-time estimate in minutes. */
export function readTime(prompt: Prompt): number {
	const words = `${prompt.description} ${prompt.promptText} ${prompt.howToUse ?? ''}`
		.trim()
		.split(/\s+/).length;
	return Math.max(1, Math.round(words / 200));
}

// ---------------------------------------------------------------------------
// Social queries — drive the Popular / Trending tabs and the /saved page.
// ---------------------------------------------------------------------------

/** Approved prompts ordered by all-time saves, newest as tiebreaker. */
export async function getPopularPrompts(limit = 60, category?: string): Promise<Prompt[]> {
	const categoryFilter = category ? ' AND category = ?' : '';
	const { results } = await getDB()
		.prepare(
			`SELECT ${PROMPT_COLS} FROM prompts WHERE ${APPROVED}${categoryFilter} ORDER BY save_count DESC, date DESC LIMIT ?`,
		)
		.bind(...(category ? [category, limit] : [limit]))
		.all<PromptRow>();
	return results.map(rowToPrompt);
}

/**
 * Trending = approved prompts with the most saves+shares in the last 7 days.
 * Computed live; if nothing has happened in a week, the list will be empty
 * (callers should fall back to the Popular list to avoid a dead tab).
 */
export async function getTrendingPrompts(limit = 60, category?: string): Promise<Prompt[]> {
	const cols = PROMPT_COLS.split(', ')
		.map((c) => `p.${c}`)
		.join(', ');
	const categoryFilter = category ? ' AND p.category = ?' : '';
	const { results } = await getDB()
		.prepare(
			`SELECT ${cols}, COUNT(e.id) AS score
			 FROM prompts p
			 LEFT JOIN prompt_events e
			   ON e.prompt_slug = p.slug
			  AND e.kind IN ('save','like','share')
			  AND e.created_at > datetime('now','-7 days')
			 WHERE p.${APPROVED}${categoryFilter}
			 GROUP BY p.slug
			 HAVING score > 0
			 ORDER BY score DESC, p.date DESC
			 LIMIT ?`,
		)
		.bind(...(category ? [category, limit] : [limit]))
		.all<PromptRow>();
	return results.map(rowToPrompt);
}

// ---------------------------------------------------------------------------
// Prompt of the Day — the approved prompt with the most views in the trailing
// window, falling back to all-time views then newest so it always resolves to
// exactly one. Cached in-process so the badge is stable across a request burst
// and we don't re-run the GROUP BY for every grid/card on a page.
// ---------------------------------------------------------------------------

/** How many days of views feed the "of the day" ranking. */
const POTD_WINDOW_DAYS = 7;
/** How long a computed winner is reused before recomputing (ms). */
const POTD_CACHE_MS = 10 * 60 * 1000;

let potdCache: { slug: string | null; at: number } | null = null;

/**
 * Slug of the current Prompt of the Day, or null when there are no approved
 * prompts. View-driven and self-rotating; result is memoized for POTD_CACHE_MS.
 */
export async function getPromptOfTheDaySlug(now = Date.now()): Promise<string | null> {
	if (potdCache && now - potdCache.at < POTD_CACHE_MS) return potdCache.slug;

	const row = await getDB()
		.prepare(
			`SELECT p.slug AS slug, COUNT(e.id) AS recent_views
			 FROM prompts p
			 LEFT JOIN prompt_events e
			   ON e.prompt_slug = p.slug
			  AND e.kind = 'view'
			  AND e.created_at > datetime('now', ?)
			 WHERE p.${APPROVED}
			 GROUP BY p.slug
			 ORDER BY recent_views DESC, p.view_count DESC, p.date DESC
			 LIMIT 1`,
		)
		.bind(`-${POTD_WINDOW_DAYS} days`)
		.first<{ slug: string }>();

	potdCache = { slug: row?.slug ?? null, at: now };
	return potdCache.slug;
}

/** Approved prompts saved by a given actor, most recently saved first. */
export async function getSavedPrompts(actorId: string): Promise<Prompt[]> {
	const cols = PROMPT_COLS.split(', ')
		.map((c) => `p.${c}`)
		.join(', ');
	const { results } = await getDB()
		.prepare(
			`SELECT ${cols} FROM prompts p
			 INNER JOIN prompt_saves s ON s.prompt_slug = p.slug
			 WHERE s.actor_id = ? AND p.${APPROVED}
			 ORDER BY s.created_at DESC`,
		)
		.bind(actorId)
		.all<PromptRow>();
	return results.map(rowToPrompt);
}

/** Approved prompts liked by a given actor, most recently liked first. */
export async function getLikedPrompts(actorId: string): Promise<Prompt[]> {
	const cols = PROMPT_COLS.split(', ')
		.map((c) => `p.${c}`)
		.join(', ');
	const { results } = await getDB()
		.prepare(
			`SELECT ${cols} FROM prompts p
			 INNER JOIN prompt_likes l ON l.prompt_slug = p.slug
			 WHERE l.actor_id = ? AND p.${APPROVED}
			 ORDER BY l.created_at DESC`,
		)
		.bind(actorId)
		.all<PromptRow>();
	return results.map(rowToPrompt);
}

// ---------------------------------------------------------------------------
// Author profile + submission workflow
// ---------------------------------------------------------------------------

/**
 * Prompts by a given user — joins on submitted_by (user-submitted) or
 * created_by (admin-created). Default: approved only. Pass includeAll when
 * the viewer IS the author so they can see their own pending/rejected items.
 */
export async function getPromptsByAuthor(
	userId: string,
	opts: { includeAll?: boolean } = {},
): Promise<Prompt[]> {
	const where = opts.includeAll
		? '(submitted_by = ? OR created_by = ?)'
		: `(submitted_by = ? OR created_by = ?) AND ${APPROVED}`;
	const { results } = await getDB()
		.prepare(
			`SELECT ${PROMPT_COLS} FROM prompts
			 WHERE ${where}
			 ORDER BY date DESC, submitted_at DESC`,
		)
		.bind(userId, userId)
		.all<PromptRow>();
	return results.map(rowToPrompt);
}

export interface PromptSubmissionInput {
	title: string;
	description: string;
	promptText: string;
	category: string;
	tags: string[];
	howToUse?: string;
	coverImage?: string;
	images?: string[];
	slug?: string;
}

export interface PromptSubmissionResult {
	slug: string;
}

/**
 * A free slug derived from `base`. If `base` is taken, append the smallest
 * numeric suffix that isn't — `base`, then `base-2`, `base-3`, … — so duplicate
 * titles get a clean short slug on the same keyword instead of a random code.
 */
async function uniqueSlug(db: ReturnType<typeof getDB>, base: string): Promise<string> {
	let candidate = base;
	for (let n = 2; ; n++) {
		const taken = await db
			.prepare('SELECT 1 FROM prompts WHERE slug = ?')
			.bind(candidate)
			.first();
		if (!taken) return candidate;
		candidate = `${base}-${n}`;
	}
}

/** Insert a user-submitted prompt with status='pending'. */
export async function submitPrompt(
	input: PromptSubmissionInput,
	submitter: { id: string; name: string },
): Promise<PromptSubmissionResult> {
	const db = getDB();

	if (!input.title?.trim() || !input.promptText?.trim() || !input.category?.trim()) {
		throw new Error('Missing required fields: title, promptText, category.');
	}

	const base = (input.slug ? generateSlug(input.slug) : generateSlug(input.title)) || 'prompt';
	const slug = await uniqueSlug(db, base);

	const today = new Date().toISOString().slice(0, 10);
	const now = new Date().toISOString();

	const images: string[] = Array.isArray(input.images)
		? input.images.filter((s) => typeof s === 'string' && s.trim())
		: [];
	const coverImage = input.coverImage || (images.length > 0 ? images[0] : null);

	await db
		.prepare(
			`INSERT INTO prompts
			   (slug, title, description, prompt_text, category, tags, author, date,
			    cover_image, images, featured, liked, popularity, how_to_use,
			    status, submitted_by, submitted_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, 'pending', ?, ?)`,
		)
		.bind(
			slug,
			input.title.trim(),
			(input.description || '').trim(),
			input.promptText,
			input.category,
			JSON.stringify(input.tags ?? []),
			submitter.name,
			today,
			coverImage,
			JSON.stringify(images),
			input.howToUse?.trim() || null,
			submitter.id,
			now,
		)
		.run();

	await logActivity(db, {
		userId: submitter.id,
		userName: submitter.name,
		action: 'submit_prompt',
		entityType: 'prompt',
		entityId: slug,
		entityTitle: input.title.trim(),
	});

	return { slug };
}

export interface PendingPrompt extends Prompt {
	submitterName: string;
	submitterAvatar: string;
	submitterUsername: string;
}

/** Pending submissions for the admin queue, oldest first. */
export async function getPendingPrompts(): Promise<PendingPrompt[]> {
	const cols = PROMPT_COLS.split(', ')
		.map((c) => `p.${c}`)
		.join(', ');
	const { results } = await getDB()
		.prepare(
			`SELECT ${cols},
			        u.name AS submitter_name,
			        u.avatar_url AS submitter_avatar,
			        u.username AS submitter_username
			 FROM prompts p
			 LEFT JOIN users u ON u.id = p.submitted_by
			 WHERE p.status = 'pending'
			 ORDER BY p.submitted_at ASC`,
		)
		.all<PromptRow & {
			submitter_name: string | null;
			submitter_avatar: string | null;
			submitter_username: string | null;
		}>();
	return results.map((r) => ({
		...rowToPrompt(r),
		submitterName: r.submitter_name ?? r.author,
		submitterAvatar: r.submitter_avatar ?? '',
		submitterUsername: r.submitter_username ?? '',
	}));
}

/** Count of pending submissions — used for the admin sidebar badge. */
export async function getPendingCount(): Promise<number> {
	const row = await getDB()
		.prepare("SELECT COUNT(*) AS n FROM prompts WHERE status = 'pending'")
		.first<{ n: number }>();
	return row?.n ?? 0;
}

/** Approve or reject a pending submission. */
export async function reviewPrompt(
	slug: string,
	action: 'approve' | 'reject',
	reviewer: { id: string; name: string },
	reason?: string,
): Promise<{ ok: true; status: 'approved' | 'rejected' } | { ok: false; error: string }> {
	const db = getDB();
	const row = await db
		.prepare('SELECT slug, title, status FROM prompts WHERE slug = ?')
		.bind(slug)
		.first<{ slug: string; title: string; status: string }>();
	if (!row) return { ok: false, error: 'Prompt not found.' };
	if (row.status !== 'pending') return { ok: false, error: `Prompt is already ${row.status}.` };

	const now = new Date().toISOString();
	const newStatus: 'approved' | 'rejected' = action === 'approve' ? 'approved' : 'rejected';

	if (action === 'approve') {
		// Refresh `date` so the prompt sorts into Newest at its approval moment.
		const today = now.slice(0, 10);
		await db
			.prepare(
				`UPDATE prompts
				 SET status = 'approved', reviewed_by = ?, reviewed_at = ?, rejection_reason = NULL, date = ?
				 WHERE slug = ?`,
			)
			.bind(reviewer.id, now, today, slug)
			.run();
	} else {
		await db
			.prepare(
				`UPDATE prompts
				 SET status = 'rejected', reviewed_by = ?, reviewed_at = ?, rejection_reason = ?
				 WHERE slug = ?`,
			)
			.bind(reviewer.id, now, reason?.trim() || null, slug)
			.run();
	}

	await logActivity(db, {
		userId: reviewer.id,
		userName: reviewer.name,
		action: action === 'approve' ? 'approve_prompt' : 'reject_prompt',
		entityType: 'prompt',
		entityId: slug,
		entityTitle: row.title,
		details: reason?.trim() || undefined,
	});

	return { ok: true, status: newStatus };
}
