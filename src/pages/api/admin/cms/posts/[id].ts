export const prerender = false;

import type { APIRoute } from 'astro';
import { getDB } from '../../../../../lib/db';
import { mapPostRow, calculateReadTimeAuto, logActivity } from '../../../../../lib/cms';

export const GET: APIRoute = async ({ params, locals }) => {
  if (!locals.user || locals.user.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const db = getDB(locals);
  const row = await db
    .prepare(
      `SELECT p.*, c.name as category_name, c.color as category_color
       FROM posts p LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id = ?`,
    )
    .bind(params.id)
    .first();

  if (!row) {
    return new Response(JSON.stringify({ error: 'Post not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ success: true, post: mapPostRow(row) }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const PUT: APIRoute = async ({ params, request, locals }) => {
  if (!locals.user || locals.user.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const db = getDB(locals);
  const body = await request.json();
  const id = params.id;

  const existing = await db.prepare('SELECT * FROM posts WHERE id = ?').bind(id).first();
  if (!existing) {
    return new Response(JSON.stringify({ error: 'Post not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  const content = body.content !== undefined
    ? (typeof body.content === 'string' ? body.content : JSON.stringify(body.content))
    : (existing as any).content;

  const readTime = calculateReadTimeAuto(content);

  // If publishing for the first time
  let publishedAt = (existing as any).published_at;
  if (body.status === 'published' && !publishedAt) {
    publishedAt = new Date().toISOString();
  }

  await db
    .prepare(
      `UPDATE posts SET
         title = ?, slug = ?, excerpt = ?, content = ?, category_id = ?,
         author_name = ?, author_role = ?, author_avatar = ?,
         featured = ?, status = ?, cover_image = ?, icon_fallback = ?, icon_bg = ?,
         read_time = ?, meta_title = ?, meta_description = ?,
         related_slugs = ?, faq_items = ?, published_at = ?, updated_at = datetime('now')
       WHERE id = ?`,
    )
    .bind(
      body.title ?? (existing as any).title,
      body.slug ?? (existing as any).slug,
      body.excerpt ?? (existing as any).excerpt,
      content,
      body.categoryId !== undefined ? body.categoryId : (existing as any).category_id,
      body.authorName ?? (existing as any).author_name,
      body.authorRole ?? (existing as any).author_role,
      body.authorAvatar ?? (existing as any).author_avatar,
      body.featured !== undefined ? (body.featured ? 1 : 0) : (existing as any).featured,
      body.status ?? (existing as any).status,
      body.coverImage !== undefined ? body.coverImage : (existing as any).cover_image,
      body.iconFallback !== undefined ? body.iconFallback : (existing as any).icon_fallback,
      body.iconBg !== undefined ? body.iconBg : (existing as any).icon_bg,
      readTime,
      body.metaTitle !== undefined ? body.metaTitle : (existing as any).meta_title,
      body.metaDescription !== undefined ? body.metaDescription : (existing as any).meta_description,
      body.relatedSlugs !== undefined ? JSON.stringify(body.relatedSlugs) : (existing as any).related_slugs,
      body.faqItems !== undefined ? JSON.stringify(body.faqItems) : ((existing as any).faq_items || '[]'),
      publishedAt,
      id,
    )
    .run();

  await logActivity(db, {
    userId: locals.user.id,
    userName: locals.user.name,
    action: 'update_post',
    entityType: 'post',
    entityId: id!,
    entityTitle: body.title ?? (existing as any).title,
  });

  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
