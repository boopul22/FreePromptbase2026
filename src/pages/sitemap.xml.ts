import type { APIRoute } from 'astro';
import { getAllPrompts, getAllCategories, getAllTags } from '../lib/prompts';
import { getAllPosts } from '../lib/posts';
import { getActiveAuthorUsernames } from '../lib/users';
import { getDB } from '../lib/db';

// Dynamic sitemap built from D1 so newly added prompts/categories appear
// immediately (no rebuild). Served at /sitemap.xml.
export const prerender = false;

const SITE = (import.meta.env.SITE ?? 'https://freepromptbase.com').replace(/\/$/, '');
const STATIC_PATHS = [
	'/',
	'/categories',
	'/tags',
	'/blog',
	'/news',
	'/tools/gemini-prompt-generator',
	'/about',
	'/contact',
	'/privacy',
	'/terms',
	'/ai-policy',
];

export const GET: APIRoute = async () => {
	const tags = getAllTags();
	const [prompts, categories, posts, pageRows, authors] = await Promise.all([
		getAllPrompts(),
		getAllCategories(),
		getAllPosts(),
		getDB()
			.prepare("SELECT slug, updated_at FROM pages WHERE status = 'published'")
			.all<{ slug: string; updated_at: string }>(),
		getActiveAuthorUsernames(),
	]);

	interface Entry {
		loc: string;
		lastmod?: string;
		images?: Array<{ url: string; title?: string }>;
	}

	// Derive freshness signals from content already loaded (no extra queries):
	// latest prompt/post dates feed the dynamic index pages, and a per-category
	// max date gives each /category/<slug> a real lastmod.
	const day = (s?: string | null) => (s ? s.slice(0, 10) : undefined);
	const maxDay = (a?: string, b?: string) => (!a ? b : !b ? a : a > b ? a : b);
	const latestPromptDate = prompts.reduce<string | undefined>(
		(acc, p) => maxDay(acc, day(p.updatedAt ?? p.date)),
		undefined,
	);
	const latestPostDate = posts.reduce<string | undefined>(
		(acc, p) => maxDay(acc, day(p.publishedAt ?? p.createdAt)),
		undefined,
	);
	const catLastmod = new Map<string, string>();
	for (const p of prompts) {
		const d = day(p.updatedAt ?? p.date);
		if (d) catLastmod.set(p.category, maxDay(catLastmod.get(p.category), d)!);
	}
	// lastmod for the static + index pages: content indexes track the newest item,
	// editorial/legal pages get none (their content rarely changes).
	const staticLastmod: Record<string, string | undefined> = {
		'/': maxDay(latestPromptDate, latestPostDate),
		'/categories': latestPromptDate,
		'/tags': latestPromptDate,
		'/blog': latestPostDate,
		'/news': latestPostDate,
	};

	const entries: Entry[] = [
		...STATIC_PATHS.map((p) => ({ loc: p, lastmod: staticLastmod[p] })),
		...categories.map((c) => ({ loc: `/category/${c.slug}`, lastmod: catLastmod.get(c.slug) })),
		...tags.map((t) => ({ loc: `/${t.slug}` })),
		...prompts.map((p) => {
			const imgs = [...(p.images ?? []), ...(p.coverImage ? [p.coverImage] : [])];
			return {
				loc: `/${p.slug}`,
				lastmod: p.date,
				images: Array.from(new Set(imgs.filter(Boolean))).map((url) => ({ url, title: p.title })),
			};
		}),
		...posts.map((p) => ({
			loc: `/blog/${p.slug}`,
			lastmod: (p.publishedAt ?? p.createdAt).slice(0, 10),
			images: p.coverImage ? [{ url: p.coverImage, title: p.title }] : [],
		})),
		...(pageRows.results ?? []).map((p) => ({
			loc: `/p/${p.slug}`,
			lastmod: p.updated_at.slice(0, 10),
		})),
		...authors.map((u) => ({ loc: `/author/${u}` })),
	];

	const escapeXml = (s: string) =>
		s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

	const body =
		`<?xml version="1.0" encoding="UTF-8"?>\n` +
		`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n` +
		entries
			.map((e) => {
				// Match the page's own canonical exactly: the homepage canonical is
				// `${SITE}/` (with trailing slash), so emit that, not the bare apex.
				const loc = `${SITE}${e.loc === '/' ? '/' : e.loc}`;
				const lastmod = e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : '';
				const images = (e.images ?? [])
					.map((image) => {
						const title = image.title ? `<image:title>${escapeXml(image.title)}</image:title>` : '';
						return `\n    <image:image><image:loc>${escapeXml(image.url)}</image:loc>${title}</image:image>`;
					})
					.join('');
				return `  <url><loc>${loc}</loc>${lastmod}${images}</url>`;
			})
			.join('\n') +
		`\n</urlset>\n`;

	return new Response(body, {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
			'Cache-Control': 'public, max-age=3600',
		},
	});
};
