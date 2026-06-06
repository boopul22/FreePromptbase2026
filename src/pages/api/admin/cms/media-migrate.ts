export const prerender = false;

import type { APIRoute } from 'astro';
import { getDB } from '../../../../lib/db';
import { logActivity } from '../../../../lib/cms';
import { convertToWebp } from '../../../../lib/image';
// @ts-ignore - cloudflare:workers is a Workers-only built-in module
import { env as cfEnv } from 'cloudflare:workers';

// One-time (repeatable, idempotent) migration: re-encode existing JPG/PNG R2
// objects to WebP **in place under the same key**. Because the /cdn proxy serves
// each object's stored content-type — not its file extension — the URL never
// changes, so none of the references embedded in prompts.images JSON, post HTML
// bodies, or cover_image fields need rewriting.
//
// Batched + cursor-driven so each request stays well under Worker CPU/subrequest
// limits. The admin UI calls this repeatedly until `done: true`.

// Folders the /cdn proxy is allowed to serve — and therefore all we ever store.
const PREFIXES = ['cms/', 'prompts/', 'submissions/'];
const BATCH_LIMIT = 12; // objects converted per request

function jsonError(error: string, status = 400) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Best-effort source mime: prefer the object's stored content-type, fall back to
// the key's extension. Only JPEG/PNG are convertible.
function sourceMime(contentType: string | undefined, key: string): string {
  const ct = (contentType || '').toLowerCase().split(';')[0].trim();
  if (ct === 'image/jpeg' || ct === 'image/png') return ct;
  const lower = key.toLowerCase();
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.png')) return 'image/png';
  return ct; // webp/gif/svg/other → skipped downstream
}

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user || locals.user.role !== 'admin') {
    return jsonError('Forbidden', 403);
  }

  const R2 = (cfEnv as any).R2;
  if (!R2) return jsonError('R2 binding not available', 503);

  let prefixIndex = 0;
  let cursor: string | undefined;
  try {
    const body = await request.json();
    if (typeof body?.prefixIndex === 'number') prefixIndex = body.prefixIndex;
    if (typeof body?.cursor === 'string' && body.cursor) cursor = body.cursor;
  } catch {
    // No body → start from the beginning.
  }

  if (prefixIndex >= PREFIXES.length) {
    return new Response(JSON.stringify({ done: true, prefixIndex, processed: 0, converted: 0, skipped: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const db = getDB(locals);
  const prefix = PREFIXES[prefixIndex];

  let processed = 0;
  let converted = 0;
  let skipped = 0;
  let nextCursor: string | undefined = cursor;
  let advancePrefix = false;

  // Pull one page of keys, then convert up to BATCH_LIMIT of them.
  const listing = await R2.list({ prefix, cursor, limit: 100, include: ['httpMetadata'] });
  const objects: Array<{ key: string }> = listing.objects || [];

  for (const obj of objects) {
    if (converted >= BATCH_LIMIT) {
      // Stop early; resume from this object next call by keeping the page cursor.
      // We didn't finish this page, so re-list from the same cursor and re-skip
      // the already-converted (now WebP) objects — they're cheaply skipped.
      nextCursor = cursor;
      break;
    }
    processed++;

    const r2obj = await R2.get(obj.key);
    if (!r2obj) {
      skipped++;
      continue;
    }
    const mime = sourceMime(r2obj.httpMetadata?.contentType, obj.key);
    if (mime !== 'image/jpeg' && mime !== 'image/png') {
      skipped++;
      continue; // already webp / gif / svg / unknown — leave it
    }

    const bytes = await r2obj.arrayBuffer();
    const result = await convertToWebp(bytes, mime);
    if (!result.converted) {
      skipped++;
      continue;
    }

    await R2.put(obj.key, result.bytes, { httpMetadata: { contentType: 'image/webp' } });
    converted++;

    // Cosmetic: keep the media library row in sync (serving already works via the
    // stored content-type regardless). Matches on the unchanged r2_key.
    try {
      await db
        .prepare('UPDATE media SET mime_type = ?, size_bytes = ? WHERE r2_key = ?')
        .bind('image/webp', result.bytes.byteLength, obj.key)
        .run();
    } catch {
      // Non-fatal — not every R2 object has a media row.
    }
  }

  // Decide where the next call resumes.
  if (converted >= BATCH_LIMIT) {
    // Hit the per-request cap mid-page — keep the same prefix + cursor.
    // (nextCursor already set to the current page cursor above.)
  } else if (listing.truncated) {
    nextCursor = listing.cursor; // more pages in this prefix
  } else {
    advancePrefix = true; // prefix exhausted → move to the next one
    nextCursor = undefined;
  }

  const nextPrefixIndex = advancePrefix ? prefixIndex + 1 : prefixIndex;
  const done = advancePrefix && nextPrefixIndex >= PREFIXES.length;

  if (converted > 0) {
    try {
      await logActivity(db, {
        userId: locals.user.id,
        userName: locals.user.name,
        action: 'migrate_media',
        entityType: 'media',
        entityId: prefix,
        entityTitle: `Converted ${converted} image(s) in ${prefix}`,
      });
    } catch {
      // Don't block on logging.
    }
  }

  return new Response(
    JSON.stringify({
      done,
      prefix,
      prefixIndex: nextPrefixIndex,
      cursor: nextCursor || null,
      processed,
      converted,
      skipped,
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
};
