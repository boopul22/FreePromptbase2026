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
  cover_w: number | null;
  cover_h: number | null;
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
    coverW: r.cover_w ?? null,
    coverH: r.cover_h ?? null,
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

  // Base filters (everything except the status tab). Reused to scope the
  // per-status tab counts so they reflect the active category/search/featured.
  const baseParams: any[] = [];
  let baseWhere = 'WHERE 1=1';
  if (category && category !== 'all') {
    baseWhere += ' AND p.category = ?';
    baseParams.push(category);
  }
  if (featured === '1') {
    baseWhere += ' AND p.featured = 1';
  }
  if (search) {
    baseWhere += ' AND (p.title LIKE ? OR p.description LIKE ?)';
    baseParams.push(`%${search}%`, `%${search}%`);
  }

  // Status tab → SQL. "Published" means LIVE NOW (approved AND no future
  // schedule); "Scheduled" is the derived approved-but-future state. They are
  // mutually exclusive, so Published + Scheduled + Drafts add up to the total —
  // no more "40 published but only 32 live" ambiguity.
  let statusClause = '';
  const statusParams: any[] = [];
  if (status === 'scheduled') {
    statusClause = " AND p.status = 'approved' AND p.publish_at IS NOT NULL AND p.publish_at > datetime('now')";
  } else if (status === 'approved') {
    statusClause = " AND p.status = 'approved' AND (p.publish_at IS NULL OR p.publish_at <= datetime('now'))";
  } else if (status && status !== 'all') {
    statusClause = ' AND p.status = ?';
    statusParams.push(status);
  }

  const where = baseWhere + statusClause;
  const params = [...baseParams, ...statusParams];

  const countResult = await db
    .prepare(`SELECT COUNT(*) as count FROM prompts p ${where}`)
    .bind(...params)
    .first<{ count: number }>();
  const total = countResult?.count || 0;

  // Per-status tab counts (scoped to the base filters, ignoring the status tab
  // itself) so each tab shows how many rows it holds at a glance.
  const countsRow = await db
    .prepare(
      `SELECT
         COUNT(*) AS all_n,
         SUM(CASE WHEN p.status = 'approved' AND (p.publish_at IS NULL OR p.publish_at <= datetime('now')) THEN 1 ELSE 0 END) AS published_n,
         SUM(CASE WHEN p.status = 'approved' AND p.publish_at IS NOT NULL AND p.publish_at > datetime('now') THEN 1 ELSE 0 END) AS scheduled_n,
         SUM(CASE WHEN p.status = 'draft' THEN 1 ELSE 0 END) AS draft_n
       FROM prompts p ${baseWhere}`,
    )
    .bind(...baseParams)
    .first<{ all_n: number; published_n: number; scheduled_n: number; draft_n: number }>();
  const counts = {
    all: countsRow?.all_n ?? 0,
    published: countsRow?.published_n ?? 0,
    scheduled: countsRow?.scheduled_n ?? 0,
    draft: countsRow?.draft_n ?? 0,
  };

  // List view only needs these columns — skip the heavy text fields
  // (prompt_text, images, how_to_use) so the payload + read stay small.
  const rows = await db
    .prepare(
      `SELECT p.slug, p.title, p.description, p.status, p.featured, p.date, p.publish_at,
              p.author, p.category, p.created_by, p.created_at,
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
      counts,
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
         cover_image, images, featured, liked, popularity, how_to_use, created_by, status, publish_at, updated_at, cover_w, cover_h)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?)`,
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
      Number.isFinite(body.coverW) ? body.coverW : null,
      Number.isFinite(body.coverH) ? body.coverH : null,
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
