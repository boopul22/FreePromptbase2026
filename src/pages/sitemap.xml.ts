import type { APIRoute } from 'astro';
import { getAllPrompts, getAllCategories } from '../lib/prompts';

// Dynamic sitemap built from D1 so newly added prompts/categories appear
// immediately (no rebuild). Served at /sitemap.xml.
export const prerender = false;

const SITE = 'https://freepromptbase.com';
const STATIC_PATHS = ['/', '/categories', '/about', '/privacy', '/terms'];

export const GET: APIRoute = async () => {
	const [prompts, categories] = await Promise.all([getAllPrompts(), getAllCategories()]);

	const entries: { loc: string; lastmod?: string }[] = [
		...STATIC_PATHS.map((p) => ({ loc: p })),
		...categories.map((c) => ({ loc: `/category/${c.slug}` })),
		...prompts.map((p) => ({ loc: `/${p.slug}`, lastmod: p.date })),
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
