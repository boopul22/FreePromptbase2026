export const prerender = false;

import type { APIRoute } from 'astro';
import { getDB } from '../../../../../lib/db';
import { logActivity } from '../../../../../lib/cms';

export const PUT: APIRoute = async ({ params, request, locals }) => {
  if (!locals.user || locals.user.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const db = getDB(locals);
  const body = await request.json();
  const id = params.id;

  const existing = await db.prepare('SELECT filename FROM media WHERE id = ?').bind(id).first();
  if (!existing) {
    return new Response(JSON.stringify({ error: 'Media not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  const updates: string[] = [];
  const values: any[] = [];

  if (body.altText !== undefined) {
    updates.push('alt_text = ?');
    values.push(body.altText);
  }
  if (body.folder !== undefined) {
    updates.push('folder = ?');
    values.push(body.folder);
  }

  if (updates.length === 0) {
    return new Response(JSON.stringify({ error: 'No fields to update' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  values.push(id);
  await db.prepare(`UPDATE media SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();

  await logActivity(db, {
    userId: locals.user.id,
    userName: locals.user.name,
    action: 'update_media',
    entityType: 'media',
    entityId: id!,
    entityTitle: (existing as any).filename,
  });

  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
