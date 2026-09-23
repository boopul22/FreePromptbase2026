import { legacyEditorialTarget } from './legacy-redirects.ts';
import { tagCanonicalTarget } from './tag-seo.ts';

/**
 * Resolve redirects that must run before Astro normalizes trailing slashes.
 * Keeping this pure makes the one-hop behavior testable without a Worker.
 */
export function earlyRedirectTarget(pathname: string): string | undefined {
	const legacyTarget = legacyEditorialTarget(pathname);
	if (legacyTarget) return legacyTarget;

	const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
	if (normalized.startsWith('/tag/')) {
		const slug = normalized.slice('/tag/'.length).toLowerCase();
		if (slug && !slug.includes('/')) return `/${tagCanonicalTarget(slug) ?? slug}`;
		return undefined;
	}

	const slug = normalized.slice(1).toLowerCase();
	if (!slug || slug.includes('/')) return undefined;
	const target = tagCanonicalTarget(slug);
	return target ? `/${target}` : undefined;
}
