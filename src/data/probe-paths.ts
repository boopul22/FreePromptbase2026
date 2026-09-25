/**
 * Vulnerability-scanner probes (/.env, /wp-login.php, /.aws/credentials,
 * /google-service-account.json, ...) never match a real page on this site, but
 * each one used to fall through to the root [slug] route: a D1 lookup plus a
 * full SSR render of 404.astro. Recognising them up front lets the Worker
 * answer with a tiny static 404 before Astro (and D1) are touched.
 *
 * Keep this conservative: a false positive would 404 a real URL. Real files in
 * public/ (robots.txt, llms.txt, ads.txt, logo.svg, ...) are served by the
 * assets layer before the Worker runs, and API/CDN proxy routes are exempt.
 * Legit dynamic non-HTML routes use .xml / .svg / .md, none of which are
 * blocked here.
 */

// File extensions no page on this site ever uses. `.json` is only served under
// /api/, which is exempt below.
const PROBE_EXTENSIONS = new Set([
	'php', 'php3', 'php4', 'php5', 'php7', 'phtml',
	'asp', 'aspx', 'jsp', 'jspa', 'cgi', 'pl',
	'env', 'sql', 'bak', 'old', 'swp', 'ini', 'log',
	'yml', 'yaml', 'config', 'conf', 'git',
	'json',
]);

// Whole path segments that only scanners request.
const PROBE_SEGMENTS = new Set(['wordpress', 'cgi-bin', 'phpmyadmin', 'xmlrpc']);

const EXEMPT_PREFIXES = ['/api/', '/cdn/'];

export function isProbePath(pathname: string): boolean {
	const path = pathname.toLowerCase();
	if (EXEMPT_PREFIXES.some((prefix) => path.startsWith(prefix))) return false;

	const segments = path.split('/').filter(Boolean);
	for (let i = 0; i < segments.length; i++) {
		const segment = segments[i];
		// Dotfiles / dot-directories (/.env, /.git/config, /.aws/credentials).
		// RFC 8615 /.well-known/ is the one legitimate dot-directory.
		if (segment.startsWith('.') && !(i === 0 && segment === '.well-known')) return true;
		if (segment.startsWith('wp-') || PROBE_SEGMENTS.has(segment)) return true;
	}

	const last = segments.at(-1) ?? '';
	const dot = last.lastIndexOf('.');
	if (dot > 0 && PROBE_EXTENSIONS.has(last.slice(dot + 1))) return true;

	return false;
}

/** Minimal static 404 for probe traffic — no Astro render, no D1. */
export function probeNotFoundResponse(): Response {
	return new Response('Not found', {
		status: 404,
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'Cache-Control': 'public, max-age=86400',
			'X-Robots-Tag': 'noindex, nofollow',
			'X-Content-Type-Options': 'nosniff',
		},
	});
}
