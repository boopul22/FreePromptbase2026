import type { APIRoute } from 'astro';
import { getPromptBySlug, getCategoryBySlug } from '../../lib/prompts';
import { getPostBySlug } from '../../lib/posts';

// Dynamic Open Graph card. Returns a 1200x630 branded SVG per prompt/post slug
// so social previews always show the page title instead of /og-default.png.
// Twitter/X doesn't render SVG OG images; pages with a real cover image keep
// using that cover. This endpoint is the fallback for coverless content.
export const prerender = false;

const W = 1200;
const H = 630;
const GOLD = '#e0a82e';
const INK = '#1a1a1a';
const MUTED = '#6b6b6b';

const escapeXml = (s: string): string =>
	s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');

// Greedy word wrap into N lines, each <= maxChars. Truncates with an ellipsis
// on the final line if the title is longer than maxLines * maxChars.
function wrap(text: string, maxChars: number, maxLines: number): string[] {
	const words = text.split(/\s+/);
	const lines: string[] = [];
	let cur = '';
	for (const w of words) {
		const candidate = cur ? `${cur} ${w}` : w;
		if (candidate.length <= maxChars) {
			cur = candidate;
		} else {
			if (cur) lines.push(cur);
			cur = w;
			if (lines.length === maxLines - 1) break;
		}
	}
	if (cur && lines.length < maxLines) lines.push(cur);
	if (lines.length === maxLines) {
		// If there's leftover content, ellipsize the last line.
		const consumed = lines.join(' ').length;
		if (consumed < text.length) {
			let last = lines[maxLines - 1];
			while (last.length > 0 && last.length + 1 > maxChars - 1) last = last.slice(0, -1);
			lines[maxLines - 1] = `${last.trimEnd()}…`;
		}
	}
	return lines;
}

export const GET: APIRoute = async ({ params }) => {
	const slug = params.slug;
	if (!slug) return new Response('Not found', { status: 404 });

	let title = '';
	let chip = '';

	const prompt = await getPromptBySlug(slug);
	if (prompt) {
		title = prompt.title;
		const cat = await getCategoryBySlug(prompt.category);
		chip = cat?.name ?? 'Prompt';
	} else {
		const post = await getPostBySlug(slug);
		if (post) {
			title = post.title;
			chip = 'Blog';
		}
	}

	if (!title) {
		return new Response('Not found', { status: 404 });
	}

	const titleLines = wrap(title, 28, 3);
	const lineHeight = 86;
	const titleStartY = H / 2 - ((titleLines.length - 1) * lineHeight) / 2 + 10;

	const titleTspans = titleLines
		.map(
			(ln, i) =>
				`<tspan x="80" y="${titleStartY + i * lineHeight}">${escapeXml(ln)}</tspan>`,
		)
		.join('');

	const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff5d6"/>
      <stop offset="1" stop-color="#ffe49a"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect x="40" y="40" width="${W - 80}" height="${H - 80}" rx="28" fill="#ffffff"/>
  <rect x="40" y="40" width="${W - 80}" height="8" rx="4" fill="${GOLD}"/>

  <text x="80" y="120" font-family="system-ui, -apple-system, 'Segoe UI', Rubik, sans-serif" font-size="26" font-weight="700" fill="${GOLD}" letter-spacing="2">
    FREE PROMPT BASE
  </text>

  <g transform="translate(80, 160)">
    <rect width="${chip.length * 14 + 36}" height="40" rx="20" fill="${GOLD}" fill-opacity="0.15"/>
    <text x="${(chip.length * 14 + 36) / 2}" y="26" font-family="system-ui, -apple-system, 'Segoe UI', Rubik, sans-serif" font-size="18" font-weight="600" fill="${GOLD}" text-anchor="middle">${escapeXml(chip)}</text>
  </g>

  <text font-family="system-ui, -apple-system, 'Segoe UI', Rubik, sans-serif" font-size="72" font-weight="800" fill="${INK}" letter-spacing="-1">
    ${titleTspans}
  </text>

  <text x="80" y="${H - 80}" font-family="system-ui, -apple-system, 'Segoe UI', Rubik, sans-serif" font-size="22" font-weight="500" fill="${MUTED}">
    freepromptbase.com
  </text>
  <text x="${W - 80}" y="${H - 80}" font-family="system-ui, -apple-system, 'Segoe UI', Rubik, sans-serif" font-size="22" font-weight="600" fill="${INK}" text-anchor="end">
    Copy. Use. Create.
  </text>
</svg>`;

	return new Response(svg, {
		headers: {
			'Content-Type': 'image/svg+xml; charset=utf-8',
			'Cache-Control': 'public, max-age=3600, s-maxage=86400',
		},
	});
};
