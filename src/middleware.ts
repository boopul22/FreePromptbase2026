import { defineMiddleware } from 'astro:middleware';
import { getSession } from './lib/session';
import { getDB } from './lib/db';
import { getNextPublishAt } from './lib/prompts';
import { publicCacheKey } from './lib/publicCache';
import { ENGAGEMENT_HINT_COOKIE, getActorEngagement } from './lib/engagement';
import { legacyEditorialTarget } from './data/legacy-redirects';
import { tagCanonicalTarget } from './data/tag-seo';

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

// Short edge TTL for anonymous 404 renders (see the response caching below).
const NOT_FOUND_EDGE_TTL = 300;

// Scheduling-aware edge TTL. Scheduled prompts go live because the SSR gate
// (`publish_at <= now`) is re-evaluated per request, so a stale cached page
// would keep hiding a freshly-due prompt; the cache must expire exactly at the
// next scheduled go-live. This runs only on cache misses, so the single indexed
// MIN lookup costs nothing on the hot path. Default (nothing scheduled within
// the hour): 1h TTL.
async function scheduledEdgeTtl(): Promise<number> {
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
        return Math.max(30, secs);
      }
    }
  } catch {
    // D1 unavailable or query failed — keep the safe 1h default.
  }
  return 3600;
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
  // Only verified equivalent editorial URLs are redirected. This runs before
  // the general host/slash canonicalization so every mapping is one 301 hop.
  const legacyTarget = legacyEditorialTarget(path);
  if (legacyTarget) {
    const dest = new URL(url.toString());
    dest.protocol = 'https:';
    dest.hostname = CANONICAL_HOST;
    dest.port = '';
    dest.pathname = legacyTarget;
    return redirect(dest.toString(), 301);
  }

  // Legacy /tag/<slug> docs URLs → live root keyword pages.
  if (path.startsWith('/tag/') && path.length > '/tag/'.length) {
    const tagSlug = path.slice('/tag/'.length).replace(/\/$/, '').toLowerCase();
    if (tagSlug && !tagSlug.includes('/')) {
      const dest = new URL(url.toString());
      dest.protocol = 'https:';
      dest.hostname = CANONICAL_HOST;
      dest.port = '';
      dest.pathname = `/${tagCanonicalTarget(tagSlug) ?? tagSlug}`;
      return redirect(dest.toString(), 301);
    }
  }

  if (url.hostname === CANONICAL_HOST || url.hostname === `www.${CANONICAL_HOST}`) {
    const viaHttp =
      url.protocol === 'http:' ||
      (request.headers.get('cf-visitor') ?? '').includes('"scheme":"http"');
    // Collapse www + http + trailing slash into one 301 to the final apex URL.
    const needsHostFix = viaHttp || url.hostname !== CANONICAL_HOST;
    const needsSlashFix = path.length > 1 && path.endsWith('/');
    if (needsHostFix || needsSlashFix) {
      url.protocol = 'https:';
      url.hostname = CANONICAL_HOST;
      url.port = '';
      if (needsSlashFix) url.pathname = path.replace(/\/+$/, '') || '/';
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
  const actorId = locals.user ? `user:${locals.user.id}` : `anon:${anonId ?? ''}`;
  locals.actorId = actorId;

  // Issue the anon_id cookie if this visitor didn't have one. Long-lived; not
  // HttpOnly so client code can tell a returning device from a brand-new one
  // (see hydrateEngagement in src/scripts/social.ts). Never overwrite an
  // existing cookie. A brand-new device has no saves/likes, so it also gets
  // `fpb_eng=0`, which tells the client it can skip the engagement fetch.
  const appendAnonCookie = (res: Response) => {
    if (!setAnonCookie) return;
    const isSecure = import.meta.env.PROD;
    const domain = isSecure ? '; Domain=.freepromptbase.com' : '';
    const maxAge = 60 * 60 * 24 * 365;
    res.headers.append(
      'Set-Cookie',
      `anon_id=${anonId}; SameSite=Lax; Path=/; Max-Age=${maxAge}${isSecure ? '; Secure' : ''}${domain}`,
    );
    res.headers.append(
      'Set-Cookie',
      `${ENGAGEMENT_HINT_COOKIE}=0; SameSite=Lax; Path=/; Max-Age=${maxAge}${isSecure ? '; Secure' : ''}`,
    );
  };

  // Shared edge cache. Every anonymous render of a public page is generic: a
  // bare GET with no query string (so junk params can't fill the cache with
  // variants) and no per-visitor saved/liked state baked into the HTML. For
  // these requests the anonymous visitor's hearts/bookmarks are applied in the
  // browser from /api/engagement instead, so the cache lookup can happen
  // BEFORE any per-visitor D1 work and returning visitors hit the cache too.
  const sharedCacheable =
    request.method === 'GET' &&
    !url.search &&
    !isStaticProxy &&
    !isEditorialPath &&
    !locals.user &&
    isPubliclyCacheablePath(path);
  locals.engagementClientSide = sharedCacheable;
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

  // Preload the current actor's liked + saved slugs so PromptCard renders the
  // hearts/bookmarks in their correct initial state on SSR for renders that are
  // never shared: signed-in users, query-string variants (e.g. the
  // /partials/prompts infinite-scroll fragments), editorial pages, /saved and
  // /liked. Skipped for:
  //   - shared-cacheable anonymous renders (state is hydrated client-side),
  //   - API routes and the admin/CMS area (neither renders PromptCard),
  //   - a brand-new anonymous visitor (no prior anon_id → no saves/likes yet).
  const isAdmin = path.startsWith('/admin');
  const freshAnon = !locals.user && setAnonCookie;
  if (
    db &&
    !sharedCacheable &&
    !path.startsWith('/api/') &&
    !isStaticProxy &&
    !isAdmin &&
    !freshAnon
  ) {
    try {
      const { saved, liked } = await getActorEngagement(db, actorId);
      locals.savedSlugs = new Set(saved);
      locals.likedSlugs = new Set(liked);
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

  // Tracking, filter, and other query variants share the clean URL's content
  // but must never become separate indexable pages.
  if (url.search && response.headers.get('content-type')?.includes('text/html')) {
    response.headers.set('X-Robots-Tag', 'noindex, follow');
  }

  // Public HTML caching — skip API/admin/dashboard. Logged-in users get private,
  // no-cache so personalized nav isn't served from the CDN.
  if (isPubliclyCacheablePath(path) && response.headers.get('content-type')?.includes('text/html')) {
    const hasPersonalization =
      locals.user ||
      (locals.savedSlugs && locals.savedSlugs.size > 0) ||
      (locals.likedSlugs && locals.likedSlugs.size > 0);
    if (url.search) {
      response.headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
      response.headers.set('Cloudflare-CDN-Cache-Control', 'no-store');
    } else if (response.status >= 400) {
      // Don't let the CDN hold an error (esp. a 404 for a slug that's about to be
      // published) for up to an hour — a freshly-added page would keep serving a
      // stale 404 to crawlers. Make error responses revalidate immediately.
      response.headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
      // Anonymous 404s are still worth a *short* per-colo edge cache entry: the
      // same dead URL is often re-requested by crawlers/bots, and each miss is a
      // full SSR render. Kept to 5 minutes, capped by the next scheduled go-live,
      // and prompt publishes purge `/${slug}` explicitly (invalidatePromptPublish)
      // so a new page never sits behind a cached 404.
      if (edgeCacheStore && response.status === 404 && !hasPersonalization && !isEditorialPath) {
        storeAnonymousRender(Math.min(NOT_FOUND_EDGE_TTL, await scheduledEdgeTtl()));
      }
    } else if (hasPersonalization) {
      // Personalized HTML (signed-in user OR an anon who has saved at least one
      // prompt) must not be shared across visitors via the CDN cache.
      response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    } else if (isEditorialPath) {
      response.headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
      response.headers.set('Cloudflare-CDN-Cache-Control', 'no-store');
    } else {
      // Cache only at the edge, never in the browser. The same URL renders a
      // personalized header (logged-out button vs avatar), so if the browser
      // kept an anonymous copy (max-age), a visitor who then signs in would keep
      // seeing the logged-out nav until the entry expired or they hard-reloaded.
      // The actual caching happens via the Cache API put below (see
      // getEdgeCache); Cloudflare-CDN-Cache-Control is kept as documentation of
      // intent and for any future move behind the CDN cache proper.
      const edgeTtl = await scheduledEdgeTtl();
      response.headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
      response.headers.set('Cloudflare-CDN-Cache-Control', `public, s-maxage=${edgeTtl}`);
      if (response.status === 200) storeAnonymousRender(edgeTtl);
    }
  }

  // Store the anonymous render in the per-colo edge cache (see the lookup
  // above). The stored copy drops Set-Cookie (added per visitor at serve time)
  // and carries an s-maxage the Cache API uses for freshness; browsers still see
  // max-age=0 so they always revalidate.
  function storeAnonymousRender(ttl: number) {
    if (!edgeCacheStore) return;
    try {
      response.headers.set('X-Edge-Cache', 'miss');
      const stored = new Response(response.clone().body, response);
      stored.headers.delete('Set-Cookie');
      stored.headers.set('Cache-Control', `public, s-maxage=${ttl}`);
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

  return response;
});
