// ---------------------------------------------------------------------------
// Data-access layer for prompts & categories — now backed by Cloudflare D1.
//
// This is the ONLY module the rest of the app imports for data. It reads the
// `DB` binding via the Workers `env` (see wrangler.jsonc d1_databases). The
// public function signatures are unchanged from the hardcoded version, so the
// pages that call them did not need to change shape — only `prerender = false`.
//
// Types still live in src/data (which doubles as the D1 seed source via
// scripts/gen-seed.ts).
// ---------------------------------------------------------------------------

import { env } from 'cloudflare:workers';
import type { Prompt } from '../data/prompts';
import type { Category } from '../data/categories';

export type { Prompt, Category };

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
	how_to_use: string | null;
	created_by: string | null;
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
		howToUse: r.how_to_use ?? undefined,
		createdBy: r.created_by ?? undefined,
	};
}

const PROMPT_COLS =
	'slug, title, description, prompt_text, category, tags, author, date, cover_image, images, featured, liked, popularity, save_count, like_count, share_count, how_to_use, created_by';

/** All prompts, newest first. */
export async function getAllPrompts(): Promise<Prompt[]> {
	const { results } = await getDB()
		.prepare(`SELECT ${PROMPT_COLS} FROM prompts ORDER BY date DESC`)
		.all<PromptRow>();
	return results.map(rowToPrompt);
}

/** A single prompt by slug, or undefined. */
export async function getPromptBySlug(slug: string): Promise<Prompt | undefined> {
	const row = await getDB()
		.prepare(`SELECT ${PROMPT_COLS} FROM prompts WHERE slug = ?`)
		.bind(slug)
		.first<PromptRow>();
	return row ? rowToPrompt(row) : undefined;
}

/** Prompts in a category, newest first. */
export async function getPromptsByCategory(categorySlug: string): Promise<Prompt[]> {
	const { results } = await getDB()
		.prepare(`SELECT ${PROMPT_COLS} FROM prompts WHERE category = ? ORDER BY date DESC`)
		.bind(categorySlug)
		.all<PromptRow>();
	return results.map(rowToPrompt);
}

/** Featured prompts. */
export async function getFeaturedPrompts(): Promise<Prompt[]> {
	const { results } = await getDB()
		.prepare(`SELECT ${PROMPT_COLS} FROM prompts WHERE featured = 1 ORDER BY date DESC`)
		.all<PromptRow>();
	return results.map(rowToPrompt);
}

/** Related prompts: same category first, then most popular, excluding self. */
export async function getRelatedPrompts(prompt: Prompt, limit = 3): Promise<Prompt[]> {
	const { results } = await getDB()
		.prepare(
			`SELECT ${PROMPT_COLS} FROM prompts
			 WHERE slug != ?
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

/** Map of category slug -> prompt count. */
export async function getCategoryCounts(): Promise<Record<string, number>> {
	const { results } = await getDB()
		.prepare('SELECT category, COUNT(*) AS n FROM prompts GROUP BY category')
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

/** Prompts ordered by all-time saves, newest as tiebreaker. */
export async function getPopularPrompts(limit = 60): Promise<Prompt[]> {
	const { results } = await getDB()
		.prepare(
			`SELECT ${PROMPT_COLS} FROM prompts ORDER BY save_count DESC, date DESC LIMIT ?`,
		)
		.bind(limit)
		.all<PromptRow>();
	return results.map(rowToPrompt);
}

/**
 * Trending = prompts with the most saves+shares in the last 7 days. Computed
 * live; if nothing has happened in a week, the list will be empty (callers
 * should fall back to the Popular list to avoid a dead tab).
 */
export async function getTrendingPrompts(limit = 60): Promise<Prompt[]> {
	const cols = PROMPT_COLS.split(', ')
		.map((c) => `p.${c}`)
		.join(', ');
	const { results } = await getDB()
		.prepare(
			`SELECT ${cols}, COUNT(e.id) AS score
			 FROM prompts p
			 LEFT JOIN prompt_events e
			   ON e.prompt_slug = p.slug
			  AND e.kind IN ('save','like','share')
			  AND e.created_at > datetime('now','-7 days')
			 GROUP BY p.slug
			 HAVING score > 0
			 ORDER BY score DESC, p.date DESC
			 LIMIT ?`,
		)
		.bind(limit)
		.all<PromptRow>();
	return results.map(rowToPrompt);
}

/** Prompts saved by a given actor, most recently saved first. */
export async function getSavedPrompts(actorId: string): Promise<Prompt[]> {
	const cols = PROMPT_COLS.split(', ')
		.map((c) => `p.${c}`)
		.join(', ');
	const { results } = await getDB()
		.prepare(
			`SELECT ${cols} FROM prompts p
			 INNER JOIN prompt_saves s ON s.prompt_slug = p.slug
			 WHERE s.actor_id = ?
			 ORDER BY s.created_at DESC`,
		)
		.bind(actorId)
		.all<PromptRow>();
	return results.map(rowToPrompt);
}
