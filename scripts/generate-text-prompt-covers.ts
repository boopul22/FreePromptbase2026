/**
 * Generate compact, unique WebP title cards for every live text prompt without
 * a cover. The cards are intentionally template-driven: an illustration for
 * every prompt would be slow, inconsistent, and misleading for text-only work.
 *
 * Run: npm run assets:generate-text-covers
 * Then: npm run assets:upload-text-covers && npm run db:backfill-text-covers
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';

const OUTPUT_DIR = resolve('tmp/text-prompt-covers');
const WIDTH = 1200;
const HEIGHT = 630;

interface PromptRow {
	slug: string;
	title: string;
	description: string;
	tags: string;
}

interface D1Result {
	results: PromptRow[];
	success: boolean;
}

interface CoverRecord extends PromptRow {
	file: string;
	key: string;
	url: string;
	alt: string;
}

function escapeXml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

// Sharp renders the SVG through Pango. A few imported titles include emoji or
// rare glyphs that are not available in the deployment font set, so keep the
// image typography deliberately portable while preserving the full title in
// the page heading, alt text, and structured data.
function displayText(value: string): string {
	return value
		.normalize('NFKD')
		.replace(/[^\x20-\x7E]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

function hash(value: string): number {
	let result = 2166136261;
	for (let i = 0; i < value.length; i += 1) {
		result ^= value.charCodeAt(i);
		result = Math.imul(result, 16777619);
	}
	return result >>> 0;
}

function wrapTitle(title: string, maxChars = 27): string[] {
	const words = title.trim().split(/\s+/);
	const lines: string[] = [];
	let line = '';
	for (const word of words) {
		const next = line ? `${line} ${word}` : word;
		if (next.length > maxChars && line) {
			lines.push(line);
			line = word;
		} else {
			line = next;
		}
	}
	if (line) lines.push(line);
	if (lines.length <= 3) return lines;
	return [...lines.slice(0, 2), `${lines.slice(2).join(' ').slice(0, maxChars - 1).trim()}…`];
}

function primaryTopic(tagsJson: string): string {
	try {
		const tags = JSON.parse(tagsJson) as string[];
		return tags.find((tag) => !['text prompt', 'chatgpt', 'gemini', 'claude', 'open source', 'prompts.chat'].includes(tag)) ?? 'AI prompt';
	} catch {
		return 'AI prompt';
	}
}

function createSvg(prompt: PromptRow): string {
	const palettes = [
		['#18212b', '#ffda63', '#ec6d56'],
		['#12243c', '#83e1d2', '#5f8cf7'],
		['#2e1c35', '#f3b3d1', '#b589ff'],
		['#132d24', '#c5e77d', '#63c8a8'],
		['#342416', '#facb88', '#df7f53'],
	];
	const [base, accent, secondary] = palettes[hash(prompt.slug) % palettes.length];
	const lines = wrapTitle(displayText(prompt.title));
	const fontSize = lines.length === 1 ? 72 : lines.length === 2 ? 61 : 52;
	const lineHeight = fontSize + 15;
	const startY = 284 - ((lines.length - 1) * lineHeight) / 2;
	const title = lines
		.map((line, index) => `<text x="92" y="${startY + index * lineHeight}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="700" fill="#ffffff">${escapeXml(line)}</text>`)
		.join('');
	const topic = displayText(primaryTopic(prompt.tags)).replace(/\b\w/g, (char) => char.toUpperCase());

	return `<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
	<rect width="1200" height="630" fill="${base}"/>
	<circle cx="1040" cy="122" r="214" fill="${accent}" opacity="0.12"/>
	<circle cx="1110" cy="525" r="300" fill="${secondary}" opacity="0.16"/>
	<path d="M0 504C182 440 312 618 526 555C724 497 814 420 1200 490V630H0Z" fill="#ffffff" opacity="0.055"/>
	<rect x="92" y="93" width="206" height="38" rx="19" fill="${accent}"/>
	<text x="113" y="118" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" letter-spacing="1.1" fill="${base}">TEXT PROMPT</text>
	${title}
	<text x="92" y="496" font-family="Arial, Helvetica, sans-serif" font-size="25" font-weight="600" fill="${accent}">${escapeXml(topic)}</text>
	<text x="92" y="570" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="700" letter-spacing="0.8" fill="#ffffff">FREE PROMPT BASE</text>
	<text x="1108" y="570" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="500" fill="#ffffff" opacity="0.72">Copy, paste, create.</text>
</svg>`;
}

function fetchPromptRows(): PromptRow[] {
	const sql = "SELECT slug, title, description, tags FROM prompts WHERE category = 'text' AND status = 'approved' AND (cover_image IS NULL OR cover_image = '') ORDER BY slug";
	const stdout = execFileSync('npx', ['wrangler', 'd1', 'execute', 'DB', '--remote', '--json', '--command', sql], {
		cwd: process.cwd(),
		encoding: 'utf8',
		maxBuffer: 20 * 1024 * 1024,
	});
	const rows = JSON.parse(stdout) as D1Result[];
	if (!rows[0]?.success) throw new Error('D1 did not return a successful prompt query.');
	return rows[0].results;
}

const rows = fetchPromptRows();
rmSync(OUTPUT_DIR, { recursive: true, force: true });
mkdirSync(OUTPUT_DIR, { recursive: true });

const records: CoverRecord[] = [];
for (const [index, prompt] of rows.entries()) {
	const file = `${prompt.slug}.webp`;
	await sharp(Buffer.from(createSvg(prompt))).webp({ quality: 78, effort: 4 }).toFile(resolve(OUTPUT_DIR, file));
	records.push({
		...prompt,
		file,
		key: `prompts/text/${file}`,
		url: `https://freepromptbase.com/cdn/prompts/text/${file}`,
		alt: `${prompt.title} AI prompt cover`,
	});
	if ((index + 1) % 100 === 0 || index + 1 === rows.length) console.log(`Generated ${index + 1}/${rows.length} covers`);
}

const missingFiles = records.filter((record) => !existsSync(resolve(OUTPUT_DIR, record.file)));
if (missingFiles.length) throw new Error(`${missingFiles.length} generated WebP files are missing; refusing to write a partial manifest.`);
writeFileSync(resolve(OUTPUT_DIR, 'manifest.json'), JSON.stringify({ width: WIDTH, height: HEIGHT, records }, null, 2) + '\n');
console.log(`Generated ${records.length} WebP covers in ${OUTPUT_DIR}`);
