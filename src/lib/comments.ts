import { generateId } from './crypto';

export type CommentStatus = 'visible' | 'hidden' | 'deleted';

export const MAX_COMMENT_LENGTH = 2000;
export const MIN_COMMENT_LENGTH = 2;
/** Burst limit — stops rapid-fire spam. */
export const RATE_LIMIT_PER_MINUTE = 3;
/** Sustained limit. */
export const RATE_LIMIT_PER_HOUR = 10;
/** Daily ceiling per account. */
export const RATE_LIMIT_PER_DAY = 30;
/** Reject identical body within this window. */
export const DUPLICATE_WINDOW_SECONDS = 3600;

export interface CommentAuthor {
	id: string;
	name: string;
	avatarUrl: string;
	username: string;
}

export interface Comment {
	id: string;
	postId: string;
	userId: string;
	parentId: string | null;
	body: string;
	status: CommentStatus;
	createdAt: string;
	updatedAt: string;
	author: CommentAuthor;
	replies: Comment[];
}

export interface AdminComment extends Omit<Comment, 'replies'> {
	postTitle: string;
	postSlug: string;
	postContentType: string;
}

interface CommentRow {
	id: string;
	post_id: string;
	user_id: string;
	parent_id: string | null;
	body: string;
	status: string;
	created_at: string;
	updated_at: string;
	author_name: string | null;
	author_avatar: string | null;
	author_username: string | null;
}

interface AdminCommentRow extends CommentRow {
	post_title: string;
	post_slug: string;
	post_content_type: string;
}

function mapAuthor(row: CommentRow): CommentAuthor {
	return {
		id: row.user_id,
		name: row.author_name?.trim() || 'User',
		avatarUrl: row.author_avatar || '',
		username: row.author_username || '',
	};
}

function mapComment(row: CommentRow): Comment {
	return {
		id: row.id,
		postId: row.post_id,
		userId: row.user_id,
		parentId: row.parent_id,
		body: row.body,
		status: row.status as CommentStatus,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		author: mapAuthor(row),
		replies: [],
	};
}

/** Strip HTML tags and normalize whitespace for plain-text storage. */
export function sanitizeCommentBody(raw: string): string {
	return String(raw || '')
		.replace(/<[^>]*>/g, '')
		.replace(/\r\n/g, '\n')
		.replace(/[^\S\n]+/g, ' ')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}

/**
 * Detect URLs / link spam — including http(s), www, bare domains, and
 * common obfuscations (hxxp, [dot], spaced www, etc.).
 */
