export const prerender = false;

import type { APIRoute } from 'astro';
import { getDB } from '../../../../lib/db';
import { logActivity } from '../../../../lib/cms';
import {
	listAdminComments,
	setCommentStatus,
	type CommentStatus,
} from '../../../../lib/comments';

function json(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			'Content-Type': 'application/json',
			'Cache-Control': 'no-store',
		},
	});
}

function forbid() {
	return json({ error: 'Forbidden' }, 403);
}

/** GET ?status=visible|hidden|deleted|all&limit=&offset= */
export const GET: APIRoute = async ({ url, locals }) => {
	if (!locals.user || locals.user.role !== 'admin') return forbid();

	const statusParam = url.searchParams.get('status') || 'all';
	const allowed = new Set(['visible', 'hidden', 'deleted', 'all']);
	if (!allowed.has(statusParam)) {
		return json({ error: 'Invalid status filter' }, 400);
	}

	const limit = Number(url.searchParams.get('limit') || '50');
	const offset = Number(url.searchParams.get('offset') || '0');

	const db = getDB(locals);
	const comments = await listAdminComments(db, {
		status: statusParam as CommentStatus | 'all',
		limit: Number.isFinite(limit) ? limit : 50,
		offset: Number.isFinite(offset) ? offset : 0,
	});
	return json({ comments });
};

/**
 * PATCH — moderate a comment.
 * Body: { id: string, status: 'visible' | 'hidden' | 'deleted' }
 */
export const PATCH: APIRoute = async ({ request, locals }) => {
	if (!locals.user || locals.user.role !== 'admin') return forbid();

	const body = await request.json().catch(() => null);
	if (!body || typeof body !== 'object') {
		return json({ error: 'Invalid JSON body' }, 400);
	}

	const id =
		typeof (body as { id?: unknown }).id === 'string'
			? (body as { id: string }).id.trim()
			: '';
	const status = (body as { status?: unknown }).status;
	if (!id) return json({ error: 'id required' }, 400);
	if (status !== 'visible' && status !== 'hidden' && status !== 'deleted') {
		return json({ error: 'status must be visible, hidden, or deleted' }, 400);
	}

	const db = getDB(locals);
	const updated = await setCommentStatus(db, id, status);
	if (!updated) return json({ error: 'Comment not found' }, 404);

	await logActivity(db, {
		userId: locals.user.id,
		userName: locals.user.name,
		action:
			status === 'hidden'
				? 'hide_comment'
				: status === 'deleted'
					? 'delete_comment'
					: 'restore_comment',
		entityType: 'comment',
		entityId: updated.id,
		entityTitle: updated.body.slice(0, 80),
		details: `status=${status}`,
	});

	return json({ comment: updated });
};
