export const prerender = false;

import type { APIRoute } from 'astro';
// @ts-ignore - cloudflare:workers is a Workers-only built-in module
import { env as cfEnv } from 'cloudflare:workers';

// Public read-only proxy for R2 objects, served under the project's own
// domain at /cdn/<key>. Lets the site present same-origin image URLs (better
// for SEO than a r2.dev subdomain) without paying for a custom R2 domain.
//
// Every request goes through this Worker, so we lean hard on Cloudflare's
// edge cache via long immutable Cache-Control + ETag — once an image is
// fetched the first time, subsequent hits are served from the colo cache and
// never invoke the Worker.

const CACHE = 'public, max-age=31536000, immutable';

// Folders we'll proxy. Anything outside this list returns 404 so this route
// doesn't become an arbitrary read of the bucket.
const ALLOWED_PREFIXES = ['submissions/', 'cms/', 'prompts/'];

// Same-origin SVG can execute embedded JS with full access to the site
// (cookies, localStorage, etc.). Refuse to serve them through this proxy.
const FORBIDDEN_TYPES = new Set(['image/svg+xml', 'text/html', 'application/xhtml+xml']);

function notFound(): Response {
	return new Response('Not Found', { status: 404 });
}

export const GET: APIRoute = async ({ params, request }) => {
	const rawKey = params.key;
	if (!rawKey || typeof rawKey !== 'string') return notFound();

	// Defense in depth: reject anything that looks like path traversal or an
	// attempt to escape the prefix allow-list.
	const key = rawKey.replace(/^\/+/, '');
	if (key.includes('..') || key.includes('//')) return notFound();
	if (key.toLowerCase().endsWith('.svg')) return notFound();
	if (!ALLOWED_PREFIXES.some((p) => key.startsWith(p))) return notFound();

	const R2 = (cfEnv as any).R2;
	if (!R2) return new Response('R2 binding not available', { status: 503 });

	// Conditional GET — if the browser already has this object cached and sends
	// If-None-Match matching the R2 etag, return 304 without streaming the body.
	const ifNoneMatch = request.headers.get('if-none-match');
	if (ifNoneMatch) {
		const head = await R2.head(key);
		if (head && head.httpEtag === ifNoneMatch) {
			const h = new Headers();
			h.set('Cache-Control', CACHE);
			h.set('ETag', head.httpEtag);
			return new Response(null, { status: 304, headers: h });
		}
	}

	const obj = await R2.get(key);
	if (!obj) return notFound();

	const headers = new Headers();
	obj.writeHttpMetadata(headers);
	headers.set('Cache-Control', CACHE);
	headers.set('ETag', obj.httpEtag);

	// If for any reason an SVG slipped past the extension check (e.g. legacy
	// admin upload with a non-.svg name but the right MIME), refuse it here.
	const contentType = headers.get('content-type')?.toLowerCase() ?? '';
	if (FORBIDDEN_TYPES.has(contentType.split(';')[0].trim())) {
		return notFound();
	}
	if (!headers.has('Content-Type')) {
		headers.set('Content-Type', 'application/octet-stream');
	}

	// Browsers that respect this header won't try to sniff a sneaky MIME.
	headers.set('X-Content-Type-Options', 'nosniff');

	return new Response(obj.body, { headers });
};
