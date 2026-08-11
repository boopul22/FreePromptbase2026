export const prerender = false;

import type { APIRoute } from 'astro';
import { getDB } from '../../../../lib/db';
import { logActivity } from '../../../../lib/cms';
import { publishMediaFile } from '../../../../lib/mediaPublishing';
import { invalidatePublicPaths } from '../../../../lib/publicCache';
// @ts-ignore - cloudflare:workers is a Workers-only built-in module
import { env as cfEnv } from 'cloudflare:workers';

function safeJsonArray(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/** Drop a deleted media URL from every prompt that still references it. */
async function scrubMediaUrlFromPrompts(
  db: D1Database,
  mediaUrl: string,
): Promise<{ slug: string; category: string }[]> {
  const rows = await db
    .prepare(
      `SELECT slug, category, cover_image, images
       FROM prompts
       WHERE cover_image = ? OR images LIKE ?`,
    )
    .bind(mediaUrl, `%${mediaUrl}%`)
    .all<{ slug: string; category: string; cover_image: string | null; images: string | null }>();

  const touched: { slug: string; category: string }[] = [];
  for (const row of rows.results || []) {
    const images = safeJsonArray(row.images);
    const nextImages = images.filter((u) => u !== mediaUrl);
    const nextCover =
      row.cover_image === mediaUrl
        ? nextImages[0] || null
        : row.cover_image;
    const imagesChanged = nextImages.length !== images.length;
    const coverChanged = nextCover !== row.cover_image;
    if (!imagesChanged && !coverChanged) continue;

    await db
      .prepare(
        `UPDATE prompts
         SET images = ?, cover_image = ?, updated_at = datetime('now')
         WHERE slug = ?`,
      )
      .bind(JSON.stringify(nextImages), nextCover, row.slug)
      .run();
    touched.push({ slug: row.slug, category: row.category });
  }
  return touched;
}

export const GET: APIRoute = async ({ locals, url }) => {
  if (!locals.user || locals.user.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const db = getDB(locals);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '24');
  const offset = (page - 1) * limit;
  const folder = url.searchParams.get('folder');
  const search = url.searchParams.get('search');

  const params: any[] = [];
  let where = 'WHERE 1=1';

  if (folder && folder !== 'all') {
    where += ' AND folder = ?';
    params.push(folder);
  }
  if (search) {
    where += ' AND (filename LIKE ? OR alt_text LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  const countResult = await db.prepare(`SELECT COUNT(*) as count FROM media ${where}`).bind(...params).first<{ count: number }>();
  const total = countResult?.count || 0;

  const rows = await db
    .prepare(`SELECT * FROM media ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
    .bind(...params, limit, offset)
    .all();

  const media = (rows.results || []).map((row: any) => ({
    id: row.id,
    url: row.url,
    filename: row.filename,
    altText: row.alt_text,
    sizeBytes: row.size_bytes,
    mimeType: row.mime_type,
    folder: row.folder,
    createdAt: row.created_at,
  }));

  return new Response(
    JSON.stringify({ success: true, media, total, page, totalPages: Math.ceil(total / limit) }),
    { headers: { 'Content-Type': 'application/json' } },
  );
};

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user || locals.user.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const formData = await request.formData();
  const file = formData.get('file');
  const folder = (formData.get('folder') as string) || 'general';
  const altText = (formData.get('alt_text') as string) || '';

  if (!file || !(file instanceof File)) {
    return new Response(JSON.stringify({ error: 'No file provided' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const db = getDB(locals);
  try {
    const uploaded = await publishMediaFile({
      db,
      bucket: (cfEnv as any).R2,
      publicBaseUrl: String((cfEnv as any).R2_PUBLIC_URL || 'https://freepromptbase.com/cdn'),
      file,
      folder,
      altText,
      actor: { id: locals.user.id, name: locals.user.name },
    });
    return new Response(JSON.stringify({ success: true, ...uploaded }), {
      status: uploaded.deduped ? 200 : 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Upload failed.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  if (!locals.user || locals.user.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const db = getDB(locals);
  const body = await request.json();
  const id = typeof body.id === 'string' ? body.id.trim() : '';
  const url = typeof body.url === 'string' ? body.url.trim() : '';

  if (!id && !url) {
    return new Response(JSON.stringify({ error: 'Missing media id or url' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const media = id
    ? await db
        .prepare('SELECT id, r2_key, url, filename FROM media WHERE id = ?')
        .bind(id)
        .first<{ id: string; r2_key: string; url: string; filename: string }>()
    : await db
        .prepare('SELECT id, r2_key, url, filename FROM media WHERE url = ?')
        .bind(url)
        .first<{ id: string; r2_key: string; url: string; filename: string }>();

  if (!media) {
    return new Response(JSON.stringify({ error: 'Media not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  await (cfEnv as any).R2.delete(media.r2_key);
  await db.prepare('DELETE FROM media WHERE id = ?').bind(media.id).run();

  // Keep prompt galleries in sync so a deleted file cannot reappear via stale
  // images[] JSON after the next public cache refresh.
  const touched = await scrubMediaUrlFromPrompts(db, media.url);
  const paths = [
    '/',
    '/categories',
    '/sitemap.xml',
    ...touched.flatMap((p) => [`/${encodeURIComponent(p.slug)}`, `/category/${encodeURIComponent(p.category)}`]),
  ];
  await invalidatePublicPaths(paths);

  await logActivity(db, {
    userId: locals.user.id,
    userName: locals.user.name,
    action: 'delete_media',
    entityType: 'media',
    entityId: media.id,
    entityTitle: media.filename,
  });

  return new Response(JSON.stringify({ success: true, scrubbedPrompts: touched.map((p) => p.slug) }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
