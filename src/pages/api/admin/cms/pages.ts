export const prerender = false;

import type { APIRoute } from 'astro';
import { getDB } from '../../../../lib/db';
import { generateId } from '../../../../lib/crypto';
import { generateSlug, logActivity } from '../../../../lib/cms';

export const GET: APIRoute = async ({ locals }) => {
  if (!locals.user || locals.user.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const db = getDB(locals);
  const rows = await db.prepare('SELECT * FROM pages ORDER BY created_at DESC').all();

  const pages = (rows.results || []).map((row: any) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    status: row.status,
    metaTitle: row.meta_title,
    metaDescription: row.meta_description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return new Response(JSON.stringify({ success: true, pages }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user || locals.user.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const db = getDB(locals);
  const body = await request.json();
  const id = generateId();
  let slug = body.slug || generateSlug(body.title || 'untitled');

  const existingSlug = await db.prepare('SELECT id FROM pages WHERE slug = ?').bind(slug).first();
  if (existingSlug) {
    slug = `${slug}-${generateId(6).toLowerCase()}`;
  }

  const content = typeof body.content === 'string' ? body.content : JSON.stringify(body.content || {});

  await db
    .prepare(
      'INSERT INTO pages (id, slug, title, content, status, meta_title, meta_description) VALUES (?, ?, ?, ?, ?, ?, ?)',
    )
    .bind(id, slug, body.title || 'Untitled', content, body.status || 'draft', body.metaTitle || null, body.metaDescription || null)
    .run();

  await logActivity(db, {
    userId: locals.user.id,
    userName: locals.user.name,
    action: 'create_page',
    entityType: 'page',
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

  const page = await db.prepare('SELECT title FROM pages WHERE id = ?').bind(id).first<{ title: string }>();
  if (!page) {
    return new Response(JSON.stringify({ error: 'Page not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  await db.prepare('DELETE FROM pages WHERE id = ?').bind(id).run();

  await logActivity(db, {
    userId: locals.user.id,
    userName: locals.user.name,
    action: 'delete_page',
    entityType: 'page',
    entityId: id,
    entityTitle: page.title,
  });

  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
