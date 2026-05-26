export const prerender = false;

import type { APIRoute } from 'astro';
import { getDB } from '../../../../lib/db';
import { generateSlug, logActivity } from '../../../../lib/cms';
import { generateId } from '../../../../lib/crypto';

interface PromptRow {
  slug: string;
  title: string;
  description: string;
  prompt_text: string;
  model: string;
  category: string;
  tags: string;
  author: string;
  date: string;
  cover_image: string | null;
  featured: number;
  liked: number;
  popularity: number;
  how_to_use: string | null;
  created_at: string;
  category_name?: string | null;
  category_emoji?: string | null;
}

function mapRow(r: PromptRow) {
  return {
    slug: r.slug,
    title: r.title,
    description: r.description,
    promptText: r.prompt_text,
    model: r.model,
    category: r.category,
    categoryName: r.category_name ?? null,
    categoryEmoji: r.category_emoji ?? null,
    tags: safeJsonArray(r.tags),
    author: r.author,
    date: r.date,
    coverImage: r.cover_image ?? null,
    featured: !!r.featured,
    liked: !!r.liked,
    popularity: r.popularity,
    howToUse: r.how_to_use ?? null,
    createdAt: r.created_at,
  };
}

function safeJsonArray(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export const GET: APIRoute = async ({ locals, url }) => {
  if (!locals.user || locals.user.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const db = getDB(locals);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;
  const category = url.searchParams.get('category');
  const model = url.searchParams.get('model');
  const featured = url.searchParams.get('featured');
  const search = url.searchParams.get('search');

  const params: any[] = [];
  let where = 'WHERE 1=1';

  if (category && category !== 'all') {
    where += ' AND p.category = ?';
    params.push(category);
  }
  if (model && model !== 'all') {
    where += ' AND p.model = ?';
    params.push(model);
  }
  if (featured === '1') {
    where += ' AND p.featured = 1';
  }
  if (search) {
    where += ' AND (p.title LIKE ? OR p.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  const countResult = await db
    .prepare(`SELECT COUNT(*) as count FROM prompts p ${where}`)
    .bind(...params)
    .first<{ count: number }>();
  const total = countResult?.count || 0;

  const rows = await db
    .prepare(
      `SELECT p.*, c.name AS category_name, c.emoji AS category_emoji
       FROM prompts p LEFT JOIN prompt_categories c ON p.category = c.slug
       ${where} ORDER BY p.date DESC, p.created_at DESC LIMIT ? OFFSET ?`,
    )
    .bind(...params, limit, offset)
    .all<PromptRow>();

  return new Response(
    JSON.stringify({
      success: true,
      prompts: (rows.results || []).map(mapRow),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
};

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user || locals.user.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const db = getDB(locals);
  const body = await request.json();

  if (!body.title || !body.promptText || !body.model || !body.category) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields: title, promptText, model, category' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  let slug = body.slug ? generateSlug(body.slug) : generateSlug(body.title);
  if (!slug) slug = 'prompt-' + generateId(8).toLowerCase();

  // Ensure unique slug
  const existing = await db.prepare('SELECT slug FROM prompts WHERE slug = ?').bind(slug).first();
  if (existing) {
    slug = `${slug}-${generateId(6).toLowerCase()}`;
  }

  const today = new Date().toISOString().slice(0, 10);

  await db
    .prepare(
      `INSERT INTO prompts
        (slug, title, description, prompt_text, model, category, tags, author, date,
         cover_image, featured, liked, popularity, how_to_use)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      slug,
      body.title,
      body.description || '',
      body.promptText,
      body.model,
      body.category,
      JSON.stringify(Array.isArray(body.tags) ? body.tags : []),
      body.author || locals.user.name,
      body.date || today,
      body.coverImage || null,
      body.featured ? 1 : 0,
      0,
      Number.isFinite(body.popularity) ? body.popularity : 0,
      body.howToUse || null,
    )
    .run();

  await logActivity(db, {
    userId: locals.user.id,
    userName: locals.user.name,
    action: 'create_prompt',
    entityType: 'prompt',
    entityId: slug,
    entityTitle: body.title,
  });

  return new Response(JSON.stringify({ success: true, slug }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
