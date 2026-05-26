export const prerender = false;

import type { APIRoute } from 'astro';
import { getDB } from '../../../../../lib/db';
import { logActivity } from '../../../../../lib/cms';

export const GET: APIRoute = async ({ params, locals }) => {
  if (!locals.user || locals.user.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const db = getDB(locals);
  const row = await db.prepare('SELECT * FROM pages WHERE id = ?').bind(params.id).first();

  if (!row) {
    return new Response(JSON.stringify({ error: 'Page not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  const page = {
    id: (row as any).id,
    slug: (row as any).slug,
    title: (row as any).title,
    content: (row as any).content,
    status: (row as any).status,
    metaTitle: (row as any).meta_title,
    metaDescription: (row as any).meta_description,
    createdAt: (row as any).created_at,
    updatedAt: (row as any).updated_at,
  };

  return new Response(JSON.stringify({ success: true, page }), {
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

  const existing = await db.prepare('SELECT * FROM pages WHERE id = ?').bind(id).first();
  if (!existing) {
    return new Response(JSON.stringify({ error: 'Page not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  const content = body.content !== undefined
    ? (typeof body.content === 'string' ? body.content : JSON.stringify(body.content))
    : (existing as any).content;

  await db
    .prepare(
      "UPDATE pages SET title = ?, slug = ?, content = ?, status = ?, meta_title = ?, meta_description = ?, updated_at = datetime('now') WHERE id = ?",
    )
    .bind(
      body.title ?? (existing as any).title,
      body.slug ?? (existing as any).slug,
      content,
      body.status ?? (existing as any).status,
      body.metaTitle !== undefined ? body.metaTitle : (existing as any).meta_title,
      body.metaDescription !== undefined ? body.metaDescription : (existing as any).meta_description,
      id,
    )
    .run();

  await logActivity(db, {
    userId: locals.user.id,
    userName: locals.user.name,
    action: 'update_page',
    entityType: 'page',
    entityId: id!,
    entityTitle: body.title ?? (existing as any).title,
  });

  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
