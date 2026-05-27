// ---------------------------------------------------------------------------
// SEO/Schema.org helpers. Page-level Astro files build their main entity
// schema inline (CreativeWork, BlogPosting); these helpers cover the
// supporting types that benefit every page of the same shape.
// ---------------------------------------------------------------------------

const SITE_URL = 'https://freepromptbase.com';
const SITE_NAME = 'Free Prompt Base';

export interface Crumb {
	name: string;
	path: string; // root-relative
}

/** Build a BreadcrumbList JSON-LD block from an ordered crumb array. */
export function breadcrumbSchema(crumbs: Crumb[]): Record<string, unknown> {
	return {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: crumbs.map((c, i) => ({
			'@type': 'ListItem',
			position: i + 1,
			name: c.name,
			item: `${SITE_URL}${c.path === '/' ? '' : c.path}` || SITE_URL,
		})),
	};
}

/** Build an ItemList JSON-LD block for collection / index pages. */
export function itemListSchema(
	items: { name: string; url: string }[],
	listName?: string,
): Record<string, unknown> {
	return {
		'@context': 'https://schema.org',
		'@type': 'ItemList',
		...(listName ? { name: listName } : {}),
		itemListElement: items.map((it, i) => ({
			'@type': 'ListItem',
			position: i + 1,
			name: it.name,
			url: it.url.startsWith('http') ? it.url : `${SITE_URL}${it.url}`,
		})),
	};
}

/** Reusable publisher block for BlogPosting / Article schemas. */
export function publisherBlock() {
	return {
		'@type': 'Organization',
		name: SITE_NAME,
		logo: {
			'@type': 'ImageObject',
			url: `${SITE_URL}/logo.svg`,
		},
	};
}
