import type { APIRoute } from 'astro';
import { getAllPosts } from '../../lib/posts';

// RSS 2.0 feed for the blog. Generated dynamically from D1 so new posts appear
// without a rebuild. Linked from <head> via Layout.astro's rel="alternate".
export const prerender = false;

const SITE = (import.meta.env.SITE ?? 'https://freepromptbase.com').replace(/\/$/, '');

const escapeXml = (s: string): string =>
	s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');

export const GET: APIRoute = async () => {
	const posts = await getAllPosts();

	const lastBuild = posts.length > 0
		? new Date(posts[0].publishedAt ?? posts[0].createdAt).toUTCString()
		: new Date().toUTCString();

	const items = posts
		.map((p) => {
			const link = `${SITE}/blog/${p.slug}`;
			const pubDate = new Date(p.publishedAt ?? p.createdAt).toUTCString();
			return `    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(p.excerpt)}</description>
    </item>`;
		})
		.join('\n');

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Free Prompt Base — Blog</title>
    <link>${SITE}/blog</link>
    <atom:link href="${SITE}/blog/rss.xml" rel="self" type="application/rss+xml" />
    <description>Field notes on prompt engineering, AI tooling, and getting more out of ChatGPT, Claude, Midjourney and Gemini.</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
${items}
  </channel>
</rss>`;

	return new Response(body, {
		headers: {
			'Content-Type': 'application/rss+xml; charset=utf-8',
			'Cache-Control': 'public, max-age=3600',
		},
	});
};
