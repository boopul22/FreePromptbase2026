import type { APIRoute } from 'astro';
import { getAllPrompts, getAllCategories } from '../lib/prompts';
import { getAllPosts } from '../lib/posts';
import { getActiveAuthorUsernames } from '../lib/users';
import { getDB } from '../lib/db';

// Dynamic sitemap built from D1 so newly added prompts/categories appear
// immediately (no rebuild). Served at /sitemap.xml.
export const prerender = false;

const SITE = (import.meta.env.SITE ?? 'https://freepromptbase.com').replace(/\/$/, '');
const STATIC_PATHS = ['/', '/categories', '/blog', '/about', '/privacy', '/terms'];

export const GET: APIRoute = async () => {
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
		images?: string[];
	}

	const entries: Entry[] = [
		...STATIC_PATHS.map((p) => ({ loc: p })),
		...categories.map((c) => ({ loc: `/category/${c.slug}` })),
		...prompts.map((p) => {
			const imgs = [...(p.images ?? []), ...(p.coverImage ? [p.coverImage] : [])];
			return {
				loc: `/${p.slug}`,
				lastmod: p.date,
				images: Array.from(new Set(imgs.filter(Boolean))),
			};
		}),
		...posts.map((p) => ({
			loc: `/blog/${p.slug}`,
			lastmod: (p.publishedAt ?? p.createdAt).slice(0, 10),
			images: p.coverImage ? [p.coverImage] : [],
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
		`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemaps-image/1.1">\n` +
		entries
			.map((e) => {
				const loc = `${SITE}${e.loc === '/' ? '' : e.loc}`;
				const lastmod = e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : '';
				const images = (e.images ?? [])
					.map((u) => `\n    <image:image><image:loc>${escapeXml(u)}</image:loc></image:image>`)
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
