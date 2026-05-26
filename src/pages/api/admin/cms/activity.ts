export const prerender = false;

import type { APIRoute } from 'astro';
import { getDB } from '../../../../lib/db';

export const GET: APIRoute = async ({ locals, url }) => {
  if (!locals.user || locals.user.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const db = getDB(locals);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  const countResult = await db.prepare('SELECT COUNT(*) as count FROM activity_log').first<{ count: number }>();
  const total = countResult?.count || 0;

  const rows = await db
    .prepare('SELECT * FROM activity_log ORDER BY created_at DESC LIMIT ? OFFSET ?')
    .bind(limit, offset)
    .all();

  const activity = (rows.results || []).map((row: any) => ({
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    entityTitle: row.entity_title,
    details: row.details,
    createdAt: row.created_at,
  }));

  return new Response(
    JSON.stringify({ success: true, activity, total, page, totalPages: Math.ceil(total / limit) }),
    { headers: { 'Content-Type': 'application/json' } },
  );
};
