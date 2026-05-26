import type { APIRoute } from 'astro';
import { getAllPrompts, getAllCategories } from '../lib/prompts';
import { getAllPosts } from '../lib/posts';
import { getDB } from '../lib/db';

// Dynamic sitemap built from D1 so newly added prompts/categories appear
// immediately (no rebuild). Served at /sitemap.xml.
export const prerender = false;

const SITE = 'https://freepromptbase.com';
const STATIC_PATHS = ['/', '/categories', '/blog', '/about', '/privacy', '/terms'];

export const GET: APIRoute = async () => {
	const [prompts, categories, posts, pageRows] = await Promise.all([
		getAllPrompts(),
		getAllCategories(),
		getAllPosts(),
		getDB()
			.prepare("SELECT slug, updated_at FROM pages WHERE status = 'published'")
			.all<{ slug: string; updated_at: string }>(),
	]);

	const entries: { loc: string; lastmod?: string }[] = [
		...STATIC_PATHS.map((p) => ({ loc: p })),
		...categories.map((c) => ({ loc: `/category/${c.slug}` })),
		...prompts.map((p) => ({ loc: `/${p.slug}`, lastmod: p.date })),
		...posts.map((p) => ({
			loc: `/blog/${p.slug}`,
			lastmod: (p.publishedAt ?? p.createdAt).slice(0, 10),
		})),
		...(pageRows.results ?? []).map((p) => ({
			loc: `/p/${p.slug}`,
			lastmod: p.updated_at.slice(0, 10),
		})),
	];

	const body =
		`<?xml version="1.0" encoding="UTF-8"?>\n` +
		`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
		entries
			.map((e) => {
				const loc = `${SITE}${e.loc === '/' ? '' : e.loc}`;
				const lastmod = e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : '';
				return `  <url><loc>${loc}</loc>${lastmod}</url>`;
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
