export const prerender = false;

import type { APIRoute } from 'astro';
import { getDB } from '../../../../lib/db';

interface UserRow {
  id: string;
  google_id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  role: string;
  is_banned: number;
  created_at: string;
  updated_at: string;
}

function mapRow(r: UserRow) {
  return {
    id: r.id,
    googleId: r.google_id,
    email: r.email,
    name: r.name,
    avatarUrl: r.avatar_url ?? null,
    role: r.role as 'user' | 'admin',
    isBanned: !!r.is_banned,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export const GET: APIRoute = async ({ locals, url }) => {
  if (!locals.user || locals.user.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const db = getDB(locals);
  const search = url.searchParams.get('search')?.trim() || '';
  const role = url.searchParams.get('role'); // 'admin' | 'user' | null

  const params: any[] = [];
  let where = 'WHERE 1=1';
  if (search) {
    where += ' AND (name LIKE ? OR email LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (role === 'admin' || role === 'user') {
    where += ' AND role = ?';
    params.push(role);
  }

  const rows = await db
    .prepare(`SELECT id, google_id, email, name, avatar_url, role, is_banned, created_at, updated_at
              FROM users ${where} ORDER BY created_at DESC LIMIT 200`)
    .bind(...params)
    .all<UserRow>();

  const countRes = await db
    .prepare(`SELECT COUNT(*) as count FROM users ${where}`)
    .bind(...params)
    .first<{ count: number }>();

  return new Response(
    JSON.stringify({
      success: true,
      users: (rows.results || []).map(mapRow),
      total: countRes?.count || 0,
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
};
