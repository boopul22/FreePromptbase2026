#!/usr/bin/env node
/**
 * One-time/import-safe cloud loader for the external Raga whisper Reel batch.
 * Videos go to R2; schedule/captions go to the separate raga_reel_jobs table.
 * This never creates an Instagram or Free Prompt Base Facebook campaign.
 */
import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const source = process.env.RAGA_REEL_SOURCE || '/Volumes/Mac_ssd1/Root_download_new/finalv2';
const batch = process.env.RAGA_REEL_BATCH || 'finalv2';
const firstItem = Number(process.env.RAGA_REEL_FIRST || 2);
const lastItem = Number(process.env.RAGA_REEL_LAST || 62);
const flags = new Set(process.argv.slice(2));
const shouldUpload = flags.has('--upload') || flags.has('--all');
const shouldSeed = flags.has('--seed') || flags.has('--all');
const shouldVerify = flags.has('--verify') || flags.has('--all');
const startAt = Number(process.argv.find(value => value.startsWith('--start='))?.split('=')[1] || firstItem);
if (!/^[a-z0-9][a-z0-9-]{1,63}$/.test(batch)) throw new Error('RAGA_REEL_BATCH must be a 2-64 character lowercase slug.');
if (!Number.isInteger(firstItem) || !Number.isInteger(lastItem) || firstItem < 1 || lastItem < firstItem) {
	throw new Error('RAGA_REEL_FIRST and RAGA_REEL_LAST must define a valid positive range.');
}
if (!Number.isInteger(startAt) || startAt < firstItem || startAt > lastItem) {
	throw new Error(`--start must be an item number from ${firstItem} through ${lastItem}.`);
}
const bucket = 'freepromptbase-media-2026';
const publicBase = process.env.R2_PUBLIC_URL || 'https://freepromptbase.com/cdn';

function quoted(frontmatter, key) {
	const match = frontmatter.match(new RegExp(`^${key}:\\s*("(?:[^"\\\\]|\\\\.)*")\\s*$`, 'm'));
	if (!match) throw new Error(`Missing ${key}`);
	return JSON.parse(match[1]);
}