export function containsBlockedLink(text: string): boolean {
	const t = text.toLowerCase();

	// Protocol / scheme forms (including obfuscated hxxp)
	if (/(?:https?|hxxps?|ftp):\/\//i.test(t)) return true;
	if (/\bh\s*t\s*t\s*p\s*s?\s*:\s*\/\s*\//i.test(t)) return true;
	if (/\bwww\s*\.\s*[a-z0-9-]/i.test(t)) return true;

	// Markdown links: [label](url)
	if (/\[[^\]]{0,120}\]\(\s*[^)\s]+/i.test(text)) return true;

	// Obfuscated domains: example[.]com / example (dot) com
	if (
		/\b[a-z0-9-]+(?:\s*[\[\(\{]?\s*(?:dot|\.)\s*[\]\)\}]?\s*)+(?:com|net|org|io|co|ai|app|dev|info|biz|xyz|me|cc|tv|uk|in|us|ca|de|fr|ru|cn|jp|br|au|online|site|store|shop|link|click|top|live|blog|page|web|cloud)\b/i.test(
			t,
		)
	) {
		return true;
	}

	// Bare domains ending in an alphabetic TLD (avoids v1.2.3 false positives)
	const bare = t.match(
		/(?:^|[\s([{"'])([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z]{2,24})\b/i,
	);
	if (bare?.[1]) {
		const host = bare[1];
		if (!/^(?:e\.g|i\.e|a\.m|p\.m|u\.s|u\.k)\.?$/i.test(host)) {
			return true;
		}
	}

	return false;
}

/** Repeated-character / keyboard-smash spam. */
export function looksLikeSpamText(text: string): boolean {
	if (/(.)\1{9,}/.test(text)) return true; // aaaaaaaaaaa
	const letters = text.replace(/[^a-zA-Z]/g, '');
	if (letters.length >= 20) {
		const unique = new Set(letters.toLowerCase()).size;
		if (unique <= 3) return true; // mostly same few letters
	}
	return false;
}

export function validateCommentBody(body: string): string | null {
	if (!body) return 'Comment cannot be empty.';
	if (body.length < MIN_COMMENT_LENGTH) {
		return `Comment must be at least ${MIN_COMMENT_LENGTH} characters.`;
	}
	if (body.length > MAX_COMMENT_LENGTH) {
		return `Comment must be ${MAX_COMMENT_LENGTH} characters or fewer.`;
	}
	if (containsBlockedLink(body)) {
		return 'Links are not allowed in comments.';
	}
	if (looksLikeSpamText(body)) {
		return 'That comment looks like spam. Please rewrite it.';
	}
	return null;
}

const COMMENT_SELECT = `
	c.id, c.post_id, c.user_id, c.parent_id, c.body, c.status, c.created_at, c.updated_at,
	u.name AS author_name, u.avatar_url AS author_avatar, u.username AS author_username
`;

/** Visible top-level comments with nested one-level replies (oldest first). */
export async function listVisibleComments(
	db: D1Database,
	postId: string,
): Promise<Comment[]> {
	const { results } = await db
		.prepare(
			`SELECT ${COMMENT_SELECT}
			 FROM post_comments c
			 LEFT JOIN users u ON u.id = c.user_id
			 WHERE c.post_id = ? AND c.status = 'visible'
			 ORDER BY c.created_at ASC`,
		)
		.bind(postId)
		.all<CommentRow>();

	const rows = results || [];
	const roots: Comment[] = [];
	const byId = new Map<string, Comment>();

	for (const row of rows) {
		if (row.parent_id) continue;
		const comment = mapComment(row);
		byId.set(comment.id, comment);
		roots.push(comment);
	}

	for (const row of rows) {
		if (!row.parent_id) continue;
		const parent = byId.get(row.parent_id);
		if (!parent) continue; // orphaned / nested deeper than one level — skip
		parent.replies.push(mapComment(row));
	}

	return roots;
}

export async function countVisibleComments(
	db: D1Database,
	postId: string,
): Promise<number> {
	const row = await db
		.prepare(
			`SELECT COUNT(*) AS n FROM post_comments c
			 WHERE c.post_id = ?
			   AND c.status = 'visible'
			   AND (
			     c.parent_id IS NULL
			     OR EXISTS (
			       SELECT 1 FROM post_comments p
			       WHERE p.id = c.parent_id AND p.status = 'visible'
			     )
			   )`,
		)
		.bind(postId)
		.first<{ n: number }>();
	return row?.n ?? 0;
}

export async function getCommentById(
	db: D1Database,
	id: string,
): Promise<Comment | null> {
	const row = await db
		.prepare(
			`SELECT ${COMMENT_SELECT}
			 FROM post_comments c
			 LEFT JOIN users u ON u.id = c.user_id
			 WHERE c.id = ?`,
		)
		.bind(id)
		.first<CommentRow>();
	return row ? mapComment(row) : null;
}

export async function resolvePostId(
	db: D1Database,
	opts: { postId?: string; slug?: string },
): Promise<{ id: string; title: string; slug: string } | null> {
	if (opts.postId) {
		const row = await db
			.prepare(
				`SELECT id, title, slug FROM posts
				 WHERE id = ? AND status = 'published'
				   AND (publish_at IS NULL OR publish_at <= datetime('now'))`,
			)
			.bind(opts.postId)
			.first<{ id: string; title: string; slug: string }>();
		return row ?? null;
	}
	if (opts.slug) {
		const row = await db
			.prepare(
				`SELECT id, title, slug FROM posts
				 WHERE slug = ? AND status = 'published'
				   AND (publish_at IS NULL OR publish_at <= datetime('now'))`,
			)
			.bind(opts.slug)
			.first<{ id: string; title: string; slug: string }>();
		return row ?? null;
	}
	return null;
}

export async function countRecentCommentsByUser(
	db: D1Database,
	userId: string,
	withinSeconds = 60,
): Promise<number> {
	const row = await db
		.prepare(
			`SELECT COUNT(*) AS n FROM post_comments
			 WHERE user_id = ?
			   AND created_at >= datetime('now', ?)
			   AND status != 'deleted'`,
		)
		.bind(userId, `-${withinSeconds} seconds`)
		.first<{ n: number }>();
	return row?.n ?? 0;
}

async function hasDuplicateRecentBody(
	db: D1Database,
	userId: string,
	body: string,
): Promise<boolean> {
	const row = await db
		.prepare(
			`SELECT id FROM post_comments
			 WHERE user_id = ?
			   AND body = ?
			   AND created_at >= datetime('now', ?)
			   AND status != 'deleted'
			 LIMIT 1`,
		)
		.bind(userId, body, `-${DUPLICATE_WINDOW_SECONDS} seconds`)
		.first<{ id: string }>();
	return !!row;
}

async function checkRateLimits(
	db: D1Database,
	userId: string,
): Promise<{ error: string; status: number } | null> {
	const [perMin, perHour, perDay] = await Promise.all([
		countRecentCommentsByUser(db, userId, 60),
		countRecentCommentsByUser(db, userId, 3600),
		countRecentCommentsByUser(db, userId, 86_400),
	]);

	if (perMin >= RATE_LIMIT_PER_MINUTE) {
		return {
			error: 'Too many comments too quickly. Please wait a minute.',
			status: 429,
		};
	}
	if (perHour >= RATE_LIMIT_PER_HOUR) {
		return {
			error: 'Hourly comment limit reached. Try again later.',
			status: 429,
		};
	}
	if (perDay >= RATE_LIMIT_PER_DAY) {
		return {
			error: 'Daily comment limit reached. Try again tomorrow.',
			status: 429,
		};
	}
	return null;
}

export async function createComment(
	db: D1Database,
	params: {
		postId: string;
		userId: string;
		body: string;
		parentId?: string | null;
	},
): Promise<{ comment: Comment } | { error: string; status: number }> {
	const body = sanitizeCommentBody(params.body);
	const bodyError = validateCommentBody(body);
	if (bodyError) return { error: bodyError, status: 400 };

	const rateError = await checkRateLimits(db, params.userId);
	if (rateError) return rateError;

	if (await hasDuplicateRecentBody(db, params.userId, body)) {
		return {
			error: 'You already posted that comment recently.',
			status: 429,
		};
	}

	let parentId: string | null = params.parentId || null;
	if (parentId) {
		const parent = await db
			.prepare(
				`SELECT id, post_id, parent_id, status FROM post_comments WHERE id = ?`,
			)
			.bind(parentId)
			.first<{
				id: string;
				post_id: string;
				parent_id: string | null;
				status: string;
			}>();

		if (!parent || parent.status === 'deleted') {
			return { error: 'Parent comment not found.', status: 404 };
		}
		if (parent.post_id !== params.postId) {
			return { error: 'Reply must belong to the same article.', status: 400 };
		}
		// One-level replies only — cannot reply to a reply.
		if (parent.parent_id) {
			return { error: 'Replies to replies are not allowed.', status: 400 };
		}
		if (parent.status !== 'visible') {
			return { error: 'Cannot reply to a hidden comment.', status: 400 };
		}
	}

	const id = generateId();
	await db
		.prepare(
			`INSERT INTO post_comments (id, post_id, user_id, parent_id, body, status)
			 VALUES (?, ?, ?, ?, ?, 'visible')`,
		)
		.bind(id, params.postId, params.userId, parentId, body)
		.run();

	const comment = await getCommentById(db, id);
	if (!comment) return { error: 'Failed to create comment.', status: 500 };
	return { comment };
}

export async function setCommentStatus(
	db: D1Database,
	id: string,
	status: CommentStatus,
): Promise<Comment | null> {
	const existing = await db
		.prepare(`SELECT id, parent_id FROM post_comments WHERE id = ?`)
		.bind(id)
		.first<{ id: string; parent_id: string | null }>();
	if (!existing) return null;

	// Cascade hide/delete to direct replies when moderating a top-level comment.
	if (!existing.parent_id && (status === 'hidden' || status === 'deleted')) {
		await db.batch([
			db
				.prepare(
					`UPDATE post_comments
					 SET status = ?, updated_at = datetime('now')
					 WHERE id = ?`,
				)
				.bind(status, id),
			db
				.prepare(
					`UPDATE post_comments
					 SET status = ?, updated_at = datetime('now')
					 WHERE parent_id = ? AND status = 'visible'`,
				)
				.bind(status, id),
		]);
	} else {
		const result = await db
			.prepare(
				`UPDATE post_comments
				 SET status = ?, updated_at = datetime('now')
				 WHERE id = ?`,
			)
			.bind(status, id)
			.run();
		if (!result.meta.changes) return null;
	}

	return getCommentById(db, id);
}

/** Soft-delete: marks status deleted (body retained for audit). */
export async function softDeleteComment(
	db: D1Database,
	id: string,
): Promise<Comment | null> {
	return setCommentStatus(db, id, 'deleted');
}

export async function listAdminComments(
	db: D1Database,
	opts: { status?: CommentStatus | 'all'; limit?: number; offset?: number } = {},
): Promise<AdminComment[]> {
	const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
	const offset = Math.max(opts.offset ?? 0, 0);
	const status = opts.status ?? 'all';

	const statusClause =
		status === 'all' ? `c.status != 'deleted'` : `c.status = ?`;
	const binds: (string | number)[] = [];
	if (status !== 'all') binds.push(status);
	binds.push(limit, offset);

	const { results } = await db
		.prepare(
			`SELECT ${COMMENT_SELECT},
			        p.title AS post_title, p.slug AS post_slug, p.content_type AS post_content_type
			 FROM post_comments c
			 LEFT JOIN users u ON u.id = c.user_id
			 LEFT JOIN posts p ON p.id = c.post_id
			 WHERE ${statusClause}
			 ORDER BY c.created_at DESC
			 LIMIT ? OFFSET ?`,
		)
		.bind(...binds)
		.all<AdminCommentRow>();

	return (results || []).map((row) => ({
		...mapComment(row),
		postTitle: row.post_title || '(deleted post)',
		postSlug: row.post_slug || '',
		postContentType: row.post_content_type || 'guide',
	}));
}
