import { defineMiddleware } from 'astro:middleware';
import { getSession } from './lib/session';
import { getDB } from './lib/db';
import { getNextPublishAt } from './lib/prompts';
import { publicCacheKey } from './lib/publicCache';

// Single-language middleware. If you want multi-locale routing, use
// `middleware.i18n.ts` as a starting point — it adds /{locale}/* prefix
// redirects and depends on src/i18n/config.ts + src/i18n/utils.ts.

// Paths whose HTML is (or can be) personalized or private — never eligible for
// the shared edge cache or public cache headers.
function isPubliclyCacheablePath(path: string): boolean {
  return (
    !path.startsWith('/api/') &&
    !path.startsWith('/admin') &&
    !path.startsWith('/dashboard') &&
    path !== '/saved' &&
    path !== '/liked' &&
    path !== '/submit' &&
    !path.startsWith('/submit/') &&
    path !== '/account' &&
    !path.startsWith('/account/')
  );
}

// Workers' per-colo HTTP cache. `Cloudflare-CDN-Cache-Control` on a Worker
// response is advisory only — eyeball responses from a Worker never transit
// Cloudflare's CDN cache, so before this every single page view re-rendered on
// the origin (~1s TTFB, all D1 queries included). We cache anonymous,
// non-personalized HTML explicitly and serve hits before any rendering work.
function getEdgeCache(): Cache | null {
  try {
    return (globalThis.caches as unknown as { default?: Cache })?.default ?? null;
  } catch {
    return null; // astro dev without a caches global
  }
}

