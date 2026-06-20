import { defineMiddleware } from 'astro:middleware';
import { getSession } from './lib/session';
import { getDB } from './lib/db';
import { getNextPublishAt } from './lib/prompts';

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

  // Static asset proxy paths (/cdn/*) don't need session lookups, actor IDs,
  // or saved/liked preloads. Bail out early so cached + uncached image hits
  // alike stay cheap.
  const isStaticProxy = path.startsWith('/cdn/');

  if (db && !isStaticProxy) {
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
  if (!anonId && !isStaticProxy) {
    anonId = crypto.randomUUID();
    setAnonCookie = true;
  }
  locals.actorId = locals.user ? `user:${locals.user.id}` : `anon:${anonId ?? ''}`;

  // Preload the current actor's liked + saved slugs so PromptCard renders the
  // hearts/bookmarks in their correct initial state on SSR (no client-fetch
  // flicker). Skip for API routes and the admin/CMS area — neither renders
  // PromptCard, so these two D1 queries would be pure overhead there.
  // A brand-new anonymous visitor (no prior anon_id cookie) can't have any
  // saves/likes yet, so skip the two D1 queries entirely — this is the common
  // first-visit / crawler / Lighthouse case and the queries were adding to TTFB
  // on every public page.
  const isAdmin = path.startsWith('/admin');
  const freshAnon = !locals.user && setAnonCookie;
  if (db && !path.startsWith('/api/') && !isStaticProxy && !isAdmin && !freshAnon) {
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

  // /dashboard, /submit, /account — any authenticated user
  const requiresAuth =
    path.startsWith('/dashboard') ||
    path.startsWith('/api/dashboard/') ||
    path === '/submit' ||
    path.startsWith('/submit/') ||
    path === '/api/submit-prompt' ||
    path.startsWith('/api/submit-prompt/') ||
    path === '/account' ||
    path.startsWith('/account/') ||
    path === '/api/account';
  if (requiresAuth && !locals.user) {
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
  // Origin isolation. allow-popups keeps share/OAuth popups working while still
  // isolating this document from cross-origin openers.
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  // Ensure the charset is declared in the header (not just a <meta>), so it's
  // never "too late" regardless of head size.
  const ct = response.headers.get('content-type');
  if (ct && ct.startsWith('text/html') && !ct.includes('charset')) {
    response.headers.set('content-type', 'text/html; charset=utf-8');
  }

  // Public HTML caching — skip API/admin/dashboard. Logged-in users get private,
  // no-cache so personalized nav isn't served from the CDN.
  if (
    !path.startsWith('/api/') &&
    !path.startsWith('/admin') &&
    !path.startsWith('/dashboard') &&
    path !== '/submit' &&
    !path.startsWith('/submit/') &&
    path !== '/account' &&
    !path.startsWith('/account/') &&
    response.headers.get('content-type')?.includes('text/html')
  ) {
    const hasPersonalization =
      locals.user ||
      (locals.savedSlugs && locals.savedSlugs.size > 0) ||
      (locals.likedSlugs && locals.likedSlugs.size > 0);
    if (response.status >= 400) {
      // Don't let the CDN hold an error (esp. a 404 for a slug that's about to be
      // published) for up to an hour — a freshly-added page would keep serving a
      // stale 404 to crawlers. Make error responses revalidate immediately.
      response.headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
    } else if (hasPersonalization) {
      // Personalized HTML (signed-in user OR an anon who has saved at least one
      // prompt) must not be shared across visitors via the CDN cache.
      response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    } else {
      // Scheduling-aware CDN TTL. Scheduled prompts have no cron — they go live
      // purely because this SSR gate (`publish_at <= now`) is re-evaluated per
      // request. A stale cached page would keep hiding a freshly-due prompt, so we
      // make the cache expire exactly at the next scheduled go-live. This runs only
      // on cache misses (the worker never executes on CDN hits), so the single
      // indexed MIN lookup costs nothing on the hot path.
      //
      // Default (nothing scheduled within the hour): cache 1h with a long
      // stale-while-revalidate for best performance.
      let cacheControl = 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400';
      try {
        const nextPublish = await getNextPublishAt();
        if (nextPublish) {
          // publish_at is stored UTC but zone-less; append 'Z' so Date.parse reads it as UTC.
          const secs = Math.floor((Date.parse(nextPublish.replace(' ', 'T') + 'Z') - Date.now()) / 1000);
          if (Number.isFinite(secs) && secs <= 3600) {
            // A go-live is imminent. Pin freshness to expire right at publish time
            // and drop stale-while-revalidate entirely, so the cache hard-expires at
            // the boundary and the very next request renders the new prompt — no
            // stale-serve window. Floored at 30s to avoid a thundering herd of
            // origin renders at the instant of go-live.
            const ttl = Math.max(30, secs);
            cacheControl = `public, max-age=${Math.min(300, ttl)}, s-maxage=${ttl}`;
          }
        }
      } catch {
        // D1 unavailable or query failed — keep the safe 1h default above.
      }
      response.headers.set('Cache-Control', cacheControl);
    }
  }

  return response;
});
