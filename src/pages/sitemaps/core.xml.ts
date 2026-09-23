import type { APIRoute } from 'astro';
import {
	getAllCategories,
	getAllPrompts,
	getAllTags,
	getLandingMembershipStats,
} from '../../lib/prompts';
import { getAllPosts } from '../../lib/posts';
import { getActiveAuthorUsernames } from '../../lib/users';
import { getLandingPolicy, isTagIndexable } from '../../data/tag-seo';
import { materialLastmod, renderUrlset, sitemapResponse } from '../../lib/sitemap';

export const prerender = false;

const STATIC_PATHS = [
	'/',
	'/categories',
	'/tags',
	'/skills',
	'/tools/gemini-prompt-generator',
	'/about',
	'/contact',
	'/privacy',
	'/terms',
	'/ai-policy',
];

export const GET: APIRoute = async () => {
	const [prompts, categories, posts, authors, membershipStats] = await Promise.all([
		getAllPrompts(),
		getAllCategories(),
		getAllPosts(),
		getActiveAuthorUsernames(),
		getLandingMembershipStats(),
	]);
	const latestPrompt = materialLastmod(prompts.flatMap((prompt) => [prompt.date, prompt.updatedAt]));
	const latestEditorial = materialLastmod(posts.flatMap(
		(post) => [post.publishedAt, post.createdAt, post.updatedAt],
	));
	const categoryLastmod = new Map<string, string>();
	for (const prompt of prompts) {
		const date = materialLastmod([prompt.date, prompt.updatedAt]);
		const previous = categoryLastmod.get(prompt.category);
		if (date && (!previous || date > previous)) categoryLastmod.set(prompt.category, date);
	}
	const promptSlugs = new Set(prompts.map((prompt) => prompt.slug));
	const landingEntries = getAllTags()
		.filter((tag) => isTagIndexable(tag.slug) && !promptSlugs.has(tag.slug))
		.filter((tag) => {
			const policy = getLandingPolicy(tag.slug);
			return (membershipStats[tag.slug]?.count ?? 0) >= (policy.minimumPrompts ?? Number.POSITIVE_INFINITY);
		})
		.map((tag) => {
			const policy = getLandingPolicy(tag.slug);
			return {
				loc: `/${tag.slug}`,
				lastmod: materialLastmod([policy.contentUpdatedAt, membershipStats[tag.slug]?.lastmod]),
			};
		});
	const staticLastmod: Record<string, string | undefined> = {
		'/': materialLastmod([latestPrompt, latestEditorial]),
		'/categories': latestPrompt,
		'/tags': materialLastmod(landingEntries.map((entry) => entry.lastmod)),
		'/skills': latestPrompt,
	};
	const entries = [
		...STATIC_PATHS.map((loc) => ({ loc, lastmod: staticLastmod[loc] })),
		...categories.map((category) => ({
			loc: `/category/${category.slug}`,
			lastmod: categoryLastmod.get(category.slug),
		})),
		...landingEntries,
		...authors.map((username) => ({ loc: `/author/${username}` })),
	];
	return sitemapResponse(renderUrlset(entries));
};
