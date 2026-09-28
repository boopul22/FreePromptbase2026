/**
 * Blog posts permanently removed from the site (Sept 2026 spam-update cleanup).
 *
 * These 30 posts were built by scripts/build-aura-blog-drafts.py and
 * scripts/publish-aura-blog-batch.py from another site's articles, with the
 * author swapped and an unverified first-person testing intro. They are not
 * original work, so they are removed rather than rewritten.
 *
 * The list is enforced in code so the removal holds even while the D1 rows are
 * still marked published:
 *   - /blog/<slug> and /news/<slug> answer HTTP 410 + X-Robots-Tag: noindex
 *     (middleware, before the edge cache or any D1 work)
 *   - every public post query in src/lib/cms.ts excludes them (blog index,
 *     related posts, editorial/core sitemaps, RSS, news sitemap, OG images)
 *   - comments cannot resolve to them
 *
 * Matching D1 cleanup: db/migrations/0029-unpublish-aura-posts.sql (run by hand).
 */
export const REMOVED_POST_SLUGS: readonly string[] = [
	'viral-gemini-prompts-for-men-instagram-editorial',
	'instagram-boy-photo-editing-prompts-copy-paste',
	'couple-chatgpt-photo-editing-prompts-instagram-2026',
	'viral-ai-photo-editing-prompts-for-girls-bardot',
	'girls-gemini-ai-college-photo-prompts',
	'college-boy-stylish-gemini-photo-editing-prompts',
	'gemini-romantic-couple-ai-photo-prompts',
	'gemini-luxury-yacht-ai-photo-prompts-for-boys',
	'retro-girl-in-saree-gemini-ai-photo-prompts',
	'indian-couple-gemini-ai-photo-prompt-saree-look',
	'south-indian-girl-ai-photo-prompt-saree',
	'mahadev-shivling-ai-photo-editing-prompts',
	'viral-photo-editing-prompt-for-boys-gemini-2026',
	'gemini-horse-lover-ai-photo-editing-prompts',
	'gemini-boys-car-ai-photo-prompts',
	'luxury-lehenga-gemini-ai-prompts',
	'foggy-forest-ai-photo-editing-prompts',
	'gemini-2x2-grid-collage-prompt',
	'kurti-and-denim-jeans-gemini-prompt',
	'best-friend-photo-prompt-gemini-ai-girls',
	'gemini-ai-mirror-selfie-prompt-boys',
	'bullet-bike-ai-photo-editing-prompt-for-boys',
	'gemini-ai-airport-look-prompts-for-boys',
	'gemini-ai-dandiya-garba-looks-prompts',
	'eid-mubarak-ai-photo-prompts-for-boys',
	'gemini-ai-gym-girl-prompt',
	'kashmir-ice-mountains-ai-photo-editing-prompts',
	'wedding-ai-photo-prompt-indian-couple-gemini',
	'gemini-cinematic-studio-portrait-prompt-boys',
	'chatgpt-prompts-for-night-photos-indian-boy',
];

/** D1 post ids written by publish-aura-blog-batch.py all start with this. */
export const REMOVED_POST_ID_PREFIX = 'blog-aura-';

const REMOVED_SET = new Set(REMOVED_POST_SLUGS);

export function isRemovedPostSlug(slug: string | null | undefined): boolean {
	if (!slug) return false;
	return REMOVED_SET.has(slug.toLowerCase().replace(/\/+$/, ''));
}

/** Slug of a removed post if `pathname` is /blog/<slug> or /news/<slug>, else null. */
export function removedPostSlugForPath(pathname: string): string | null {
	const m = /^\/(?:blog|news)\/([^/]+)\/?$/i.exec(pathname);
	if (!m) return null;
	let slug = m[1];
	try {
		slug = decodeURIComponent(slug);
	} catch {
		// keep the raw segment
	}
	slug = slug.toLowerCase();
	return REMOVED_SET.has(slug) ? slug : null;
}

/**
 * SQL guard for public post queries. The slugs are fixed literals from this
 * file (lowercase letters, digits, hyphens), so inlining them is safe.
 * `alias` is the posts table alias ('p'), or '' for an unaliased table.
 */
export function notRemovedPostSql(alias = 'p'): string {
	const col = (name: string) => (alias ? `${alias}.${name}` : name);
	const list = REMOVED_POST_SLUGS.map((s) => `'${s}'`).join(', ');
	return `(${col('slug')} NOT IN (${list}) AND ${col('id')} NOT LIKE '${REMOVED_POST_ID_PREFIX}%')`;
}

const GONE_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Page removed | Free Prompt Base</title>
</head>
<body style="font-family:system-ui,sans-serif;max-width:40rem;margin:4rem auto;padding:0 1rem;line-height:1.5">
<h1>This page has been removed</h1>
<p>This article is no longer on Free Prompt Base.</p>
<p><a href="/blog">Browse the blog</a> or <a href="/">find prompts on the home page</a>.</p>
</body>
</html>
`;

/** HTTP 410 Gone for a removed post. No Astro render, no D1. */
export function removedPostGoneResponse(): Response {
	return new Response(GONE_HTML, {
		status: 410,
		headers: {
			'Content-Type': 'text/html; charset=utf-8',
			'Cache-Control': 'public, max-age=86400',
			'X-Robots-Tag': 'noindex, nofollow',
			'X-Content-Type-Options': 'nosniff',
		},
	});
}
