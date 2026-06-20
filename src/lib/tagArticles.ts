// ---------------------------------------------------------------------------
// Editorial articles for the keyword landing pages. One JSON file per keyword
// lives in src/data/tag-articles/<slug>.json (written by the content pass) and
// is bundled at build time via import.meta.glob. Each holds the blog-style
// article body (semantic HTML) plus its FAQ list.
// ---------------------------------------------------------------------------

export interface TagArticle {
	/** Meta description (~155 chars) whose opening uses the main keyword. */
	metaDescription?: string;
	/** Editorial article body as a semantic HTML fragment (h2/p/ul/table/...). */
	bodyHtml: string;
	faqs: { q: string; a: string }[];
}

const modules = import.meta.glob<TagArticle>('../data/tag-articles/*.json', {
	eager: true,
	import: 'default',
});

const bySlug: Record<string, TagArticle> = {};
for (const [path, mod] of Object.entries(modules)) {
	const slug = path.split('/').pop()!.replace(/\.json$/, '');
	bySlug[slug] = mod as TagArticle;
}

/** The written article for a keyword, or undefined when none has been authored. */
export function getTagArticle(slug: string): TagArticle | undefined {
	return bySlug[slug];
}
