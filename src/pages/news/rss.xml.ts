import type { APIRoute } from 'astro';
import { getAllPosts } from '../../lib/posts';

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
	const posts = (await getAllPosts()).filter((post) => post.contentType === 'news');
	const lastBuild = posts.length > 0
		? new Date(posts[0].updatedAt ?? posts[0].publishedAt ?? posts[0].createdAt).toUTCString()
		: new Date().toUTCString();

	const items = posts
		.map((post) => {
			const link = `${SITE}/news/${post.slug}`;
			const pubDate = new Date(post.publishedAt ?? post.createdAt).toUTCString();
			return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(post.excerpt)}</description>
      <category>AI News</category>
    </item>`;
		})
		.join('\n');

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Free Prompt Base — AI News</title>
    <link>${SITE}/news</link>
    <atom:link href="${SITE}/news/rss.xml" rel="self" type="application/rss+xml" />
    <description>Short, independently written reports on important AI tools and product changes.</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
${items}
  </channel>
</rss>`;

	return new Response(body, {
		headers: {
			'Content-Type': 'application/rss+xml; charset=utf-8',
			'Cache-Control': 'public, max-age=900',
		},
	});
};
