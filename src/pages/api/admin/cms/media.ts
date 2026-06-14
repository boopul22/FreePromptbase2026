export const prerender = false;

import type { APIRoute } from 'astro';
import { getDB } from '../../../../lib/db';
import { getEnv } from '../../../../lib/env';
import { generateId } from '../../../../lib/crypto';
import { logActivity } from '../../../../lib/cms';
// @ts-ignore - cloudflare:workers is a Workers-only built-in module
import { env as cfEnv } from 'cloudflare:workers';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
const MAX_SIZE = 10 * 1024 * 1024;

function getExtension(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
  };
  return map[mimeType] || 'bin';
}

// Content hash of the file bytes — used as the object key so re-uploading the
// same image (e.g. removed then picked again) reuses the existing object/record
// instead of storing a duplicate in the bucket.
async function sha256Hex(body: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', body);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
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

  if (!ALLOWED_TYPES.includes(file.type)) {
    return new Response(JSON.stringify({ error: `Unsupported file type: ${file.type}` }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  if (file.size > MAX_SIZE) {
    return new Response(JSON.stringify({ error: 'File too large. Maximum 10MB.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const env = getEnv(locals);
  const ext = getExtension(file.type);
  const body = await file.arrayBuffer();
  // Content-addressed key: identical bytes always map to the same object, so an
  // accidental remove + re-upload of the same image is deduped automatically.
  const hash = await sha256Hex(body);
  const key = `cms/${folder}/${hash}.${ext}`;
  const publicUrl = `${env.R2_PUBLIC_URL}/${key}`;

  const db = getDB(locals);

  // If this exact object is already registered, return the existing record
  // instead of re-uploading and inserting a duplicate row.
  const existing = await db
    .prepare('SELECT id, url, filename FROM media WHERE r2_key = ?')
    .bind(key)
    .first<{ id: string; url: string; filename: string }>();
  if (existing) {
    return new Response(
      JSON.stringify({ success: true, id: existing.id, url: existing.url, filename: existing.filename, deduped: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const id = generateId();

  // R2 binding upload — no API token, no SigV4. Worker has direct access via env.R2.
  // Skip the PUT if the object is already in the bucket (e.g. row was pruned but
  // the object lingered) — the bytes are identical, so the URL stays valid.
  const head = await (cfEnv as any).R2.head(key);
  if (!head) {
    await (cfEnv as any).R2.put(key, body, { httpMetadata: { contentType: file.type } });
  }

  await db
    .prepare(
      'INSERT INTO media (id, r2_key, url, filename, alt_text, size_bytes, mime_type, folder, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    )
    .bind(id, key, publicUrl, file.name, altText, file.size, file.type, folder, locals.user.id)
    .run();

  await logActivity(db, {
    userId: locals.user.id,
    userName: locals.user.name,
    action: 'upload_media',
    entityType: 'media',
    entityId: id,
    entityTitle: file.name,
  });

  return new Response(
    JSON.stringify({ success: true, id, url: publicUrl, filename: file.name }),
    { status: 201, headers: { 'Content-Type': 'application/json' } },
  );
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  if (!locals.user || locals.user.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const db = getDB(locals);
  const body = await request.json();
  const { id } = body;

  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing media id' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const media = await db.prepare('SELECT r2_key, filename FROM media WHERE id = ?').bind(id).first<{ r2_key: string; filename: string }>();
  if (!media) {
    return new Response(JSON.stringify({ error: 'Media not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  await (cfEnv as any).R2.delete(media.r2_key);

  await db.prepare('DELETE FROM media WHERE id = ?').bind(id).run();

  await logActivity(db, {
    userId: locals.user.id,
    userName: locals.user.name,
    action: 'delete_media',
    entityType: 'media',
    entityId: id,
    entityTitle: media.filename,
  });

  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
