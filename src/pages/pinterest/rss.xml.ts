import type { APIRoute } from 'astro';
import { getAllPrompts } from '../../lib/prompts';
import { buildPinterestFeed, FEED_SITE } from '../../lib/pinterestFeed';

// Master Pinterest feed — every approved prompt with an image. Map this to your
// main board in Pinterest's "Bulk create Pins → Add an RSS feed".
// Lives in D1 (prerender=false) so new prompts appear without a rebuild and get
// auto-pinned on Pinterest's next poll. No cron needed.
export const prerender = false;

export const GET: APIRoute = async () => {
	const prompts = await getAllPrompts();
	return buildPinterestFeed(prompts, {
		title: 'Free Prompt Base — Prompts',
		description: 'Fresh AI prompts for ChatGPT, Claude, Midjourney, Gemini and more.',
		link: `${FEED_SITE}/`,
		selfUrl: `${FEED_SITE}/pinterest/rss.xml`,
	});
};
