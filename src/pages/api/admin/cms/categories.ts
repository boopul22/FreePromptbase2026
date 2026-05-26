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
  const rows = await db
    .prepare(
      `SELECT c.*, (SELECT COUNT(*) FROM posts WHERE category_id = c.id AND status != 'archived') as post_count
       FROM categories c ORDER BY c.sort_order ASC, c.name ASC`,
    )
    .all();

  const categories = (rows.results || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    color: row.color,
    description: row.description,
    sortOrder: row.sort_order,
    postCount: row.post_count || 0,
    createdAt: row.created_at,
  }));

  return new Response(JSON.stringify({ success: true, categories }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user || locals.user.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const db = getDB(locals);
  const body = await request.json();
  const { name, color, description } = body;

  if (!name) {
    return new Response(JSON.stringify({ error: 'Name is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const id = generateId();
  const slug = generateSlug(name);

  const existing = await db.prepare('SELECT id FROM categories WHERE slug = ?').bind(slug).first();
  if (existing) {
    return new Response(JSON.stringify({ error: 'Category already exists' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  await db
    .prepare('INSERT INTO categories (id, name, slug, color, description) VALUES (?, ?, ?, ?, ?)')
    .bind(id, name, slug, color || 'primary', description || null)
    .run();

  await logActivity(db, {
    userId: locals.user.id,
    userName: locals.user.name,
    action: 'create_category',
    entityType: 'category',
    entityId: id,
    entityTitle: name,
  });

  return new Response(JSON.stringify({ success: true, id, slug }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const PUT: APIRoute = async ({ request, locals }) => {
  if (!locals.user || locals.user.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const db = getDB(locals);
  const body = await request.json();
  const { id, name, color, description, sortOrder } = body;

  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing category id' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const existing = await db.prepare('SELECT * FROM categories WHERE id = ?').bind(id).first();
  if (!existing) {
    return new Response(JSON.stringify({ error: 'Category not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  const newSlug = name ? generateSlug(name) : (existing as any).slug;

  await db
    .prepare(
      "UPDATE categories SET name = ?, slug = ?, color = ?, description = ?, sort_order = ?, updated_at = datetime('now') WHERE id = ?",
    )
    .bind(
      name ?? (existing as any).name,
      newSlug,
      color ?? (existing as any).color,
      description !== undefined ? description : (existing as any).description,
      sortOrder !== undefined ? sortOrder : (existing as any).sort_order,
      id,
    )
    .run();

  await logActivity(db, {
    userId: locals.user.id,
    userName: locals.user.name,
    action: 'update_category',
    entityType: 'category',
    entityId: id,
    entityTitle: name ?? (existing as any).name,
  });

  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  if (!locals.user || locals.user.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const db = getDB(locals);
  const body = await request.json();
  const { id } = body;

  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing category id' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  // Check for posts using this category
  const postCount = await db
    .prepare("SELECT COUNT(*) as count FROM posts WHERE category_id = ? AND status != 'archived'")
    .bind(id)
    .first<{ count: number }>();

  if (postCount && postCount.count > 0) {
    return new Response(
      JSON.stringify({ error: `Cannot delete: ${postCount.count} posts use this category` }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const cat = await db.prepare('SELECT name FROM categories WHERE id = ?').bind(id).first<{ name: string }>();
  await db.prepare('DELETE FROM categories WHERE id = ?').bind(id).run();

  await logActivity(db, {
    userId: locals.user.id,
    userName: locals.user.name,
    action: 'delete_category',
    entityType: 'category',
    entityId: id,
    entityTitle: cat?.name || '',
  });

  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