export const onRequest = defineMiddleware(async ({ request, cookies, locals, redirect }, next) => {
  const url = new URL(request.url);
  const path = url.pathname;
  // Editorial pages are backed by D1 and can change immediately when an author
  // publishes, edits, or moves an entry between Blog and News. Keeping them out
  // of the hour-long shared cache prevents stale article routes, canonicals,
  // section links, and publication timestamps from reaching crawlers.
  const isEditorialPath =
    path === '/blog' ||
    path.startsWith('/blog/') ||
    path === '/news' ||
    path.startsWith('/news/');

  // Canonical host + scheme: force https://freepromptbase.com (apex, HTTPS).
  // Runs before any session/D1 work so it's the cheapest possible path — a
  // single 301 for http:// hits and for the www subdomain. Only the production
  // domain is normalized, so `astro dev` (http://localhost) and *.workers.dev
  // preview URLs are left untouched. Cloudflare may carry the original scheme in
  // the CF-Visitor header, so we check that alongside url.protocol.
  const CANONICAL_HOST = 'freepromptbase.com';
  if (url.hostname === CANONICAL_HOST || url.hostname === `www.${CANONICAL_HOST}`) {
    const viaHttp =
      url.protocol === 'http:' ||
      (request.headers.get('cf-visitor') ?? '').includes('"scheme":"http"');
    if (viaHttp || url.hostname !== CANONICAL_HOST) {
      url.protocol = 'https:';
      url.hostname = CANONICAL_HOST;
      url.port = '';
      return redirect(url.toString(), 301);
    }
  }

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

  // Issue the anon_id cookie if this visitor didn't have one. Long-lived; not
  // HttpOnly so we could read it client-side if ever needed (server still uses
  // the same value either way). Never overwrite an existing cookie.
  const appendAnonCookie = (res: Response) => {
    if (!setAnonCookie) return;
    const isSecure = import.meta.env.PROD;
    const domain = isSecure ? '; Domain=.freepromptbase.com' : '';
    const maxAge = 60 * 60 * 24 * 365;
    res.headers.append(
      'Set-Cookie',
      `anon_id=${anonId}; SameSite=Lax; Path=/; Max-Age=${maxAge}${isSecure ? '; Secure' : ''}${domain}`,
    );
  };

  // Edge-cache lookup. Only fully anonymous renders are shared: no user, no
  // saves/likes (those personalize the card hearts/bookmarks), a bare GET with
  // no query string. Query-stringed URLs are skipped so junk params can't fill
  // the cache with variants.
  const sharedCacheable =
    request.method === 'GET' &&
    !url.search &&
    !isStaticProxy &&
    !isEditorialPath &&
    !locals.user &&
    locals.savedSlugs.size === 0 &&
    locals.likedSlugs.size === 0 &&
    isPubliclyCacheablePath(path);
  const edgeCacheStore = sharedCacheable ? getEdgeCache() : null;
  if (edgeCacheStore) {
    try {
      const hit = await edgeCacheStore.match(publicCacheKey(url));
      if (hit) {
        // Stored copies already carry the security/cache headers set below;
        // only the per-visitor cookie is added at serve time.
        const res = new Response(hit.body, hit);
        res.headers.set('X-Edge-Cache', 'hit');
        // Stored copies carry s-maxage for the Cache API; browsers must still
        // always revalidate (a signed-in user shares the URL with anon renders).
        res.headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
        appendAnonCookie(res);
        return res;
      }
    } catch {
      // Cache unavailable — fall through to a normal render.
    }
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
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'X-Robots-Tag': 'noindex, nofollow',
        },
      });
    }
    const authRedirect = redirect('/api/auth/login', 302);
    authRedirect.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return authRedirect;
  }

  // /admin — admin role required
  if (path.startsWith('/admin') || path.startsWith('/api/admin/')) {
    if (!locals.user || locals.user.role !== 'admin') {
      if (path.startsWith('/api/')) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
            'X-Robots-Tag': 'noindex, nofollow',
          },
        });
      }
      return new Response('Forbidden', {
        status: 403,
        headers: { 'X-Robots-Tag': 'noindex, nofollow' },
      });
    }
  }

  const response = await next();

  appendAnonCookie(response);

  // Security headers on every response
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  // A compact policy compatible with the site's inline scripts, analytics,
  // advertising, and OAuth while still blocking plugins, hostile base-tag
  // rewrites, and third-party framing.
  response.headers.set(
    'Content-Security-Policy',
    "object-src 'none'; base-uri 'self'; frame-ancestors 'self'; upgrade-insecure-requests",
  );
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
  if (isPubliclyCacheablePath(path) && response.headers.get('content-type')?.includes('text/html')) {
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
    } else if (isEditorialPath) {
      response.headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
      response.headers.set('Cloudflare-CDN-Cache-Control', 'no-store');
    } else {
      // Scheduling-aware edge TTL. Scheduled prompts have no cron — they go live
      // purely because this SSR gate (`publish_at <= now`) is re-evaluated per
      // request. A stale cached page would keep hiding a freshly-due prompt, so we
      // make the cache expire exactly at the next scheduled go-live. This runs
      // only on cache misses, so the single indexed MIN lookup costs nothing on
      // the hot path. Default (nothing scheduled within the hour): 1h TTL.
      //
      // Cache only at the edge, never in the browser. The same URL renders a
      // personalized header (logged-out button vs avatar), so if the browser
      // kept an anonymous copy (max-age), a visitor who then signs in would keep
      // seeing the logged-out nav until the entry expired or they hard-reloaded.
      // The actual caching happens via the Cache API put below (see
      // getEdgeCache); Cloudflare-CDN-Cache-Control is kept as documentation of
      // intent and for any future move behind the CDN cache proper.
      let edgeTtl = 3600;
      try {
        const nextPublish = await getNextPublishAt();
        if (nextPublish) {
          // publish_at is stored UTC but zone-less; append 'Z' so Date.parse reads it as UTC.
          const secs = Math.floor((Date.parse(nextPublish.replace(' ', 'T') + 'Z') - Date.now()) / 1000);
          if (Number.isFinite(secs) && secs <= 3600) {
            // A go-live is imminent. Pin freshness to expire right at publish time
            // so the cache hard-expires at the boundary and the very next request
            // renders the new prompt — no stale-serve window. Floored at 30s to
            // avoid a thundering herd of origin renders at the instant of go-live.
            edgeTtl = Math.max(30, secs);
          }
        }
      } catch {
        // D1 unavailable or query failed — keep the safe 1h default above.
      }
      response.headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
      response.headers.set('Cloudflare-CDN-Cache-Control', `public, s-maxage=${edgeTtl}`);

      // Store the anonymous render in the per-colo edge cache (see the lookup
      // above). The stored copy drops Set-Cookie (added per visitor at serve
      // time) and carries an s-maxage the Cache API uses for freshness; browsers
      // still see max-age=0 so they always revalidate.
      if (edgeCacheStore && response.status === 200) {
        try {
          response.headers.set('X-Edge-Cache', 'miss');
          const stored = new Response(response.clone().body, response);
          stored.headers.delete('Set-Cookie');
          stored.headers.set('Cache-Control', `public, s-maxage=${edgeTtl}`);
          const put = edgeCacheStore.put(publicCacheKey(url), stored).catch(() => {});
          try {
            // Astro v6 cloudflare adapter exposes the Workers execution context
            // as locals.cfContext (locals.runtime.ctx throws a removal error).
            locals.cfContext.waitUntil(put);
          } catch {
            // No execution context (astro dev) — the put still runs, just unanchored.
          }
        } catch {
          // Never let cache writes break the response.
        }
      }
    }
  }

  return response;
});
