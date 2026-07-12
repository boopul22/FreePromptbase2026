// Manual AdSense ad units. The page-level loader lives in Layout.astro; each
// placement below maps to an ad unit created in the AdSense dashboard
// (Ads → By ad unit, names prefixed "FPB - "). Slot IDs are public — they ship
// in the HTML anyway — so they live in code, not secrets.
//
// A placement with an empty `slot` renders nothing, and ADS_ENABLED=false pulls
// every ad from the site in one deploy (kill switch).

export const ADS_ENABLED = true;

export const AD_CLIENT = 'ca-pub-7803867089582138';

export type AdPlacement =
	| 'copy-gate'
	| 'prompt-above-related'
	| 'infeed-card'
	| 'tag-article-mid'
	| 'tag-after-faq'
	| 'blog-article-mid'
	| 'blog-end';

export interface AdSlotConfig {
	slot: string;
	format: 'display' | 'in-article' | 'in-feed';
	/** AdSense-generated layout key — in-feed units only. */
	layoutKey?: string;
	/** Reserved height (px) so a filling ad doesn't shift the content below it. */
	minHeight: number;
}

export const AD_SLOTS: Record<AdPlacement, AdSlotConfig> = {
	// Shown inside the copy-gate unlock panel while the countdown runs (and it
	// stays after unlock). This is the only ad in the prompt column — it
	// replaced the always-on prompt-above-copy display unit.
	'copy-gate': { slot: '6138440036', format: 'display', minHeight: 250 },
	'prompt-above-related': { slot: '7689637921', format: 'display', minHeight: 100 },
	'infeed-card': { slot: '9681376442', format: 'in-feed', layoutKey: '-6t+ed+2i-1n-4w', minHeight: 320 },
	'tag-article-mid': { slot: '5731321905', format: 'in-article', minHeight: 250 },
	'tag-after-faq': { slot: '1650843185', format: 'display', minHeight: 280 },
	'blog-article-mid': { slot: '7501935661', format: 'in-article', minHeight: 250 },
	'blog-end': { slot: '4818685166', format: 'display', minHeight: 280 },
};

/**
 * Split `html` immediately before its Nth `<h2` (1-based) so an ad can sit
 * between article sections. Returns null when the article has fewer than
 * n + 1 h2 headings — too short to interrupt — and the caller renders the
 * body unsplit.
 */
export function splitAtNthH2(html: string, n: number): [string, string] | null {
	const positions: number[] = [];
	const re = /<h2[\s>]/gi;
	let m: RegExpExecArray | null;
	while ((m = re.exec(html)) !== null) positions.push(m.index);
	if (positions.length < n + 1) return null;
	const at = positions[n - 1];
	return [html.slice(0, at), html.slice(at)];
}
