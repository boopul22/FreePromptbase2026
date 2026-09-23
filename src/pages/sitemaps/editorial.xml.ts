import type { APIRoute } from 'astro';
import { getAllPosts } from '../../lib/posts';
import { getDB } from '../../lib/db';
import { materialLastmod, renderUrlset, sitemapResponse } from '../../lib/sitemap';

export const prerender = false;

export const GET: APIRoute = async () => {
	const [posts, pages] = await Promise.all([
		getAllPosts(),
		getDB().prepare(
			"SELECT slug, created_at, updated_at FROM pages WHERE status = 'published'",
		).all<{ slug: string; created_at: string; updated_at: string }>(),
	]);
	const guideLastmod = materialLastmod(posts
		.filter((post) => post.contentType === 'guide')
		.flatMap((post) => [post.publishedAt, post.createdAt, post.updatedAt]));
	const newsLastmod = materialLastmod(posts
		.filter((post) => post.contentType === 'news')
		.flatMap((post) => [post.publishedAt, post.createdAt, post.updatedAt]));
	const entries = [
		{ loc: '/blog', lastmod: guideLastmod },
		{ loc: '/news', lastmod: newsLastmod },
		...posts.map((post) => ({
			loc: `/${post.contentType === 'news' ? 'news' : 'blog'}/${post.slug}`,
			lastmod: materialLastmod([post.publishedAt, post.createdAt, post.updatedAt]),
			images: post.coverImage ? [{ url: post.coverImage, title: post.title }] : [],
		})),
		...(pages.results ?? []).map((page) => ({
			loc: `/p/${page.slug}`,
			lastmod: materialLastmod([page.created_at, page.updated_at]),
		})),
	];
	return sitemapResponse(renderUrlset(entries));
};
