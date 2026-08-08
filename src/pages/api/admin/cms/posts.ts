export const prerender = false;

import type { APIRoute } from 'astro';
import { getDB } from '../../../../lib/db';
import { generateId } from '../../../../lib/crypto';
import { generateSlug, calculateReadTimeAuto, mapPostRow, logActivity } from '../../../../lib/cms';

export const GET: APIRoute = async ({ locals, url }) => {
  if (!locals.user || locals.user.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const db = getDB(locals);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;
  const status = url.searchParams.get('status');
  const categoryId = url.searchParams.get('category');
  const search = url.searchParams.get('search');

  const params: any[] = [];
  let where = 'WHERE 1=1';

  if (status === 'scheduled') {
    where +=
      " AND p.status = 'published' AND p.publish_at IS NOT NULL AND p.publish_at > datetime('now')";
  } else if (status === 'published') {
    where +=
      " AND p.status = 'published' AND (p.publish_at IS NULL OR p.publish_at <= datetime('now'))";
  } else if (status && status !== 'all') {
    where += ' AND p.status = ?';
    params.push(status);
  }
  if (categoryId) {
    where += ' AND p.category_id = ?';
    params.push(categoryId);
  }
  if (search) {
    where += ' AND (p.title LIKE ? OR p.excerpt LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  const countResult = await db
    .prepare(`SELECT COUNT(*) as count FROM posts p ${where}`)
    .bind(...params)
    .first<{ count: number }>();
  const total = countResult?.count || 0;

  const countsRow = await db
    .prepare(
      `SELECT
         COUNT(*) AS all_n,
         SUM(CASE WHEN status = 'published' AND (publish_at IS NULL OR publish_at <= datetime('now')) THEN 1 ELSE 0 END) AS published_n,
         SUM(CASE WHEN status = 'published' AND publish_at IS NOT NULL AND publish_at > datetime('now') THEN 1 ELSE 0 END) AS scheduled_n,
         SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS draft_n,
         SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END) AS archived_n
       FROM posts`,
    )
    .first<{
      all_n: number;
      published_n: number;
      scheduled_n: number;
      draft_n: number;
      archived_n: number;
    }>();

  const rows = await db
    .prepare(
      `SELECT p.*, c.name as category_name, c.color as category_color
       FROM posts p LEFT JOIN categories c ON p.category_id = c.id
       ${where} ORDER BY
         CASE WHEN p.publish_at IS NOT NULL AND p.publish_at > datetime('now') THEN 0 ELSE 1 END,
         p.publish_at ASC,
         p.updated_at DESC
       LIMIT ? OFFSET ?`,
    )
    .bind(...params, limit, offset)
    .all();

  return new Response(
    JSON.stringify({
      success: true,
      posts: (rows.results || []).map(mapPostRow),
      total,
      page,
      totalPages: Math.ceil(total / limit),
      counts: {
        all: countsRow?.all_n ?? 0,
        published: countsRow?.published_n ?? 0,
        scheduled: countsRow?.scheduled_n ?? 0,
        draft: countsRow?.draft_n ?? 0,
        archived: countsRow?.archived_n ?? 0,
      },
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
};

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user || locals.user.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const db = getDB(locals);
  const body = await request.json();
  const id = generateId();
  let slug = body.slug || generateSlug(body.title || 'untitled');

  // Ensure unique slug
  const existingSlug = await db.prepare('SELECT id FROM posts WHERE slug = ?').bind(slug).first();
  if (existingSlug) {
    slug = `${slug}-${generateId(6).toLowerCase()}`;
  }

  const content = typeof body.content === 'string' ? body.content : JSON.stringify(body.content || { intro: '', sections: [], outro: '' });
  const readTime = calculateReadTimeAuto(content);
  const status = body.status || 'draft';
  const contentType = body.contentType === 'news' ? 'news' : 'guide';
  const sourceUrl = typeof body.sourceUrl === 'string' ? body.sourceUrl.trim() : '';
  if (contentType === 'news' && !/^https?:\/\/\S+$/i.test(sourceUrl)) {
    return new Response(JSON.stringify({ error: 'News reports need a valid primary-source URL.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const publishedAt = status === 'published' ? new Date().toISOString() : null;

  await db
    .prepare(
      `INSERT INTO posts (id, slug, title, excerpt, content, category_id, author_name, author_role, author_avatar, featured, status, content_type, source_url, cover_image, icon_fallback, icon_bg, read_time, meta_title, meta_description, related_slugs, faq_items, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id, slug,
      body.title || 'Untitled',
      body.excerpt || '',
      content,
      body.categoryId || null,
      body.authorName || locals.user.name,
      body.authorRole || '',
      body.authorAvatar || locals.user.avatarUrl || '',
      body.featured ? 1 : 0,
      status,
      contentType,
      sourceUrl || null,
      body.coverImage || null,
      body.iconFallback || null,
      body.iconBg || null,
      readTime,
      body.metaTitle || null,
      body.metaDescription || null,
      JSON.stringify(body.relatedSlugs || []),
      JSON.stringify(body.faqItems || []),
      publishedAt,
    )
    .run();

  await logActivity(db, {
    userId: locals.user.id,
    userName: locals.user.name,
    action: 'create_post',
    entityType: 'post',
    entityId: id,
    entityTitle: body.title || 'Untitled',
  });

  return new Response(JSON.stringify({ success: true, id, slug }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  if (!locals.user || locals.user.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const db = getDB(locals);
  const body = await request.json();
  const { id } = body;

  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing post id' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const post = await db.prepare('SELECT title FROM posts WHERE id = ?').bind(id).first<{ title: string }>();
  if (!post) {
    return new Response(JSON.stringify({ error: 'Post not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  // Remove translated copies first (tolerate a missing post_translations table).
  try { await db.prepare('DELETE FROM post_translations WHERE post_id = ?').bind(id).run(); } catch {}
  await db.prepare('DELETE FROM posts WHERE id = ?').bind(id).run();

  await logActivity(db, {
    userId: locals.user.id,
    userName: locals.user.name,
    action: 'delete_post',
    entityType: 'post',
    entityId: id,
    entityTitle: post.title,
  });

  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
