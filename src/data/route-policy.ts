import { tags } from './tags.ts';

// Root/static routes and route prefixes that must never be shadowed by a prompt
// detail slug. Keyword and redirect slugs are added dynamically below.
export const RESERVED_PROMPT_SLUGS = new Set([
	'404', 'about', 'account', 'admin', 'ai-policy', 'api', 'author', 'blog',
	'categories', 'category', 'cdn', 'contact', 'dashboard', 'dev', 'liked',
	'news', 'og', 'p', 'partials', 'pinterest', 'privacy', 'saved', 'sitemap',
	'sitemaps', 'skills', 'submit', 'tags', 'terms', 'tools',
]);

const LANDING_SLUGS = new Set(tags.map((tag) => tag.slug));

export function promptSlugConflict(slug: string): string | undefined {
	if (RESERVED_PROMPT_SLUGS.has(slug)) return 'a reserved site route';
	if (LANDING_SLUGS.has(slug)) return 'a keyword landing or landing redirect';
	return undefined;
}
