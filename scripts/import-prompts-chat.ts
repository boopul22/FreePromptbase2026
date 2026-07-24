/**
 * Import the CC0 prompt dataset from github.com/f/prompts.chat into D1-ready
 * SQL batches. The data license is declared by that project as CC0 1.0 in its
 * top-level LICENSE file; keep the source notice emitted in `how_to_use`.
 *
 * Usage:
 *   node --experimental-strip-types scripts/import-prompts-chat.ts
 *   npx wrangler d1 execute freepromptbase-com --remote --file=tmp/prompts-chat-import/001.sql
 *
 * The script deliberately imports only non-image, low-risk prompts. It creates
 * `Text` prompts with an editorial subcategory tag so the imported library is
 * useful to browse and does not mix unrelated content into image-prompt pages.
 */

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SOURCE_URL = 'https://raw.githubusercontent.com/f/prompts.chat/main/prompts.csv';
const SOURCE_PAGE = 'https://github.com/f/prompts.chat';
const OUTPUT_DIR = resolve('tmp/prompts-chat-import');
const BATCH_SIZE = 75;
const IMPORT_DATE = process.env.IMPORT_DATE ?? new Date().toISOString().slice(0, 10);
const TEXT_COVER_BASE_URL = 'https://freepromptbase.com/cdn/prompts/text';

interface SourcePrompt {
	act: string;
	prompt: string;
	for_devs: string;
	type: string;
	contributor: string;
}

interface ImportPrompt {
	slug: string;
	title: string;
	description: string;
	prompt: string;
	tags: string[];
	author: string;
	howToUse: string;
	sourceUrl: string;
	coverImage: string;
}

/** RFC 4180-style parser: supports quoted commas, newlines, and escaped quotes. */
function parseCsv(text: string): string[][] {
	const rows: string[][] = [];
	let row: string[] = [];
	let value = '';
	let quoted = false;

	for (let i = 0; i < text.length; i += 1) {
		const char = text[i];
		if (quoted) {
			if (char === '"' && text[i + 1] === '"') {
				value += '"';
				i += 1;
			} else if (char === '"') {
				quoted = false;
			} else {
				value += char;
			}
			continue;
		}

		if (char === '"' && value === '') {
			quoted = true;
		} else if (char === ',') {
			row.push(value);
			value = '';
		} else if (char === '\n') {
			row.push(value.replace(/\r$/, ''));
			if (row.some(Boolean)) rows.push(row);
			row = [];
			value = '';
		} else {
			value += char;
		}
	}
	row.push(value.replace(/\r$/, ''));
	if (row.some(Boolean)) rows.push(row);
	return rows;
}

function readSource(text: string): SourcePrompt[] {
	const [header, ...values] = parseCsv(text);
	const indexes = new Map(header.map((name, index) => [name, index]));
	for (const required of ['act', 'prompt', 'for_devs', 'type', 'contributor']) {
		if (!indexes.has(required)) throw new Error(`prompts.chat CSV is missing required column: ${required}`);
	}
	return values.map((row) => ({
		act: row[indexes.get('act')!] ?? '',
		prompt: row[indexes.get('prompt')!] ?? '',
		for_devs: row[indexes.get('for_devs')!] ?? '',
		type: row[indexes.get('type')!] ?? '',
		contributor: row[indexes.get('contributor')!] ?? '',
	}));
}

function clean(value: string): string {
	return value.replace(/\u0000/g, '').replace(/\r\n?/g, '\n').trim();
}

function normal(value: string): string {
	return clean(value).toLowerCase().replace(/\s+/g, ' ');
}

function slugify(value: string): string {
	const slug = value
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)/g, '')
		.slice(0, 72)
		.replace(/-+$/g, '');
	return slug || 'text-prompt';
}

// Keep the first import useful and appropriate for a general-audience prompt
// directory. These are excluded rather than silently reworded: they need
// specialist review, up-to-date advice, or would make a poor public template.
const EXCLUDED = [
	/plagiarism|jailbreak|prompt injection|malware|ransomware|phishing|\bexploit\b|\bhacking\b|\bhack\b|\bbypass\b|\bcheat\b/i,
	/\bnsfw\b|\badult\b|porn|erotic|sexual|onlyfans/i,
	/suicide|self[- ]?harm|terroris[mt]|\bweapon\b/i,
	/impersonat|fake id|forgery|fraud|scam/i,
	/\bmedical\b|diagnos[ei]|\blegal advice\b|\blawyer\b|\bfinancial advice\b|investment advice/i,
	/\bpolitic(?:s|al)?\b|election campaign|voter/i,
];

