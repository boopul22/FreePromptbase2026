export const SITEMAP_SITE = 'https://freepromptbase.com';

export interface SitemapImage {
	url: string;
	title?: string;
}

export interface SitemapEntry {
	loc: string;
	lastmod?: string;
	images?: SitemapImage[];
}

export function escapeXml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

function utcDay(now: Date): string {
	return now.toISOString().slice(0, 10);
}

/** Return a valid day, clamped to today; untrustworthy input is omitted. */
export function trustworthyDay(value?: string | null, now = new Date()): string | undefined {
	if (!value) return undefined;
	const day = value.slice(0, 10);
	if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return undefined;
	const parsed = new Date(`${day}T00:00:00Z`);
	if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== day) return undefined;
	return day > utcDay(now) ? utcDay(now) : day;
}

/** Later of publication/creation/update dates after validation and clamping. */
export function materialLastmod(
	values: Array<string | null | undefined>,
	now = new Date(),
): string | undefined {
	return values
		.map((value) => trustworthyDay(value, now))
		.filter((value): value is string => Boolean(value))
		.reduce<string | undefined>((latest, value) => (!latest || value > latest ? value : latest), undefined);
}

function absoluteUrl(value: string, site: string): string {
	if (/^https?:\/\//i.test(value)) return value;
	return `${site}${value.startsWith('/') ? value : `/${value}`}`;
}

export function renderUrlset(entries: SitemapEntry[], site = SITEMAP_SITE, now = new Date()): string {
	const seen = new Set<string>();
	for (const entry of entries) {
		if (/[?#]/.test(entry.loc)) throw new Error(`Sitemap URL cannot contain a query or fragment: ${entry.loc}`);
		const loc = absoluteUrl(entry.loc, site);
		if (seen.has(loc)) throw new Error(`Duplicate sitemap URL: ${loc}`);
		seen.add(loc);
	}
	const body = entries.map((entry) => {
		const loc = absoluteUrl(entry.loc, site);
		const lastmod = trustworthyDay(entry.lastmod, now);
		const images = (entry.images ?? []).map((item) => {
			const title = item.title ? `<image:title>${escapeXml(item.title)}</image:title>` : '';
			return `\n    <image:image><image:loc>${escapeXml(absoluteUrl(item.url, site))}</image:loc>${title}</image:image>`;
		}).join('');
		return `  <url><loc>${escapeXml(loc)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}${images}</url>`;
	}).join('\n');
	return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${body}\n</urlset>\n`;
}

export function renderSitemapIndex(paths: string[], site = SITEMAP_SITE): string {
	const body = paths.map((path) =>
		`  <sitemap><loc>${escapeXml(absoluteUrl(path, site))}</loc></sitemap>`,
	).join('\n');
	return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>\n`;
}

export function sitemapResponse(body: string): Response {
	return new Response(body, {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
			'Cache-Control': 'public, max-age=3600',
		},
	});
}
