import type { APIRoute } from 'astro';
import { getAllPrompts } from '../../lib/prompts';
import { materialLastmod, renderUrlset, sitemapResponse } from '../../lib/sitemap';

export const prerender = false;

export const GET: APIRoute = async () => {
	const prompts = await getAllPrompts();
	const entries = prompts.map((prompt) => ({
		loc: `/${prompt.slug}`,
		lastmod: materialLastmod([prompt.date, prompt.updatedAt]),
		images: Array.from(new Set([
			...(prompt.images ?? []),
			...(prompt.coverImage ? [prompt.coverImage] : []),
		])).map((url) => ({ url, title: prompt.title })),
	}));
	return sitemapResponse(renderUrlset(entries));
};
