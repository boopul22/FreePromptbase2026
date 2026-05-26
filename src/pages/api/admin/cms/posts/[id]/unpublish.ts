export const prerender = false;

import type { APIRoute } from 'astro';
import { getDB } from '../../../../../../lib/db';
import { logActivity } from '../../../../../../lib/cms';

export const POST: APIRoute = async ({ params, locals }) => {
  if (!locals.user || locals.user.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const db = getDB(locals);
  const id = params.id;

  const post = await db.prepare('SELECT title FROM posts WHERE id = ?').bind(id).first<{ title: string }>();
  if (!post) {
    return new Response(JSON.stringify({ error: 'Post not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  await db
    .prepare("UPDATE posts SET status = 'draft', updated_at = datetime('now') WHERE id = ?")
    .bind(id)
    .run();

  await logActivity(db, {
    userId: locals.user.id,
    userName: locals.user.name,
    action: 'unpublish_post',
    entityType: 'post',
    entityId: id!,
    entityTitle: post.title,
  });

  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
