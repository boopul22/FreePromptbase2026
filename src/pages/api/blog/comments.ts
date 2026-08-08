export const prerender = false;

import type { APIRoute } from 'astro';
import { getDB } from '../../../lib/db';
import {
	createComment,
	listVisibleComments,
	resolvePostId,
} from '../../../lib/comments';

function json(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			'Content-Type': 'application/json',
			'Cache-Control': 'no-store',
		},
	});
}

/** GET ?postId=… | ?slug=… — list visible comments for a published post. */
export const GET: APIRoute = async ({ url, locals }) => {
	const postId = url.searchParams.get('postId') || undefined;
	const slug = url.searchParams.get('slug') || undefined;
	if (!postId && !slug) return json({ error: 'postId or slug required' }, 400);

	const db = getDB(locals);
	const post = await resolvePostId(db, { postId, slug });
	if (!post) return json({ error: 'Post not found' }, 404);

	const comments = await listVisibleComments(db, post.id);
	return json({ postId: post.id, comments });
};

/** POST — create a comment or reply (login required). */
export const POST: APIRoute = async ({ request, locals }) => {
	const user = locals.user;
	if (!user) return json({ error: 'Authentication required' }, 401);

	const body = await request.json().catch(() => null);
	if (!body || typeof body !== 'object') {
		return json({ error: 'Invalid JSON body' }, 400);
	}

	const postId =
		typeof (body as { postId?: unknown }).postId === 'string'
			? (body as { postId: string }).postId.trim()
			: '';
	const slug =
		typeof (body as { slug?: unknown }).slug === 'string'
			? (body as { slug: string }).slug.trim()
			: '';
	const text =
		typeof (body as { body?: unknown }).body === 'string'
			? (body as { body: string }).body
			: '';
	const parentIdRaw = (body as { parentId?: unknown }).parentId;
	const parentId =
		typeof parentIdRaw === 'string' && parentIdRaw.trim()
			? parentIdRaw.trim()
			: null;

	if (!postId && !slug) return json({ error: 'postId or slug required' }, 400);

	const db = getDB(locals);
	const post = await resolvePostId(db, { postId: postId || undefined, slug: slug || undefined });
	if (!post) return json({ error: 'Post not found' }, 404);

	const result = await createComment(db, {
		postId: post.id,
		userId: user.id,
		body: text,
		parentId,
	});

	if ('error' in result) return json({ error: result.error }, result.status);
	return json({ comment: result.comment }, 201);
};
