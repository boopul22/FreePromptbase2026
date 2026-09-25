export const prerender = false;

import type { APIRoute } from 'astro';
import { getDB } from '../../lib/db';
import { ENGAGEMENT_HINT_COOKIE, getActorEngagement } from '../../lib/engagement';

// The current actor's saved + liked prompt slugs. Anonymous public pages are
// served from the shared edge cache with no per-visitor state baked in; the
// browser calls this (only when the fpb_eng hint says there may be something
// to show) and applies the hearts/bookmarks. See hydrateEngagement().
export const GET: APIRoute = async ({ locals }) => {
  const actorId = locals.actorId;
  if (!actorId) return json({ saved: [], liked: [] });

  let state;
  try {
    state = await getActorEngagement(getDB(locals), actorId);
  } catch {
    return json({ error: 'Unavailable' }, 503);
  }

  const res = json(state);
  // Refresh the hint so devices with nothing saved/liked stop asking.
  const has = state.saved.length > 0 || state.liked.length > 0;
  const secure = import.meta.env.PROD ? '; Secure' : '';
  res.headers.append(
    'Set-Cookie',
    `${ENGAGEMENT_HINT_COOKIE}=${has ? 1 : 0}; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 365}${secure}`,
  );
  return res;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
