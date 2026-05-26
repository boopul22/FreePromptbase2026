export const prerender = false;

import type { APIRoute } from 'astro';
import { getDB } from '../../../../../lib/db';
import { generateSlug, logActivity } from '../../../../../lib/cms';

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
  images: string | null;
  featured: number;
  liked: number;
  popularity: number;
  how_to_use: string | null;
  created_by: string | null;
  created_at: string;
  category_name?: string | null;
  category_emoji?: string | null;
  creator_name?: string | null;
  creator_avatar?: string | null;
  creator_email?: string | null;
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
    images: safeJsonArray(r.images),
    author: r.author,
    date: r.date,
    coverImage: r.cover_image ?? null,
    featured: !!r.featured,
    liked: !!r.liked,
    popularity: r.popularity,
    howToUse: r.how_to_use ?? null,
    createdBy: r.created_by ?? null,
    createdByName: r.creator_name ?? null,
    createdByAvatar: r.creator_avatar ?? null,
    createdByEmail: r.creator_email ?? null,
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

function forbid() {
  return new Response(JSON.stringify({ error: 'Forbidden' }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const GET: APIRoute = async ({ params, locals }) => {
  if (!locals.user || locals.user.role !== 'admin') return forbid();
  const db = getDB(locals);
  const slug = params.slug!;

  const row = await db
    .prepare(
      `SELECT p.*,
              c.name AS category_name, c.emoji AS category_emoji,
              u.name AS creator_name, u.avatar_url AS creator_avatar, u.email AS creator_email
       FROM prompts p
       LEFT JOIN prompt_categories c ON p.category = c.slug
       LEFT JOIN users u ON p.created_by = u.id
       WHERE p.slug = ?`,
    )
    .bind(slug)
    .first<PromptRow>();

  if (!row) {
    return new Response(JSON.stringify({ error: 'Prompt not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ success: true, prompt: mapRow(row) }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const PUT: APIRoute = async ({ params, request, locals }) => {
  if (!locals.user || locals.user.role !== 'admin') return forbid();
  const db = getDB(locals);
  const currentSlug = params.slug!;
  const body = await request.json();

  const existing = await db
    .prepare('SELECT * FROM prompts WHERE slug = ?')
    .bind(currentSlug)
    .first<PromptRow>();
  if (!existing) {
    return new Response(JSON.stringify({ error: 'Prompt not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Resolve new slug (if changed). Reject collisions.
  let newSlug = currentSlug;
  if (body.slug && generateSlug(body.slug) !== currentSlug) {
    newSlug = generateSlug(body.slug);
    const clash = await db.prepare('SELECT slug FROM prompts WHERE slug = ?').bind(newSlug).first();
    if (clash) {
      return new Response(
        JSON.stringify({ error: `Slug already in use: ${newSlug}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }
  }

  // Resolve images (new value, or keep existing). Auto-set cover_image to
  // images[0] if cover_image is being cleared/empty but we have images.
  const incomingImages = Array.isArray(body.images)
    ? body.images.filter((s: any) => typeof s === 'string' && s.trim())
    : null;
  const finalImages = incomingImages ?? safeJsonArray(existing.images);

  let finalCover: string | null;
  if (body.coverImage !== undefined) {
    finalCover = body.coverImage || (finalImages.length > 0 ? finalImages[0] : null);
  } else {
    finalCover = existing.cover_image;
  }

  await db
    .prepare(
      `UPDATE prompts SET
        slug = ?, title = ?, description = ?, prompt_text = ?, model = ?, category = ?,
        tags = ?, author = ?, date = ?, cover_image = ?, images = ?,
        featured = ?, popularity = ?, how_to_use = ?
       WHERE slug = ?`,
    )
    .bind(
      newSlug,
      body.title ?? existing.title,
      body.description ?? existing.description,
      body.promptText ?? existing.prompt_text,
      body.model ?? existing.model,
      body.category ?? existing.category,
      JSON.stringify(Array.isArray(body.tags) ? body.tags : safeJsonArray(existing.tags)),
      body.author ?? existing.author,
      body.date ?? existing.date,
      finalCover,
      JSON.stringify(finalImages),
      body.featured !== undefined ? (body.featured ? 1 : 0) : existing.featured,
      Number.isFinite(body.popularity) ? body.popularity : existing.popularity,
      body.howToUse !== undefined ? body.howToUse || null : existing.how_to_use,
      currentSlug,
    )
    .run();

  await logActivity(db, {
    userId: locals.user.id,
    userName: locals.user.name,
    action: 'update_prompt',
    entityType: 'prompt',
    entityId: newSlug,
    entityTitle: body.title ?? existing.title,
  });

  return new Response(JSON.stringify({ success: true, slug: newSlug }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  if (!locals.user || locals.user.role !== 'admin') return forbid();
  const db = getDB(locals);
  const slug = params.slug!;

  const existing = await db
    .prepare('SELECT title FROM prompts WHERE slug = ?')
    .bind(slug)
    .first<{ title: string }>();
  if (!existing) {
    return new Response(JSON.stringify({ error: 'Prompt not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  await db.prepare('DELETE FROM prompts WHERE slug = ?').bind(slug).run();

  await logActivity(db, {
    userId: locals.user.id,
    userName: locals.user.name,
    action: 'delete_prompt',
    entityType: 'prompt',
    entityId: slug,
    entityTitle: existing.title,
  });

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
