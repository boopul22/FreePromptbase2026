export const prerender = false;

import type { APIRoute } from 'astro';
import { getDB } from '../../../../../lib/db';
import { logActivity } from '../../../../../lib/cms';

function forbid() {
  return new Response(JSON.stringify({ error: 'Forbidden' }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  });
}

function badRequest(msg: string) {
  return new Response(JSON.stringify({ error: msg }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });
}

// PUT — update role and/or banned status.
// Body: { role?: 'admin' | 'user', isBanned?: boolean }
export const PUT: APIRoute = async ({ params, request, locals }) => {
  if (!locals.user || locals.user.role !== 'admin') return forbid();
  const targetId = params.id!;

  // Self-protection: don't let an admin demote or ban themselves and lock out.
  if (targetId === locals.user.id) {
    return badRequest('You cannot change your own role or ban yourself.');
  }

  const body = await request.json().catch(() => ({}));
  const updates: string[] = [];
  const values: any[] = [];

  if (body.role === 'admin' || body.role === 'user') {
    updates.push('role = ?');
    values.push(body.role);
  }
  if (typeof body.isBanned === 'boolean') {
    updates.push('is_banned = ?');
    values.push(body.isBanned ? 1 : 0);
  }

  if (updates.length === 0) {
    return badRequest('No valid fields to update (expected role or isBanned).');
  }

  const db = getDB(locals);
  const existing = await db
    .prepare('SELECT name, email FROM users WHERE id = ?')
    .bind(targetId)
    .first<{ name: string; email: string }>();
  if (!existing) {
    return new Response(JSON.stringify({ error: 'User not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  updates.push("updated_at = datetime('now')");
  await db
    .prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`)
    .bind(...values, targetId)
    .run();

  // If we just banned the user, wipe their active sessions so the change takes effect immediately.
  if (body.isBanned === true) {
    await db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(targetId).run();
  }

  await logActivity(db, {
    userId: locals.user.id,
    userName: locals.user.name,
    action:
      body.isBanned === true
        ? 'ban_user'
        : body.isBanned === false
          ? 'unban_user'
          : body.role === 'admin'
            ? 'promote_user'
            : 'demote_user',
    entityType: 'user',
    entityId: targetId,
    entityTitle: existing.email,
  });

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

// DELETE — remove user and their sessions.
export const DELETE: APIRoute = async ({ params, locals }) => {
  if (!locals.user || locals.user.role !== 'admin') return forbid();
  const targetId = params.id!;

  if (targetId === locals.user.id) {
    return badRequest('You cannot delete your own account.');
  }

  const db = getDB(locals);
  const existing = await db
    .prepare('SELECT name, email FROM users WHERE id = ?')
    .bind(targetId)
    .first<{ name: string; email: string }>();
  if (!existing) {
    return new Response(JSON.stringify({ error: 'User not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Hard delete user + their sessions. Activity log keeps user_name as a string
  // snapshot so historical entries stay readable.
  await db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(targetId).run();
  await db.prepare('DELETE FROM users WHERE id = ?').bind(targetId).run();

  await logActivity(db, {
    userId: locals.user.id,
    userName: locals.user.name,
    action: 'delete_user',
    entityType: 'user',
    entityId: targetId,
    entityTitle: existing.email,
  });

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
