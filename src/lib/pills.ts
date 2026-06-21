// Soft multi-colour pill classes, paired with the `.pill` base in global.css.
// Deterministic per seed so a category/tag keeps the same colour across renders
// (and adjacent items stay visually distinct). Used by category headers, the
// keyword landing pages, and the prompt detail breadcrumb/related rails.
export const PILL_COLORS = [
	'pill-gold',
	'pill-clay',
	'pill-rose',
	'pill-sage',
	'pill-teal',
	'pill-slate',
] as const;

export function pillColor(seed: string): string {
	let h = 0;
	for (const c of seed) h = (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0;
	return PILL_COLORS[h % PILL_COLORS.length];
}
