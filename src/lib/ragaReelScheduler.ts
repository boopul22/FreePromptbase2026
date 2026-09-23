import { MetaError, resolveFacebookPage, type SocialEnv } from './socialScheduler.ts';

/**
 * Dedicated cloud publisher for Raga whisper Reels.
 *
 * This module deliberately does not use social_campaigns/social_deliveries.
 * Those tables belong to Free Prompt Base's image campaign. Reel source files
 * live in R2 and Meta fetches them from the public /cdn/raga/reels/... URL.
 */

export interface RagaReelEnv extends SocialEnv {
	R2_PUBLIC_URL: string;
	// External Raga project destination; never exposed to SocialEnv.
	RAGA_FB_PAGE_ID: string;
}

export interface RagaReelJob {
	id: string;
	title: string;
	caption: string;
	videoR2Key: string;
	status: string;
	attempts: number;
	failureCount: number;
	state: { videoId?: string; uploadUrl?: string; uploadComplete?: boolean; finishSentAt?: string };
}

const sqlTime = (date: Date) => date.toISOString().slice(0, 19).replace('T', ' ');

function mapJob(row: any): RagaReelJob {
	let state: RagaReelJob['state'] = {};
	try { state = JSON.parse(String(row.state_json || '{}')); } catch { /* retain empty state */ }
	return {
		id: String(row.id), title: String(row.title), caption: String(row.caption),
		videoR2Key: String(row.video_r2_key), status: String(row.status),
		attempts: Number(row.attempts || 0), failureCount: Number(row.failure_count || 0),
		state,
	};
}

async function saveState(db: D1Database, id: string, state: RagaReelJob['state']) {
	await db.prepare("UPDATE raga_reel_jobs SET state_json = ?, updated_at = datetime('now') WHERE id = ?")
		.bind(JSON.stringify(state), id).run();
}

export async function claimDueRagaReel(db: D1Database, now = new Date()): Promise<RagaReelJob | null> {
	const current = sqlTime(now);
	// Recover a Worker that ended after claiming but before releasing its lease.
	await db.prepare(`UPDATE raga_reel_jobs SET status = 'retrying', next_attempt_at = ?, lease_expires_at = NULL,
		last_error = 'Recovered stale Worker lease', updated_at = datetime('now')
		WHERE status = 'running' AND lease_expires_at <= ?`).bind(current, current).run();
	const candidate = await db.prepare(`SELECT id FROM raga_reel_jobs
		WHERE status IN ('scheduled', 'retrying', 'processing') AND scheduled_at <= ?
		AND (next_attempt_at IS NULL OR next_attempt_at <= ?)
		AND (lease_expires_at IS NULL OR lease_expires_at <= ?)
		ORDER BY scheduled_at LIMIT 1`).bind(current, current, current).first<{ id: string }>();
	if (!candidate) return null;
	const lease = sqlTime(new Date(now.getTime() + 10 * 60_000));
	const claimed = await db.prepare(`UPDATE raga_reel_jobs SET status = 'running', attempts = attempts + 1,
		lease_expires_at = ?, updated_at = datetime('now') WHERE id = ?
		AND status IN ('scheduled', 'retrying', 'processing')
		AND (lease_expires_at IS NULL OR lease_expires_at <= ?)`).bind(lease, candidate.id, current).run();
	if (!claimed.meta.changes) return null;
	const row = await db.prepare('SELECT * FROM raga_reel_jobs WHERE id = ?').bind(candidate.id).first<any>();
	return row ? mapJob(row) : null;
}

async function graphJson(fetcher: typeof fetch, url: string, init: RequestInit): Promise<any> {
	let response: Response;
	try { response = await fetcher(url, init); }
	catch (error) { throw new MetaError(`Meta network error: ${error instanceof Error ? error.message : 'request failed'}`, true, 'facebook'); }
	let body: any;
	try { body = await response.json(); }
	catch { throw new MetaError(`Meta returned HTTP ${response.status} without JSON.`, response.status === 429 || response.status >= 500, 'facebook'); }
	if (!response.ok || body.error) {
		const detail = body.error || {};
		throw new MetaError(`${String(detail.message || `Meta HTTP ${response.status}`)}${detail.code ? ` | code=${detail.code}` : ''}`,
			Boolean(detail.is_transient) || response.status === 429 || response.status >= 500, 'facebook');
	}
	return body;
}

const isReady = (status: any) => {
	const video = String(status?.video_status || '').toLowerCase();
	const publishing = String(status?.publishing_phase?.status || '').toLowerCase();
	return video === 'ready' || publishing === 'complete' || publishing === 'completed';
};

const isFailed = (status: any) => {
	const values = [status?.video_status, status?.uploading_phase?.status, status?.processing_phase?.status, status?.publishing_phase?.status]
		.map(value => String(value || '').toLowerCase());
	return values.some(value => ['error', 'failed', 'expired'].includes(value));
};

