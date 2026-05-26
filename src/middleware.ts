import { defineMiddleware } from 'astro:middleware';
import { getSession } from './lib/session';
import { getDB } from './lib/db';

// Single-language middleware. If you want multi-locale routing, use
// `middleware.i18n.ts` as a starting point — it adds /{locale}/* prefix
// redirects and depends on src/i18n/config.ts + src/i18n/utils.ts.

export const onRequest = defineMiddleware(async ({ request, cookies, locals, redirect }, next) => {
  const url = new URL(request.url);
  const path = url.pathname;

  // Resolve session from cookie so downstream pages see `locals.user`.
  let db: D1Database | null = null;
  try {
    db = getDB(locals);
  } catch {
    // D1 binding not available (e.g. during some build steps). Fail open.
  }

  if (db) {
    const token = cookies.get('session')?.value;
    if (token) {
      try {
        const user = await getSession(db, token);
        if (user) locals.user = user;
      } catch {
        // Invalid/expired session — leave locals.user unset.
      }
    }
  }

  // Anonymous actor cookie — long-lived, identifies a device for save/share
  // before sign-in. Migrated into the user's actor_id on OAuth callback.
  let anonId = cookies.get('anon_id')?.value;
  let setAnonCookie = false;
  if (!anonId) {
    anonId = crypto.randomUUID();
    setAnonCookie = true;
  }
  locals.actorId = locals.user ? `user:${locals.user.id}` : `anon:${anonId}`;

  // Preload the current actor's liked + saved slugs so PromptCard renders the
  // hearts/bookmarks in their correct initial state on SSR (no client-fetch
  // flicker). Skip for API routes that don't render cards.
  if (db && !path.startsWith('/api/')) {
    try {
      const [savedRes, likedRes] = await db.batch<{ prompt_slug: string }>([
        db
          .prepare('SELECT prompt_slug FROM prompt_saves WHERE actor_id = ?')
          .bind(locals.actorId),
        db
          .prepare('SELECT prompt_slug FROM prompt_likes WHERE actor_id = ?')
          .bind(locals.actorId),
      ]);
      locals.savedSlugs = new Set(savedRes.results.map((r) => r.prompt_slug));
      locals.likedSlugs = new Set(likedRes.results.map((r) => r.prompt_slug));
    } catch {
      locals.savedSlugs = new Set();
      locals.likedSlugs = new Set();
    }
  } else {
    locals.savedSlugs = new Set();
    locals.likedSlugs = new Set();
  }

  // /dashboard — any authenticated user
  if ((path.startsWith('/dashboard') || path.startsWith('/api/dashboard/')) && !locals.user) {
    if (path.startsWith('/api/')) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401, headers: { 'Content-Type': 'application/json' },
      });
    }
    return redirect('/api/auth/login', 302);
  }

  // /admin — admin role required
  if (path.startsWith('/admin') || path.startsWith('/api/admin/')) {
    if (!locals.user || locals.user.role !== 'admin') {
      if (path.startsWith('/api/')) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403, headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response('Forbidden', { status: 403 });
    }
  }

  const response = await next();

  // Issue the anon_id cookie if this visitor didn't have one. Long-lived; not
  // HttpOnly so we could read it client-side if ever needed (server still uses
  // the same value either way). Never overwrite an existing cookie.
  if (setAnonCookie) {
    const isSecure = import.meta.env.PROD;
    const domain = isSecure ? '; Domain=.freepromptbase.com' : '';
    const maxAge = 60 * 60 * 24 * 365;
    response.headers.append(
      'Set-Cookie',
      `anon_id=${anonId}; SameSite=Lax; Path=/; Max-Age=${maxAge}${isSecure ? '; Secure' : ''}${domain}`,
    );
  }

  // Security headers on every response
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  // Public HTML caching — skip API/admin/dashboard. Logged-in users get private,
  // no-cache so personalized nav isn't served from the CDN.
  if (
    !path.startsWith('/api/') &&
    !path.startsWith('/admin') &&
    !path.startsWith('/dashboard') &&
    response.headers.get('content-type')?.includes('text/html')
  ) {
    const hasPersonalization =
      locals.user ||
      (locals.savedSlugs && locals.savedSlugs.size > 0) ||
      (locals.likedSlugs && locals.likedSlugs.size > 0);
    if (hasPersonalization) {
      // Personalized HTML (signed-in user OR an anon who has saved at least one
      // prompt) must not be shared across visitors via the CDN cache.
      response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    } else {
      response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400');
    }
  }

  return response;
});
