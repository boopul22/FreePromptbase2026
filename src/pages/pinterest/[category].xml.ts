import type { APIRoute } from 'astro';
import { getCategoryBySlug, getPromptsByCategory } from '../../lib/prompts';
import { buildPinterestFeed, FEED_SITE } from '../../lib/pinterestFeed';

// Per-category Pinterest feed at /pinterest/<category>.xml — one feed per
// category so each can be mapped to its OWN Pinterest board (the "connect
// different RSS" setup: e.g. /pinterest/midjourney.xml → "Midjourney Prompts"
// board, /pinterest/chatgpt.xml → "ChatGPT Prompts" board). Add each in
// Pinterest → Bulk create Pins → Add an RSS feed, and pick the target board.
export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
	const slug = params.category!;
	const category = await getCategoryBySlug(slug);
	if (!category) {
		return new Response('Not found', { status: 404 });
	}

	const prompts = await getPromptsByCategory(slug);
	return buildPinterestFeed(prompts, {
		title: `Free Prompt Base — ${category.name}`,
		description: category.description,
		link: `${FEED_SITE}/category/${slug}`,
		selfUrl: `${FEED_SITE}/pinterest/${slug}.xml`,
	});
};