export async function publishRagaReel(env: RagaReelEnv, job: RagaReelJob, pageToken: string, fetcher: typeof fetch = fetch) {
	const version = env.META_API_VERSION || 'v25.0';
	const host = (env.FB_API_HOST || 'https://graph.facebook.com').replace(/\/$/, '');
	const state = { ...job.state };
	if (!state.videoId) {
		const start = new URL(`${host}/${version}/${env.RAGA_FB_PAGE_ID}/video_reels`);
		start.searchParams.set('upload_phase', 'start');
		const created = await graphJson(fetcher, start.toString(), { method: 'POST', headers: { Authorization: `Bearer ${pageToken}` } });
		if (!created.video_id || !created.upload_url) throw new MetaError('Meta did not return a Reel video_id and upload_url.', true, 'facebook');
		state.videoId = String(created.video_id);
		state.uploadUrl = String(created.upload_url);
		await saveState(env.DB, job.id, state);
	}
	if (!state.uploadComplete) {
		const fileUrl = `${env.R2_PUBLIC_URL.replace(/\/$/, '')}/${job.videoR2Key}`;
		await graphJson(fetcher, state.uploadUrl!, { method: 'POST', headers: { Authorization: `OAuth ${pageToken}`, file_url: fileUrl } });
		state.uploadComplete = true;
		await saveState(env.DB, job.id, state);
	}
	if (!state.finishSentAt) {
		const finish = new URL(`${host}/${version}/${env.RAGA_FB_PAGE_ID}/video_reels`);
		finish.searchParams.set('upload_phase', 'finish');
		finish.searchParams.set('video_id', state.videoId!);
		finish.searchParams.set('video_state', 'PUBLISHED');
		finish.searchParams.set('title', job.title);
		finish.searchParams.set('description', job.caption);
		await graphJson(fetcher, finish.toString(), { method: 'POST', headers: { Authorization: `Bearer ${pageToken}` } });
		state.finishSentAt = new Date().toISOString();
		await saveState(env.DB, job.id, state);
	}
	const detailsUrl = new URL(`${host}/${version}/${state.videoId}`);
	detailsUrl.searchParams.set('fields', 'id,status,permalink_url');
	const details = await graphJson(fetcher, detailsUrl.toString(), { method: 'GET', headers: { Authorization: `Bearer ${pageToken}` } });
	if (isFailed(details.status)) throw new MetaError(`Meta Reel processing failed: ${JSON.stringify(details.status)}`, false, 'facebook');
	return {
		ready: isReady(details.status),
		remoteId: state.videoId!,
		permalink: String(details.permalink_url || `https://www.facebook.com/reel/${state.videoId}/`),
		state,
	};
}

async function failJob(db: D1Database, job: RagaReelJob, error: unknown) {
	const transient = error instanceof MetaError && error.transient;
	const failures = job.failureCount + 1;
	const retry = transient && failures < 6;
	const delayMinutes = Math.min(60, 2 ** Math.max(0, failures - 1));
	await db.prepare(`UPDATE raga_reel_jobs SET status = ?, failure_count = ?, next_attempt_at = ?,
		lease_expires_at = NULL, last_error = ?, updated_at = datetime('now') WHERE id = ?`)
		.bind(retry ? 'retrying' : 'failed', failures,
			retry ? sqlTime(new Date(Date.now() + delayMinutes * 60_000)) : null,
			error instanceof Error ? error.message : String(error), job.id).run();
}

export async function processDueRagaReel(env: RagaReelEnv, fetcher: typeof fetch = fetch) {
	const job = await claimDueRagaReel(env.DB);
	if (!job) return { processed: false };
	try {
		const page = await resolveFacebookPage(env, env.RAGA_FB_PAGE_ID, 'Raga whisper', fetcher);
		const result = await publishRagaReel(env, job, page.token, fetcher);
		if (!result.ready) {
			await env.DB.prepare(`UPDATE raga_reel_jobs SET status = 'processing', state_json = ?, remote_id = ?,
				next_attempt_at = datetime('now', '+1 minute'), lease_expires_at = NULL, last_error = NULL,
				updated_at = datetime('now') WHERE id = ?`).bind(JSON.stringify(result.state), result.remoteId, job.id).run();
			return { processed: true, ok: true, processing: true, jobId: job.id, remoteId: result.remoteId };
		}
		await env.DB.prepare(`UPDATE raga_reel_jobs SET status = 'published', state_json = ?, remote_id = ?, permalink = ?,
			published_at = datetime('now'), next_attempt_at = NULL, lease_expires_at = NULL, last_error = NULL,
			updated_at = datetime('now') WHERE id = ?`).bind(JSON.stringify(result.state), result.remoteId, result.permalink, job.id).run();
		return { processed: true, ok: true, jobId: job.id, remoteId: result.remoteId, permalink: result.permalink };
	} catch (error) {
		await failJob(env.DB, job, error);
		return { processed: true, ok: false, jobId: job.id, error: error instanceof Error ? error.message : String(error) };
	}
}
