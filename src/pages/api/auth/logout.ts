export const prerender = false;

import type { APIRoute } from 'astro';
import { deleteSession } from '../../../lib/session';
import { getDB } from '../../../lib/db';

export const GET: APIRoute = async ({ request, locals }) => {
  const rawCookie = request.headers.get('cookie') || '';
  const match = rawCookie.match(/(?:^|;\s*)session=([^;]*)/);
  const token = match ? match[1] : null;

  if (token) {
    try {
      const db = getDB(locals);
      await deleteSession(db, token);
    } catch {
      // Ignore DB errors on logout
    }
  }

  const isSecure = import.meta.env.PROD;
  const clearFlags = `HttpOnly; SameSite=Lax; Path=/; Max-Age=0${isSecure ? '; Secure' : ''}`;

  return new Response(null, {
    status: 302,
    headers: [
      ['Location', '/'],
      ['Set-Cookie', `session=; ${clearFlags}`],
    ],
  });
};