function scalar(frontmatter, key) {
	const match = frontmatter.match(new RegExp(`^${key}:\\s*([^\\n]+)\\s*$`, 'm'));
	if (!match) throw new Error(`Missing ${key}`);
	return match[1].trim().replace(/^['"]|['"]$/g, '');
}

function block(frontmatter, key) {
	const match = frontmatter.match(new RegExp(`^${key}:\\s*\\|\\s*\\n((?:[ \\t]+.*(?:\\n|$))+)`, 'm'));
	if (!match) throw new Error(`Missing ${key} block`);
	return match[1].split('\n').map(line => line.replace(/^  /, '')).join('\n').trim();
}

async function readItem(number) {
	const folder = path.join(source, String(number));
	const raw = await fs.readFile(path.join(folder, 'metadata.md'), 'utf8');
	const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
	if (!match) throw new Error(`Invalid frontmatter in item ${number}`);
	const title = quoted(match[1], 'title');
	const video = quoted(match[1], 'video');
	const description = block(match[1], 'description');
	const scheduledAt = scalar(match[1], 'publish_at');
	const hashtags = match[2].trim();
	const videoPath = path.join(folder, video);
	const stat = await fs.stat(videoPath);
	if (!stat.isFile() || stat.size < 1) throw new Error(`Missing video for item ${number}`);
	if (!/(Z|[+-]\d{2}:\d{2})$/i.test(scheduledAt) || Number.isNaN(Date.parse(scheduledAt))) {
		throw new Error(`publish_at for item ${number} must be a valid timestamp with a timezone`);
	}
	const { stdout } = await exec('ffprobe', ['-v', 'error', '-show_entries',
		'format=duration:stream=codec_type,codec_name,width,height,avg_frame_rate', '-of', 'json', videoPath]);
	const probe = JSON.parse(stdout);
	const videoStream = probe.streams?.find(stream => stream.codec_type === 'video');
	const audioStream = probe.streams?.find(stream => stream.codec_type === 'audio');
	const duration = Number(probe.format?.duration);
	const [rateN, rateD] = String(videoStream?.avg_frame_rate || '0/1').split('/').map(Number);
	const frameRate = rateD ? rateN / rateD : 0;
	if (videoStream?.codec_name !== 'h264' || videoStream.width * 16 !== videoStream.height * 9 || frameRate < 23) {
		throw new Error(`Item ${number} must be H.264, 9:16, and at least 23 fps`);
	}
	if (audioStream?.codec_name !== 'aac' || duration < 4 || duration > 60) {
		throw new Error(`Item ${number} must use AAC audio and be 4-60 seconds long`);
	}
	return {
		number, title, caption: [title, description, hashtags].filter(Boolean).join('\n\n'),
		scheduledAt: new Date(scheduledAt).toISOString(), videoPath, size: stat.size,
		r2Key: `raga/reels/${batch}/${path.basename(video)}`,
	};
}

const sql = value => `'${String(value).replaceAll("'", "''")}'`;

async function upload(item) {
	await exec('npx', ['wrangler', 'r2', 'object', 'put', `${bucket}/${item.r2Key}`, '--file', item.videoPath,
		'--content-type', 'video/mp4', '--cache-control', 'public, max-age=31536000, immutable', '--remote', '--force'],
		{ maxBuffer: 1024 * 1024 * 4 });
	process.stdout.write(`uploaded item ${item.number} (${(item.size / 1024 / 1024).toFixed(1)} MiB)\n`);
}

async function uploadPool(items, concurrency = 3) {
	let cursor = 0;
	await Promise.all(Array.from({ length: concurrency }, async () => {
		while (cursor < items.length) await upload(items[cursor++]);
	}));
}

const items = [];
// The configured range is the scheduling source of truth. For finalv2 it begins
// at 2 because item 1 was intentionally published immediately.
for (let number = firstItem; number <= lastItem; number++) items.push(await readItem(number));
for (let index = 1; index < items.length; index++) {
	if (Date.parse(items[index].scheduledAt) <= Date.parse(items[index - 1].scheduledAt)) throw new Error('Schedules are not strictly increasing.');
}
console.log(`validated ${items.length} Raga-only Reels; ${(items.reduce((n, item) => n + item.size, 0) / 1024 / 1024 / 1024).toFixed(2)} GiB`);
console.log(`first ${items[0].scheduledAt}; last ${items.at(-1).scheduledAt}`);

if (shouldUpload) await uploadPool(items.filter(item => item.number >= startAt));

if (shouldVerify) {
	const failures = [];
	let cursor = 0;
	await Promise.all(Array.from({ length: 6 }, async () => {
		while (cursor < items.length) {
			const item = items[cursor++];
			const url = `${publicBase.replace(/\/$/, '')}/${item.r2Key}`;
			try {
				const response = await fetch(url, { method: 'HEAD' });
				const type = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
				const size = Number(response.headers.get('content-length'));
				if (!response.ok || type !== 'video/mp4' || size !== item.size) failures.push({ item: item.number, status: response.status, type, size, expected: item.size });
			} catch (error) { failures.push({ item: item.number, error: error instanceof Error ? error.message : String(error) }); }
		}
	}));
	if (failures.length) throw new Error(`Cloud verification failed: ${JSON.stringify(failures)}`);
	console.log(`verified ${items.length} public R2 videos`);
}

if (shouldSeed) {
	const statements = items.map(item => `INSERT INTO raga_reel_jobs
		(id, idempotency_key, title, caption, video_r2_key, scheduled_at)
		VALUES (${sql(`raga-${batch}-${String(item.number).padStart(2, '0')}`)}, ${sql(`raga-whisper-${batch}-reel-${String(item.number).padStart(2, '0')}-v1`)},
		${sql(item.title)}, ${sql(item.caption)}, ${sql(item.r2Key)}, ${sql(item.scheduledAt.slice(0, 19).replace('T', ' '))})
		ON CONFLICT(idempotency_key) DO NOTHING;`).join('\n');
	await exec('npx', ['wrangler', 'd1', 'execute', 'freepromptbase-com', '--remote', '--yes', '--command', statements],
		{ maxBuffer: 1024 * 1024 * 8 });
	console.log(`seeded ${items.length} idempotent D1 jobs`);
}

if (!shouldUpload && !shouldVerify && !shouldSeed) console.log('dry run only; use --all, --upload, --verify, or --seed');
