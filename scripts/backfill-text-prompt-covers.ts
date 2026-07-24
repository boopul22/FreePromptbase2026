/** Backfill cover URLs and intrinsic dimensions after the R2 upload succeeds. */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const MANIFEST = resolve('tmp/text-prompt-covers/manifest.json');
const BATCH_SIZE = 100;

interface CoverRecord {
	slug: string;
	url: string;
}

if (!existsSync(MANIFEST)) throw new Error('Missing cover manifest. Run npm run assets:generate-text-covers first.');
const { records } = JSON.parse(readFileSync(MANIFEST, 'utf8')) as { records: CoverRecord[] };

function sqlString(value: string): string {
	return `'${value.replace(/'/g, "''")}'`;
}

for (let start = 0; start < records.length; start += BATCH_SIZE) {
	const batch = records.slice(start, start + BATCH_SIZE);
	const cases = batch.map((record) => `WHEN ${sqlString(record.slug)} THEN ${sqlString(record.url)}`).join(' ');
	const slugs = batch.map((record) => sqlString(record.slug)).join(', ');
	const sql = `UPDATE prompts SET cover_image = CASE slug ${cases} END, cover_w = 1200, cover_h = 630, updated_at = datetime('now') WHERE category = 'text' AND slug IN (${slugs}) AND (cover_image IS NULL OR cover_image = '');`;
	execFileSync('npx', ['wrangler', 'd1', 'execute', 'DB', '--remote', '--command', sql], {
		cwd: process.cwd(),
		stdio: 'inherit',
	});
	console.log(`Backfilled ${Math.min(start + BATCH_SIZE, records.length)}/${records.length} covers`);
}
