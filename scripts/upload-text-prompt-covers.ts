/** Upload the generated text-prompt WebP covers to the project's R2 bucket. */

import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const OUTPUT_DIR = resolve('tmp/text-prompt-covers');
const MANIFEST = resolve(OUTPUT_DIR, 'manifest.json');
const BUCKET = 'freepromptbase-media-2026';
// R2 uploads are independent. A bounded parallel queue keeps this bulk import
// practical without opening thousands of Wrangler processes at once.
const CONCURRENCY = Math.min(32, Math.max(1, Number(process.env.COVER_UPLOAD_CONCURRENCY ?? 16)) || 16);
const MAX_ATTEMPTS = 5;

interface CoverRecord {
	file: string;
	key: string;
}

if (!existsSync(MANIFEST)) throw new Error('Missing cover manifest. Run npm run assets:generate-text-covers first.');
const { records } = JSON.parse(readFileSync(MANIFEST, 'utf8')) as { records: CoverRecord[] };

function sleep(ms: number): Promise<void> {
	return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function uploadOnce(record: CoverRecord): Promise<void> {
	const source = resolve(OUTPUT_DIR, record.file);
	return new Promise((resolveUpload, rejectUpload) => {
		const child = spawn('npx', [
			'wrangler', 'r2', 'object', 'put', `${BUCKET}/${record.key}`, '--remote', '--file', source,
			'--content-type', 'image/webp', '--cache-control', 'public, max-age=31536000, immutable',
		], { cwd: process.cwd(), stdio: ['ignore', 'ignore', 'pipe'] });
		let stderr = '';
		child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
		child.on('error', rejectUpload);
		child.on('close', (code) => code === 0 ? resolveUpload() : rejectUpload(new Error(`${record.key} failed: ${stderr.trim()}`)));
	});
}

async function upload(record: CoverRecord): Promise<void> {
	let lastError: unknown;
	for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
		try {
			await uploadOnce(record);
			return;
		} catch (error) {
			lastError = error;
			if (attempt < MAX_ATTEMPTS) {
				console.warn(`Retrying ${record.key} (${attempt}/${MAX_ATTEMPTS - 1})`);
				await sleep(1_000 * 2 ** (attempt - 1));
			}
		}
	}
	throw lastError;
}

let cursor = 0;
let complete = 0;
async function worker(): Promise<void> {
	while (cursor < records.length) {
		const record = records[cursor++];
		await upload(record);
		complete += 1;
		if (complete % 50 === 0 || complete === records.length) console.log(`Uploaded ${complete}/${records.length} covers`);
	}
}

await Promise.all(Array.from({ length: Math.min(CONCURRENCY, records.length) }, () => worker()));
console.log(`Uploaded ${records.length} WebP covers to R2.`);