function isSafe(row: SourcePrompt): boolean {
	if (!['TEXT', 'STRUCTURED'].includes(clean(row.type).toUpperCase())) return false;
	const title = clean(row.act);
	const prompt = clean(row.prompt);
	if (title.length < 3 || prompt.length < 40 || prompt.length > 18_000) return false;
	return !EXCLUDED.some((pattern) => pattern.test(`${title}\n${prompt}`));
}

function classify(title: string, prompt: string, sourceType: string): string {
	const heading = title.toLowerCase();
	const text = `${heading} ${prompt.toLowerCase()}`;
	// Title matches are intentional: they avoid classifying a Job Interviewer as
	// "coding" simply because its sample role happens to be Software Developer.
	if (/\b(plan|planner|roadmap|milestone|goal|career|job interview|interviewer|project management|habit|coach)\b/.test(heading)) return 'planning';
	if (/\b(excel|spreadsheet|data|analytics|analysis|research|statistics|chart|table)\b/.test(heading)) return 'analysis';
	if (/\b(developer|programming|coding|terminal|console|javascript|typescript|python|sql|api|linux|devops|software engineer)\b/.test(heading)) return 'coding';
	if (/\b(marketing|seo|sales|advertis|brand|startup|business|customer|e-commerce|ecommerce)\b/.test(heading)) return 'business';
	if (/\b(writer|writing|editor|translate|translation|grammar|email|resume|cover letter|copywriting|blog)\b/.test(heading)) return 'writing';
	if (/\b(teacher|tutor|learn|learning|education|lesson|exam|student|language|pronunciation)\b/.test(heading)) return 'learning';
	if (/\b(story|poem|song|creative|character|game|roleplay|comedy|screenplay|art)\b/.test(heading)) return 'creative';

	if (/\b(plan|planner|roadmap|milestone|goal|career|job interview|project management|productivity)\b/.test(text)) return 'planning';
	if (/\b(excel|spreadsheet|data analysis|research report|statistics|visuali[sz])\b/.test(text)) return 'analysis';
	if (/\b(python|javascript|typescript|react|node|sql|database|api|programming|code|terminal|linux|devops)\b/.test(text)) return 'coding';
	if (/\b(marketing|seo|sales|advertis|brand|startup|business|customer|e-commerce|ecommerce)\b/.test(text)) return 'business';
	if (/\b(write|writer|writing|editor|translate|translation|grammar|email|resume|cover letter|copywriting|blog)\b/.test(text)) return 'writing';
	if (/\b(teacher|tutor|learn|learning|education|lesson|exam|student|language|pronunciation)\b/.test(text)) return 'learning';
	if (/\b(story|poem|song|creative|character|game|roleplay|comedy|screenplay|art)\b/.test(text)) return 'creative';
	return sourceType.toUpperCase() === 'STRUCTURED' ? 'structured prompts' : 'productivity';
}

function descriptionFor(title: string, topic: string): string {
	const purposeByTopic: Record<string, string> = {
		analysis: 'data analysis, research, and clear findings',
		business: 'marketing, customer work, and business decisions',
		coding: 'coding questions, debugging, and technical guidance',
		creative: 'creative ideas, stories, and role-play',
		learning: 'lessons, practice, and study support',
		planning: 'goals, priorities, and practical next steps',
		productivity: 'everyday work and focused problem-solving',
		'structured prompts': 'a structured task with clear inputs and outputs',
		writing: 'writing, editing, translation, and language work',
	};
	const purpose = purposeByTopic[topic] ?? 'a focused AI task';
	return `${title} prompt for ${purpose}. Copy it into ChatGPT, Gemini, Claude, or another AI assistant and tailor it to your task.`;
}

function sqlText(value: string): string {
	// Hex-encoded UTF-8 avoids both quote escaping and D1's expression-depth
	// limit on prompts containing hundreds of line breaks. SQLite casts the blob
	// back to TEXT without changing the original content.
	return `CAST(X'${Buffer.from(clean(value), 'utf8').toString('hex')}' AS TEXT)`;
}

