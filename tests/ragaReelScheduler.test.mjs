import test from 'node:test';
import assert from 'node:assert/strict';
import { publishRagaReel } from '../src/lib/ragaReelScheduler.ts';

function fakeDb() {
	const writes = [];
	return { writes, prepare(sql) { return { bind(...values) { return { async run() { writes.push({ sql, values }); return { meta: { changes: 1 } }; } }; } }; } };
}

const job = {
	id: 'raga-finalv2-02', title: 'One Flame', caption: 'One Flame\n\nCaption\n\n#poetry',
	videoR2Key: 'raga/reels/finalv2/reel_02_final.mp4', status: 'running', attempts: 1, failureCount: 0, state: {},
};

test('hosted Reel flow persists each mutation and uses only the Raga Page', async () => {
	const db = fakeDb(); const calls = [];
	const fetcher = async (url, init = {}) => {
		calls.push({ url: String(url), init });
		if (String(url).includes('upload_phase=start')) return Response.json({ video_id: 'video-2', upload_url: 'https://rupload.facebook.com/video-upload/v25.0/video-2' });
		if (String(url).startsWith('https://rupload.')) return Response.json({ success: true });
		if (String(url).includes('upload_phase=finish')) return Response.json({ success: true });
		return Response.json({ id: 'video-2', status: { video_status: 'ready' }, permalink_url: 'https://facebook.com/reel/video-2' });
	};
	const env = { DB: db, R2_PUBLIC_URL: 'https://freepromptbase.com/cdn', RAGA_FB_PAGE_ID: '1277300398800100', META_API_VERSION: 'v25.0' };
	const result = await publishRagaReel(env, job, 'page-secret', fetcher);
	assert.equal(result.ready, true);
	assert.equal(db.writes.length, 3);
	assert.match(calls[0].url, /1277300398800100\/video_reels/);
	assert.equal(calls[1].init.headers.file_url, 'https://freepromptbase.com/cdn/raga/reels/finalv2/reel_02_final.mp4');
	assert.equal(new URL(calls[2].url).searchParams.get('description'), job.caption);
});

test('processing retry reuses the saved video and never starts or finishes twice', async () => {
	const db = fakeDb(); const calls = [];
	const resumed = { ...job, state: { videoId: 'video-2', uploadUrl: 'https://rupload.example/video-2', uploadComplete: true, finishSentAt: '2026-08-22T00:00:00Z' } };
	const result = await publishRagaReel({ DB: db, R2_PUBLIC_URL: 'https://freepromptbase.com/cdn', RAGA_FB_PAGE_ID: '1277300398800100' }, resumed, 'secret', async (url, init) => {
		calls.push({ url: String(url), init });
		return Response.json({ id: 'video-2', status: { video_status: 'processing' } });
	});
	assert.equal(result.ready, false);
	assert.equal(calls.length, 1);
	assert.equal(db.writes.length, 0);
});
