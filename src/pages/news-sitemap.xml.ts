import type { APIRoute } from 'astro';
import { getAllPosts } from '../lib/posts';

export const prerender = false;

const SITE = (import.meta.env.SITE ?? 'https://freepromptbase.com').replace(/\/$/, '');

const escapeXml = (value: string): string =>
	value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');

export const GET: APIRoute = async () => {
	const cutoff = Date.now() - 2 * 24 * 60 * 60 * 1000;
	const newsPosts = (await getAllPosts())
		.filter((post) => post.contentType === 'news')
		.filter((post) => new Date(post.publishedAt ?? post.createdAt).getTime() >= cutoff)
		.slice(0, 1000);

	const urls = newsPosts
		.map((post) => {
			const published = new Date(post.publishedAt ?? post.createdAt).toISOString();
			return `  <url>
    <loc>${SITE}/news/${escapeXml(post.slug)}</loc>
    <news:news>
      <news:publication>
        <news:name>Free Prompt Base</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${published}</news:publication_date>
      <news:title>${escapeXml(post.title)}</news:title>
    </news:news>
  </url>`;
		})
		.join('\n');

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls}
</urlset>
`;

	return new Response(body, {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
			'Cache-Control': 'public, max-age=900',
		},
	});
};
