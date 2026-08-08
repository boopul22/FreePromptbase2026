export const prerender = false;

import type { APIRoute } from 'astro';
import { getDB } from '../../../../lib/db';
import { getCommentById, softDeleteComment } from '../../../../lib/comments';

function json(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			'Content-Type': 'application/json',
			'Cache-Control': 'no-store',
		},
	});
}

/** DELETE — author soft-deletes own comment; admin can soft-delete any. */
export const DELETE: APIRoute = async ({ params, locals }) => {
	const user = locals.user;
	if (!user) return json({ error: 'Authentication required' }, 401);

	const id = params.id;
	if (!id) return json({ error: 'Comment id required' }, 400);

	const db = getDB(locals);
	const existing = await getCommentById(db, id);
	if (!existing || existing.status === 'deleted') {
		return json({ error: 'Comment not found' }, 404);
	}

	const isAdmin = user.role === 'admin';
	const isAuthor = existing.userId === user.id;
	if (!isAdmin && !isAuthor) {
		return json({ error: 'Forbidden' }, 403);
	}

	const updated = await softDeleteComment(db, id);
	if (!updated) return json({ error: 'Failed to delete comment' }, 500);
	return json({ ok: true, comment: updated });
};
