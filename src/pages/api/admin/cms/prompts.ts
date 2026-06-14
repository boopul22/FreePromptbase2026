export const prerender = false;

import type { APIRoute } from 'astro';
import { getDB } from '../../../../lib/db';
import { generateSlug, logActivity, toScheduleUtc } from '../../../../lib/cms';
import { generateId } from '../../../../lib/crypto';

interface PromptRow {
  slug: string;
  title: string;
  description: string;
  prompt_text: string;
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
  status: string;
  publish_at: string | null;
  updated_at: string | null;
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
    status: r.status ?? 'approved',
    publishAt: r.publish_at ?? null,
    updatedAt: r.updated_at ?? null,
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
  const featured = url.searchParams.get('featured');
  const search = url.searchParams.get('search');
  const status = url.searchParams.get('status');

  const params: any[] = [];
  let where = 'WHERE 1=1';

  if (category && category !== 'all') {
    where += ' AND p.category = ?';
    params.push(category);
  }
  if (status === 'scheduled') {
    // Derived state: approved but not yet live.
    where += " AND p.status = 'approved' AND p.publish_at IS NOT NULL AND p.publish_at > datetime('now')";
  } else if (status && status !== 'all') {
    where += ' AND p.status = ?';
    params.push(status);
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
      `SELECT p.*,
              c.name AS category_name, c.emoji AS category_emoji,
              u.name AS creator_name, u.avatar_url AS creator_avatar, u.email AS creator_email
       FROM prompts p
       LEFT JOIN prompt_categories c ON p.category = c.slug
       LEFT JOIN users u ON p.created_by = u.id
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

  if (!body.title || !body.promptText || !body.category) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields: title, promptText, category' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Admins may create either a draft (work-in-progress) or publish directly
  // (approved). They can never mint a 'pending'/'rejected' row here — that
  // state belongs to the user-submission review flow.
  const status = body.status === 'draft' ? 'draft' : 'approved';
  if (body.status !== undefined && body.status !== 'draft' && body.status !== 'approved') {
    return new Response(
      JSON.stringify({ error: "Invalid status. Use 'draft' or 'approved'." }),
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

  // Schedule: a future publish time only makes sense for an approved prompt.
  // For drafts we still persist it so it survives until the admin schedules.
  const publishAt = toScheduleUtc(body.publishAt);
  // When scheduling, sort by the scheduled date so it lands in "Newest" on go-live.
  const effectiveDate = publishAt ? publishAt.slice(0, 10) : body.date || today;

  const images: string[] = Array.isArray(body.images) ? body.images.filter((s: any) => typeof s === 'string' && s.trim()) : [];
  // Auto-cover: if no explicit cover_image given but images were uploaded, use the first.
  const coverImage = body.coverImage || (images.length > 0 ? images[0] : null);

  // Resolve author from `createdBy` (user id from the dropdown). The dropdown
  // is the source of truth for both the byline display name and the
  // /author/<username> profile link. Fall back to free-text `author` for
  // legacy clients, then to the current admin's name.
  let createdById: string = locals.user.id;
  let authorName: string = body.author || locals.user.name;
  if (typeof body.createdBy === 'string' && body.createdBy.trim()) {
    const u = await db
      .prepare('SELECT id, name FROM users WHERE id = ?')
      .bind(body.createdBy.trim())
      .first<{ id: string; name: string }>();
    if (!u) {
      return new Response(JSON.stringify({ error: 'Selected author does not exist.' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }
    createdById = u.id;
    authorName = u.name;
  }

  await db
    .prepare(
      `INSERT INTO prompts
        (slug, title, description, prompt_text, category, tags, author, date,
         cover_image, images, featured, liked, popularity, how_to_use, created_by, status, publish_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    )
    .bind(
      slug,
      body.title,
      body.description || '',
      body.promptText,
      body.category,
      JSON.stringify(Array.isArray(body.tags) ? body.tags : []),
      authorName,
      effectiveDate,
      coverImage,
      JSON.stringify(images),
      body.featured ? 1 : 0,
      0,
      Number.isFinite(body.popularity) ? body.popularity : 0,
      body.howToUse || null,
      createdById,
      status,
      publishAt,
    )
    .run();

  await logActivity(db, {
    userId: locals.user.id,
    userName: locals.user.name,
    action: 'create_prompt',
    entityType: 'prompt',
    entityId: slug,
    entityTitle: body.title,
    details: status === 'draft' ? 'draft' : undefined,
  });

  return new Response(JSON.stringify({ success: true, slug }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
