// Pinterest-ready RSS 2.0 feed builder for prompts.
//
// Pinterest's "Bulk create Pins from RSS" (Business hub → Bulk create Pins →
// Add an RSS feed) polls a feed every few hours and turns each new <item> into
// a Pin. The hard requirement most feeds miss: every item MUST carry a real
// image URL in <media:content> — an item with no image is silently skipped,
// because Pinterest is image-first. So this builder DROPS image-less prompts
// and always emits an absolute, crawlable image URL.
//
// Prereq: the domain must be CLAIMED on the Pinterest account before the feed
// does anything. Claiming is account/DNS-level, not a file on the site.

import { cfImg } from './cfImage';
import type { Prompt } from './prompts';

const SITE = (import.meta.env.SITE ?? 'https://freepromptbase.com').replace(/\/$/, '');

const escapeXml = (s: string): string =>
	s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');

/** Best Pin image for a prompt: cover, else first carousel image. */
function pinImage(p: Prompt): string | undefined {
	return p.coverImage ?? (p.images && p.images.length > 0 ? p.images[0] : undefined);
}

/**
 * Absolute, Pinterest-fetchable image URL. Our media is stored as `/cdn/<key>`
 * paths; we run them through Cloudflare Image Transformations at ~1000px (the
 * size Pinterest recommends for a crisp Pin) and prefix the origin. External
 * URLs (rare, from submissions) are passed through, made absolute if needed.
 */
function absImage(src: string): string {
	if (/^https?:\/\//i.test(src)) return src;
	const transformed = cfImg(src, 1000); // returns a /cdn-cgi/... path for our media, else src
	return `${SITE}${transformed.startsWith('/') ? '' : '/'}${transformed}`;
}

function itemXml(p: Prompt): string | null {
	const img = pinImage(p);
	if (!img) return null; // no image → Pinterest would skip it → drop it outright
	const imageUrl = absImage(img);
	const link = `${SITE}/${p.slug}`;
	const pubDate = new Date(p.date).toUTCString();
	return `    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(p.description)}</description>
      <media:content url="${escapeXml(imageUrl)}" medium="image" />
      <enclosure url="${escapeXml(imageUrl)}" type="image/jpeg" />
    </item>`;
}

interface FeedMeta {
	title: string;
	description: string;
	/** Public URL of this feed (for the atom:self link), absolute. */
	selfUrl: string;
	/** Page the feed represents (channel <link>), absolute. */
	link: string;
}

/** Build a complete RSS document from prompts + channel metadata. */
export function buildPinterestFeed(prompts: Prompt[], meta: FeedMeta): Response {
	const items = prompts.map(itemXml).filter((x): x is string => x !== null);

	const lastBuild = prompts.length > 0 ? new Date(prompts[0].date).toUTCString() : new Date().toUTCString();

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${escapeXml(meta.title)}</title>
    <link>${meta.link}</link>
    <atom:link href="${meta.selfUrl}" rel="self" type="application/rss+xml" />
    <description>${escapeXml(meta.description)}</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
${items.join('\n')}
  </channel>
</rss>`;

	return new Response(body, {
		headers: {
			'Content-Type': 'application/rss+xml; charset=utf-8',
			'Cache-Control': 'public, max-age=3600',
		},
	});
}

export { SITE as FEED_SITE };
