import test from 'node:test';
import assert from 'node:assert/strict';
import {
	MetaError,
	deriveCampaignStatus,
	normalizeCampaignInput,
	publishFacebook,
	publishInstagram,
	retryDisposition,
	validateMediaAvailability,
} from '../src/lib/socialScheduler.ts';

const cdn = 'https://freepromptbase.com/cdn/cms/instagram/example/image.jpg';
const campaign = {
	id: 'campaign-1', idempotencyKey: 'campaign-001', promptSlug: 'example-prompt',
	canonicalUrl: 'https://freepromptbase.com/example-prompt', status: 'publishing',
	scheduledAt: new Date().toISOString(), createdBy: 'admin', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
	media: [
		{ url: `${cdn}?1`, role: 'cover', altText: 'Cover description' },
		{ url: `${cdn}?2`, role: 'gallery-2', altText: 'Second description' },
	], deliveries: [],
};

function fakeDb() {
	const writes = [];
	return {
		writes,
		prepare(sql) {
			return { bind(...values) { return { async run() { writes.push({ sql, values }); return { meta: { changes: 1 } }; } }; } };
		},
	};
}

test('normalizes timezone and validates the paired payload', () => {
	const result = normalizeCampaignInput({
		idempotencyKey: 'campaign-001', canonicalUrl: campaign.canonicalUrl,
		scheduledAt: '2030-08-10T18:30:00+05:30', media: campaign.media,
		instagram: { caption: 'Instagram caption' },
		facebook: { message: `Facebook message ${campaign.canonicalUrl}` },
	}, Date.parse('2029-01-01T00:00:00Z'));
	assert.equal(result.scheduledAt, '2030-08-10T13:00:00.000Z');
	assert.equal(result.promptSlug, 'example-prompt');
});

test('rejects non-CDN media', () => {
	assert.throws(() => normalizeCampaignInput({
		idempotencyKey: 'campaign-001', canonicalUrl: campaign.canonicalUrl,
		scheduledAt: '2030-08-10T13:00:00Z', media: [{ url: 'https://example.com/a.jpg', role: 'cover', altText: 'Alt' }],
		instagram: { caption: 'Caption' }, facebook: { message: `Message ${campaign.canonicalUrl}` },
	}, 0), /Free Prompt Base CDN/);
});

test('checks that media resolves as JPEG', async () => {
	await validateMediaAvailability(campaign.media, async () => new Response(null, { status: 200, headers: { 'content-type': 'image/jpeg; charset=binary' } }));
	await assert.rejects(() => validateMediaAvailability(campaign.media, async () => new Response(null, { status: 200, headers: { 'content-type': 'image/webp' } })), /image\/jpeg/);
});

test('retries a transient media preflight response', async () => {
	let attempts = 0;
	await validateMediaAvailability([campaign.media[0]], async () => ++attempts === 1
		? new Response('cold transform', { status: 503, headers: { 'content-type': 'text/plain' } })
		: new Response(null, { status: 200, headers: { 'content-type': 'image/jpeg' } }));
	assert.equal(attempts, 2);
});

test('derives partial status and bounded retry policy', () => {
	assert.equal(deriveCampaignStatus(['published', 'failed']), 'partial');
	assert.deepEqual(retryDisposition(1, true), { status: 'retrying', delaySeconds: 60 });
	assert.deepEqual(retryDisposition(5, true), { status: 'failed', delaySeconds: null });
	assert.deepEqual(retryDisposition(1, false), { status: 'failed', delaySeconds: null });
});

test('Instagram resumes existing child state instead of duplicating it', async () => {
	const db = fakeDb(); const posts = [];
	const fetcher = async (url, init = {}) => {
		const path = new URL(url).pathname; const body = new URLSearchParams(init.body || '');
		if (init.method === 'POST') posts.push({ path, body: Object.fromEntries(body) });
		if (path.endsWith('/media') && body.get('is_carousel_item') === 'true') return Response.json({ id: 'child-2' });
		if (path.endsWith('/media') && body.get('media_type') === 'CAROUSEL') return Response.json({ id: 'parent-1' });
		if (path.endsWith('/media_publish')) return Response.json({ id: 'media-1' });
		if (path.endsWith('/parent-1')) return Response.json({ status_code: 'FINISHED' });
		if (path.endsWith('/media-1')) return Response.json({ id: 'media-1', permalink: 'https://instagram.com/p/one' });
		throw new Error(`Unexpected ${init.method || 'GET'} ${path}`);
	};
	const delivery = { platform: 'instagram', content: 'Caption', status: 'running', attempts: 1, nextAttemptAt: null, state: { childContainerIds: ['child-1'] }, remoteId: null, permalink: null, lastError: null, publishedAt: null };
	const result = await publishInstagram({ DB: db, IG_ACCESS_TOKEN: 'secret', IG_USER_ID: 'ig', FB_PAGE_ACCESS_TOKEN: '', FB_PAGE_ID: '' }, campaign, delivery, fetcher);
	assert.equal(result.remoteId, 'media-1');
	assert.equal(posts.filter(item => item.body.is_carousel_item === 'true').length, 1);
	assert.deepEqual(result.state.childContainerIds, ['child-1', 'child-2']);
});

test('Facebook resumes uploaded photo IDs and builds one parent post', async () => {
	const db = fakeDb(); const posts = [];
	const fetcher = async (url, init = {}) => {
		const path = new URL(url).pathname; const body = new URLSearchParams(init.body || '');
		if (init.method === 'POST') posts.push({ path, body: Object.fromEntries(body) });
		if (path.endsWith('/photos')) return Response.json({ id: 'photo-2' });
		if (path.endsWith('/feed')) return Response.json({ id: 'page_post' });
		if (path.endsWith('/page_post')) return Response.json({ id: 'page_post', permalink_url: 'https://facebook.com/post' });
		throw new Error(`Unexpected ${init.method || 'GET'} ${path}`);
	};
	const delivery = { platform: 'facebook', content: `Message ${campaign.canonicalUrl}`, status: 'running', attempts: 1, nextAttemptAt: null, state: { photoIds: ['photo-1'] }, remoteId: null, permalink: null, lastError: null, publishedAt: null };
	const result = await publishFacebook({ DB: db, IG_ACCESS_TOKEN: '', IG_USER_ID: '', FB_PAGE_ACCESS_TOKEN: 'secret', FB_PAGE_ID: 'page' }, 'page-token', campaign, delivery, fetcher);
	assert.equal(result.remoteId, 'page_post');
	assert.equal(posts.filter(item => item.path.endsWith('/photos')).length, 1);
	assert.deepEqual(result.state.photoIds, ['photo-1', 'photo-2']);
});

test('MetaError keeps transient classification', () => {
	const error = new MetaError('temporary', true, 'instagram');
	assert.equal(error.transient, true);
	assert.equal(error.platform, 'instagram');
});
