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

  const post = await db.prepare('SELECT title, published_at FROM posts WHERE id = ?').bind(id).first<{ title: string; published_at: string | null }>();
  if (!post) {
    return new Response(JSON.stringify({ error: 'Post not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  const publishedAt = post.published_at || new Date().toISOString();
  await db
    .prepare("UPDATE posts SET status = 'published', published_at = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(publishedAt, id)
    .run();

  await logActivity(db, {
    userId: locals.user.id,
    userName: locals.user.name,
    action: 'publish_post',
    entityType: 'post',
    entityId: id!,
    entityTitle: post.title,
  });

  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