function toSql(prompt: ImportPrompt): string {
	return `INSERT INTO prompts (slug, title, description, prompt_text, category, tags, author, date, cover_image, cover_w, cover_h, images, featured, liked, popularity, save_count, like_count, share_count, view_count, copy_count, how_to_use, source_url, status, updated_at) VALUES (${sqlText(prompt.slug)}, ${sqlText(prompt.title)}, ${sqlText(prompt.description)}, ${sqlText(prompt.prompt)}, 'text', ${sqlText(JSON.stringify(prompt.tags))}, ${sqlText(prompt.author)}, '${IMPORT_DATE}', ${sqlText(prompt.coverImage)}, 1200, 630, '[]', 0, 0, 0, 0, 0, 0, 0, 0, ${sqlText(prompt.howToUse)}, ${sqlText(prompt.sourceUrl)}, 'approved', datetime('now')) ON CONFLICT(slug) DO UPDATE SET description = excluded.description, tags = excluded.tags, author = excluded.author, how_to_use = excluded.how_to_use, source_url = excluded.source_url, cover_image = excluded.cover_image, cover_w = excluded.cover_w, cover_h = excluded.cover_h, updated_at = datetime('now') WHERE prompts.category = 'text' AND prompts.author LIKE 'prompts.chat%';`;
}

function buildImport(rows: SourcePrompt[]): { prompts: ImportPrompt[]; excluded: number; duplicates: number; categories: Map<string, number> } {
	const prompts: ImportPrompt[] = [];
	const categories = new Map<string, number>();
	const seen = new Set<string>();
	let excluded = 0;
	let duplicates = 0;

	for (const row of rows) {
		if (!isSafe(row)) {
			excluded += 1;
			continue;
		}
		const promptText = clean(row.prompt);
		const promptKey = normal(promptText);
		if (seen.has(promptKey)) {
			duplicates += 1;
			continue;
		}
		seen.add(promptKey);

		const title = clean(row.act).replace(/\s+/g, ' ').slice(0, 140);
		const topic = classify(title, promptText, row.type);
		const contributor = clean(row.contributor)
			.split(',')
			.map((name) => `@${name.trim().replace(/^@/, '')}`)
			.filter((name) => name !== '@')
			.join(', ');
		const slug = `${slugify(title)}-pc-${String(prompts.length + 1).padStart(4, '0')}`;
		const tags = ['text prompt', topic, 'chatgpt', 'gemini', 'claude', 'open source', 'prompts.chat'];
		if (clean(row.type).toUpperCase() === 'STRUCTURED') tags.splice(2, 0, 'structured prompt');
		const sourceLine = contributor ? `Original contributor: ${contributor}.` : 'Original contributor listed by prompts.chat.';

		prompts.push({
			slug,
			title,
			description: descriptionFor(title, topic),
			prompt: promptText,
			tags,
			author: contributor ? `prompts.chat · ${contributor}` : 'prompts.chat',
			howToUse: `Copy the prompt, replace any placeholders with your context, then paste it into your preferred AI assistant.\n\nSource: ${SOURCE_PAGE} — prompt data is CC0 1.0 Universal. ${sourceLine}`,
			sourceUrl: SOURCE_PAGE,
			coverImage: `${TEXT_COVER_BASE_URL}/${slug}.webp`,
		});
		categories.set(topic, (categories.get(topic) ?? 0) + 1);
	}

	return { prompts, excluded, duplicates, categories };
}

const response = await fetch(SOURCE_URL);
if (!response.ok) throw new Error(`Could not fetch prompts.chat dataset: ${response.status} ${response.statusText}`);
const sourceRows = readSource(await response.text());
const result = buildImport(sourceRows);

rmSync(OUTPUT_DIR, { recursive: true, force: true });
mkdirSync(OUTPUT_DIR, { recursive: true });
for (let start = 0; start < result.prompts.length; start += BATCH_SIZE) {
	const batch = result.prompts.slice(start, start + BATCH_SIZE);
	const index = String(start / BATCH_SIZE + 1).padStart(3, '0');
	writeFileSync(
		resolve(OUTPUT_DIR, `${index}.sql`),
		`-- Generated from ${SOURCE_URL} on ${IMPORT_DATE}.\n-- ${batch.length} CC0 prompts. Safe to re-run: INSERT OR IGNORE.\n${batch.map(toSql).join('\n')}\n`,
	);
}

writeFileSync(
	resolve(OUTPUT_DIR, 'manifest.json'),
	JSON.stringify(
		{
			source: SOURCE_PAGE,
			license: 'CC0 1.0 Universal',
			importDate: IMPORT_DATE,
			sourceRows: sourceRows.length,
			publishedPrompts: result.prompts.length,
			excludedRows: result.excluded,
			duplicateRows: result.duplicates,
			categories: Object.fromEntries([...result.categories.entries()].sort()),
			batchSize: BATCH_SIZE,
		},
		null,
		2,
	) + '\n',
);

console.log(`Prepared ${result.prompts.length} approved Text prompts in ${OUTPUT_DIR}`);
console.log(`Excluded ${result.excluded} unsafe, image-only, or unsuitable rows; removed ${result.duplicates} duplicates.`);
console.log(Object.fromEntries([...result.categories.entries()].sort()));
