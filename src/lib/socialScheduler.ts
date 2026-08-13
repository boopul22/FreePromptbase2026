export type SocialPlatform = 'instagram' | 'facebook';
export type CampaignStatus = 'scheduled' | 'publishing' | 'partial' | 'published' | 'failed' | 'canceled';
export type DeliveryStatus = 'scheduled' | 'running' | 'retrying' | 'published' | 'failed' | 'canceled';

export interface SocialEnv {
	DB: D1Database;
	IG_ACCESS_TOKEN: string;
	IG_USER_ID: string;
	FB_PAGE_ACCESS_TOKEN: string;
	FB_PAGE_ID: string;
	META_API_VERSION?: string;
	IG_API_HOST?: string;
	FB_API_HOST?: string;
}

export interface SocialMedia {
	url: string;
	role: string;
	altText: string;
}

export interface CampaignInput {
	idempotencyKey: string;
	canonicalUrl: string;
	scheduledAt: string;
	media: SocialMedia[];
	instagram: { caption: string };
	facebook: { message: string };
}

export interface Delivery {
	platform: SocialPlatform;
	content: string;
	status: DeliveryStatus;
	attempts: number;
	nextAttemptAt: string | null;
	state: Record<string, unknown>;
	remoteId: string | null;
	permalink: string | null;
	lastError: string | null;
	publishedAt: string | null;
}

export interface Campaign {
	id: string;
	idempotencyKey: string;
	promptSlug: string;
	canonicalUrl: string;
	media: SocialMedia[];
	scheduledAt: string;
	status: CampaignStatus;
	createdBy: string;
	createdAt: string;
	updatedAt: string;
	deliveries: Delivery[];
}

export class SocialError extends Error {
	status: number;
	constructor(message: string, status = 400) {
		super(message);
		this.status = status;
	}
}

export class MetaError extends Error {
	transient: boolean;
	platform?: SocialPlatform;
	constructor(
		message: string,
		transient = false,
		platform?: SocialPlatform,
	) {
		super(message);
		this.transient = transient;
		this.platform = platform;
	}
}

const json = (raw: unknown, fallback: unknown) => {
	try { return JSON.parse(String(raw)); } catch { return fallback; }
};

const sqlTime = (date: Date) => date.toISOString().slice(0, 19).replace('T', ' ');
const isoTime = (raw: string | null) => raw ? `${raw.replace(' ', 'T')}Z` : null;

export function normalizeCampaignInput(raw: unknown, now = Date.now()): CampaignInput & { promptSlug: string; scheduledSql: string } {
	if (!raw || typeof raw !== 'object') throw new SocialError('Campaign body must be an object.');
	const value = raw as Record<string, any>;
	const idempotencyKey = String(value.idempotencyKey || '').trim();
	if (!/^[A-Za-z0-9._:-]{8,200}$/.test(idempotencyKey)) {
		throw new SocialError('idempotencyKey must be 8-200 safe characters.');
	}

	let canonical: URL;
	try { canonical = new URL(String(value.canonicalUrl || '')); }
	catch { throw new SocialError('canonicalUrl must be a valid URL.'); }
	const slugMatch = canonical.pathname.match(/^\/([a-z0-9-]+)\/?$/);
	if (canonical.protocol !== 'https:' || canonical.hostname !== 'freepromptbase.com' || !slugMatch) {
		throw new SocialError('canonicalUrl must be https://freepromptbase.com/<slug>.');
	}
	canonical.hash = '';
	canonical.search = '';
	canonical.pathname = `/${slugMatch[1]}`;

	const scheduledRaw = String(value.scheduledAt || '').trim();
	if (!/(Z|[+-]\d{2}:\d{2})$/i.test(scheduledRaw)) throw new SocialError('scheduledAt must include a timezone.');
	const scheduledMs = Date.parse(scheduledRaw);
	if (Number.isNaN(scheduledMs) || scheduledMs < now - 60_000) throw new SocialError('scheduledAt must be now or in the future.');

	if (!Array.isArray(value.media) || value.media.length < 1 || value.media.length > 10) {
		throw new SocialError('media must contain 1 to 10 images.');
	}
	const media = value.media.map((item: any, index: number): SocialMedia => {
		let url: URL;
		try { url = new URL(String(item?.url || '')); }
		catch { throw new SocialError(`media[${index}].url must be a valid URL.`); }
		if (
			url.protocol !== 'https:' ||
			url.hostname !== 'freepromptbase.com' ||
			!(url.pathname.startsWith('/cdn/') || url.pathname.startsWith('/cdn-cgi/image/'))
		) throw new SocialError(`media[${index}].url must be a Free Prompt Base CDN URL.`);
		const altText = String(item?.altText || '').trim();
		if (!altText || altText.length > 1000) throw new SocialError(`media[${index}].altText is required and must be at most 1000 characters.`);
		return { url: url.toString(), role: String(item?.role || `image-${index + 1}`).trim(), altText };
	});

	const instagram = { caption: String(value.instagram?.caption || '').trim() };
	if (!instagram.caption || instagram.caption.length > 2200) throw new SocialError('Instagram caption is required and must be at most 2,200 characters.');
	const facebook = { message: String(value.facebook?.message || '').trim() };
	if (!facebook.message) throw new SocialError('Facebook message is required.');
	if (!facebook.message.includes(canonical.toString())) throw new SocialError('Facebook message must include the canonical prompt URL.');

	return {
		idempotencyKey,
		canonicalUrl: canonical.toString(),
		promptSlug: slugMatch[1],
		scheduledAt: new Date(scheduledMs).toISOString(),
		scheduledSql: sqlTime(new Date(scheduledMs)),
		media,
		instagram,
		facebook,
	};
}

export async function validateMediaAvailability(media: SocialMedia[], fetcher: typeof fetch = fetch): Promise<void> {
	await Promise.all(media.map(async (item, index) => {
		let response: Response;
		try { response = await fetcher(item.url, { method: 'HEAD', redirect: 'follow' }); }
		catch { throw new SocialError(`media[${index}] is not publicly reachable.`); }
		const type = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
		if (!response.ok || type !== 'image/jpeg') throw new SocialError(`media[${index}] must return a public image/jpeg response.`);
	}));
}

async function sha256(value: unknown): Promise<string> {
	const bytes = new TextEncoder().encode(JSON.stringify(value));
	return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
		.map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function mapDelivery(row: any): Delivery {
	return {
		platform: row.platform,
		content: row.content,
		status: row.status,
		attempts: Number(row.attempts || 0),
		nextAttemptAt: isoTime(row.next_attempt_at),
		state: json(row.state_json, {}) as Record<string, unknown>,
		remoteId: row.remote_id || null,
		permalink: row.permalink || null,
		lastError: row.last_error || null,
		publishedAt: isoTime(row.published_at),
	};
}

function mapCampaign(row: any, deliveries: Delivery[]): Campaign {
	return {
		id: row.id,
		idempotencyKey: row.idempotency_key,
		promptSlug: row.prompt_slug,
		canonicalUrl: row.canonical_url,
		media: json(row.media_json, []) as SocialMedia[],
		scheduledAt: isoTime(row.scheduled_at)!,
		status: row.status,
		createdBy: row.created_by,
		createdAt: isoTime(row.created_at)!,
		updatedAt: isoTime(row.updated_at)!,
		deliveries,
	};
}

export async function getCampaign(db: D1Database, id: string): Promise<Campaign | null> {
	const [campaign, deliveryRows] = await db.batch<any>([
		db.prepare('SELECT * FROM social_campaigns WHERE id = ?').bind(id),
		db.prepare('SELECT * FROM social_deliveries WHERE campaign_id = ? ORDER BY platform DESC').bind(id),
	]);
	const row = campaign.results?.[0];
	return row ? mapCampaign(row, (deliveryRows.results || []).map(mapDelivery)) : null;
}

export async function createCampaign(db: D1Database, raw: unknown, createdBy: string, fetcher: typeof fetch = fetch) {
	const key = String((raw as any)?.idempotencyKey || '').trim();
	if (!/^[A-Za-z0-9._:-]{8,200}$/.test(key)) throw new SocialError('idempotencyKey must be 8-200 safe characters.');
	const existing = await db.prepare('SELECT id, payload_hash FROM social_campaigns WHERE idempotency_key = ?')
		.bind(key).first<{ id: string; payload_hash: string }>();
	if (existing) {
		const repeatedInput = normalizeCampaignInput(raw, 0);
		const repeatedHash = await sha256(repeatedInput);
		if (existing.payload_hash !== repeatedHash) throw new SocialError('Idempotency key already belongs to a different campaign.', 409);
		return { created: false, campaign: await getCampaign(db, existing.id) };
	}
	const input = normalizeCampaignInput(raw);
	const hash = await sha256(input);
	await validateMediaAvailability(input.media, fetcher);
	const id = crypto.randomUUID();
	await db.batch([
		db.prepare(`INSERT INTO social_campaigns
			(id, idempotency_key, payload_hash, prompt_slug, canonical_url, media_json, scheduled_at, created_by)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
			.bind(id, input.idempotencyKey, hash, input.promptSlug, input.canonicalUrl, JSON.stringify(input.media), input.scheduledSql, createdBy),
		db.prepare(`INSERT INTO social_deliveries (campaign_id, platform, content) VALUES (?, 'instagram', ?)`)
			.bind(id, input.instagram.caption),
		db.prepare(`INSERT INTO social_deliveries (campaign_id, platform, content) VALUES (?, 'facebook', ?)`)
			.bind(id, input.facebook.message),
	]);
	return { created: true, campaign: await getCampaign(db, id) };
}

export async function listCampaigns(db: D1Database, options: {
	page?: number; limit?: number; status?: string; search?: string; from?: string; to?: string;
} = {}) {
	const page = Math.max(1, options.page || 1);
	const limit = Math.min(100, Math.max(1, options.limit || 25));
	const where: string[] = ['1=1'];
	const binds: unknown[] = [];
	if (options.status) { where.push('status = ?'); binds.push(options.status); }
	if (options.search) { where.push('(prompt_slug LIKE ? OR canonical_url LIKE ?)'); binds.push(`%${options.search}%`, `%${options.search}%`); }
	if (options.from) { where.push('scheduled_at >= ?'); binds.push(sqlTime(new Date(options.from))); }
	if (options.to) { where.push('scheduled_at <= ?'); binds.push(sqlTime(new Date(options.to))); }
	const clause = where.join(' AND ');
	const [count, campaigns, statusCounts] = await db.batch<any>([
		db.prepare(`SELECT COUNT(*) n FROM social_campaigns WHERE ${clause}`).bind(...binds),
		db.prepare(`SELECT * FROM social_campaigns WHERE ${clause} ORDER BY scheduled_at DESC LIMIT ? OFFSET ?`)
			.bind(...binds, limit, (page - 1) * limit),
		db.prepare('SELECT status, COUNT(*) n FROM social_campaigns GROUP BY status'),
	]);
	const rows = campaigns.results || [];
	const ids = rows.map((row: any) => row.id);
	let deliveryRows: any[] = [];
	if (ids.length) {
		const result = await db.prepare(`SELECT * FROM social_deliveries WHERE campaign_id IN (${ids.map(() => '?').join(',')}) ORDER BY platform DESC`)
			.bind(...ids).all<any>();
		deliveryRows = result.results || [];
	}
	const byCampaign = new Map<string, Delivery[]>();
	for (const row of deliveryRows) byCampaign.set(row.campaign_id, [...(byCampaign.get(row.campaign_id) || []), mapDelivery(row)]);
	return {
		campaigns: rows.map((row: any) => mapCampaign(row, byCampaign.get(row.id) || [])),
		total: Number(count.results?.[0]?.n || 0), page, limit,
		counts: Object.fromEntries((statusCounts.results || []).map((row: any) => [row.status, Number(row.n)])),
	};
}

export async function updateCampaign(db: D1Database, id: string, raw: unknown, fetcher: typeof fetch = fetch): Promise<Campaign> {
	const current = await getCampaign(db, id);
	if (!current) throw new SocialError('Campaign not found.', 404);
	if (current.status !== 'scheduled' || current.deliveries.some(delivery => delivery.attempts > 0)) {
		throw new SocialError('Only untouched scheduled campaigns can be edited.', 409);
	}
	const input = normalizeCampaignInput({ ...(raw as object), idempotencyKey: current.idempotencyKey });
	await validateMediaAvailability(input.media, fetcher);
	const hash = await sha256(input);
	await db.batch([
		db.prepare(`UPDATE social_campaigns SET payload_hash = ?, prompt_slug = ?, canonical_url = ?, media_json = ?, scheduled_at = ?, updated_at = datetime('now') WHERE id = ?`)
			.bind(hash, input.promptSlug, input.canonicalUrl, JSON.stringify(input.media), input.scheduledSql, id),
		db.prepare(`UPDATE social_deliveries SET content = ?, updated_at = datetime('now') WHERE campaign_id = ? AND platform = 'instagram'`)
			.bind(input.instagram.caption, id),
		db.prepare(`UPDATE social_deliveries SET content = ?, updated_at = datetime('now') WHERE campaign_id = ? AND platform = 'facebook'`)
			.bind(input.facebook.message, id),
	]);
	return (await getCampaign(db, id))!;
}

export async function campaignAction(db: D1Database, id: string, action: string, platform?: SocialPlatform): Promise<Campaign> {
	const campaign = await getCampaign(db, id);
	if (!campaign) throw new SocialError('Campaign not found.', 404);
	if (action === 'publish-now') {
		if (campaign.status !== 'scheduled' || campaign.deliveries.some(item => item.attempts > 0)) throw new SocialError('Only untouched scheduled campaigns can publish now.', 409);
		await db.prepare(`UPDATE social_campaigns SET scheduled_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`).bind(id).run();
	} else if (action === 'cancel') {
		if (campaign.status !== 'scheduled' || campaign.deliveries.some(item => item.attempts > 0)) throw new SocialError('Only untouched scheduled campaigns can be canceled.', 409);
		await db.batch([
			db.prepare(`UPDATE social_campaigns SET status = 'canceled', lease_expires_at = NULL, updated_at = datetime('now') WHERE id = ?`).bind(id),
			db.prepare(`UPDATE social_deliveries SET status = 'canceled', updated_at = datetime('now') WHERE campaign_id = ?`).bind(id),
		]);
	} else if (action === 'retry') {
		if (!platform) throw new SocialError('Retry requires instagram or facebook.');
		const delivery = campaign.deliveries.find(item => item.platform === platform);
		if (!delivery || delivery.status !== 'failed') throw new SocialError('Only failed deliveries can be retried.', 409);
		const instagramPublished = campaign.deliveries.find(item => item.platform === 'instagram')?.status === 'published';
		await db.batch([
			db.prepare(`UPDATE social_deliveries SET status = 'scheduled', attempts = 0, next_attempt_at = datetime('now'), last_error = NULL, updated_at = datetime('now') WHERE campaign_id = ? AND platform = ?`).bind(id, platform),
			db.prepare(`UPDATE social_campaigns SET status = ?, lease_expires_at = NULL, updated_at = datetime('now') WHERE id = ?`).bind(instagramPublished ? 'partial' : 'scheduled', id),
		]);
	} else throw new SocialError('Unknown campaign action.');
	return (await getCampaign(db, id))!;
}

type MetaParams = Record<string, string | number | boolean | object | undefined>;

async function metaRequest(
	host: string, version: string, token: string, method: 'GET' | 'POST', path: string,
	params: MetaParams = {}, fetcher: typeof fetch = fetch,
): Promise<any> {
	const encoded = new URLSearchParams();
	for (const [key, value] of Object.entries(params)) {
		if (value !== undefined) encoded.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
	}
	const url = `${host.replace(/\/$/, '')}/${version.replace(/^\//, '')}/${path.replace(/^\//, '')}`;
	let response: Response;
	try {
		response = await fetcher(method === 'GET' && encoded.size ? `${url}?${encoded}` : url, {
			method,
			headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', ...(method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}) },
			body: method === 'POST' ? encoded : undefined,
		});
	} catch (error) {
		throw new MetaError(`Meta network error: ${error instanceof Error ? error.message : 'request failed'}`, true);
	}
	let body: any;
	try { body = await response.json(); }
	catch { throw new MetaError(`Meta returned HTTP ${response.status} without JSON.`, response.status === 429 || response.status >= 500); }
	if (!response.ok || body.error) {
		const error = body.error || {};
		throw new MetaError(
			`${String(error.message || `Meta HTTP ${response.status}`)}${error.code ? ` | code=${error.code}` : ''}`,
			Boolean(error.is_transient) || response.status === 429 || response.status >= 500,
		);
	}
	return body;
}

const metaConfig = (env: SocialEnv) => ({
	version: env.META_API_VERSION || 'v25.0',
	igHost: env.IG_API_HOST || 'https://graph.instagram.com',
	fbHost: env.FB_API_HOST || 'https://graph.facebook.com',
});

async function instagramHealth(env: SocialEnv, fetcher = fetch) {
	if (!env.IG_ACCESS_TOKEN || !env.IG_USER_ID) throw new MetaError('Instagram Worker secrets are missing.', false, 'instagram');
	const config = metaConfig(env);
	try {
		const account = await metaRequest(config.igHost, config.version, env.IG_ACCESS_TOKEN, 'GET', env.IG_USER_ID, { fields: 'id,username,account_type' }, fetcher);
		if (String(account.id) !== String(env.IG_USER_ID) || account.username !== 'freepromptbase') throw new MetaError('Instagram account does not match the freepromptbase allowlist.');
		let quota = null;
		try { quota = await metaRequest(config.igHost, config.version, env.IG_ACCESS_TOKEN, 'GET', `${env.IG_USER_ID}/content_publishing_limit`, { fields: 'quota_usage' }, fetcher); }
		catch {}
		return { id: account.id, username: account.username, accountType: account.account_type, quota: quota?.data?.[0]?.quota_usage ?? null };
	} catch (error) {
		if (error instanceof MetaError) error.platform = 'instagram';
		throw error;
	}
}

async function resolveFacebookPage(env: SocialEnv, fetcher = fetch) {
	if (!env.FB_PAGE_ACCESS_TOKEN || !env.FB_PAGE_ID) throw new MetaError('Facebook Worker secrets/configuration are missing.', false, 'facebook');
	const config = metaConfig(env);
	try {
		const result = await metaRequest(config.fbHost, config.version, env.FB_PAGE_ACCESS_TOKEN, 'GET', 'me/accounts', {
			fields: 'id,name,access_token,tasks', limit: 100,
		}, fetcher);
		const page = (result.data || []).find((item: any) => String(item.id) === String(env.FB_PAGE_ID));
		if (!page || page.name !== 'Free Prompt Base' || !page.access_token || !Array.isArray(page.tasks) || !page.tasks.includes('CREATE_CONTENT')) {
			throw new MetaError('Facebook Page credential does not match the allowlist or lacks CREATE_CONTENT.');
		}
		return { id: String(page.id), name: page.name, tasks: page.tasks as string[], token: String(page.access_token) };
	} catch (error) {
		if (error instanceof MetaError) error.platform = 'facebook';
		throw error;
	}
}

export async function getSocialHealth(env: SocialEnv, fetcher: typeof fetch = fetch) {
	const [instagram, facebook] = await Promise.allSettled([instagramHealth(env, fetcher), resolveFacebookPage(env, fetcher)]);
	return {
		ok: instagram.status === 'fulfilled' && facebook.status === 'fulfilled',
		instagram: instagram.status === 'fulfilled' ? { ok: true, ...instagram.value } : { ok: false, error: instagram.reason instanceof Error ? instagram.reason.message : 'Instagram check failed.' },
		facebook: facebook.status === 'fulfilled' ? { ok: true, id: facebook.value.id, name: facebook.value.name, tasks: facebook.value.tasks } : { ok: false, error: facebook.reason instanceof Error ? facebook.reason.message : 'Facebook check failed.' },
	};
}

async function saveState(db: D1Database, campaignId: string, platform: SocialPlatform, state: Record<string, unknown>) {
	await db.prepare(`UPDATE social_deliveries SET state_json = ?, updated_at = datetime('now') WHERE campaign_id = ? AND platform = ?`)
		.bind(JSON.stringify(state), campaignId, platform).run();
}

const delay = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds));

async function waitForContainer(env: SocialEnv, containerId: string, fetcher: typeof fetch) {
	const config = metaConfig(env);
	const deadline = Date.now() + 300_000;
	while (Date.now() < deadline) {
		const result = await metaRequest(config.igHost, config.version, env.IG_ACCESS_TOKEN, 'GET', containerId, { fields: 'id,status,status_code' }, fetcher);
		const status = String(result.status_code || '').toUpperCase();
		if (status === 'FINISHED') return;
		if (status === 'ERROR' || status === 'EXPIRED') throw new MetaError(`Instagram container failed: ${result.status || status}`, false, 'instagram');
		await delay(5_000);
	}
	throw new MetaError('Instagram container processing timed out.', true, 'instagram');
}

async function reconcileInstagram(env: SocialEnv, caption: string, startedAt: string, count: number, fetcher: typeof fetch) {
	const config = metaConfig(env);
	const result = await metaRequest(config.igHost, config.version, env.IG_ACCESS_TOKEN, 'GET', `${env.IG_USER_ID}/media`, {
		fields: 'id,caption,timestamp,permalink,media_type,children.limit(10){id}', limit: 25,
	}, fetcher);
	const cutoff = Date.parse(startedAt) - 300_000;
	const matches = (result.data || []).filter((item: any) =>
		item.caption === caption && Date.parse(item.timestamp) >= cutoff &&
		(count === 1 || Number(item.children?.data?.length || 0) === count));
	return matches.length === 1 ? matches[0] : null;
}

export async function publishInstagram(env: SocialEnv, campaign: Campaign, delivery: Delivery, fetcher: typeof fetch) {
	const config = metaConfig(env);
	const state: any = { ...delivery.state, startedAt: delivery.state.startedAt || new Date().toISOString() };
	await saveState(env.DB, campaign.id, 'instagram', state);
	if (campaign.media.length === 1) {
		if (!state.parentContainerId) {
			const created = await metaRequest(config.igHost, config.version, env.IG_ACCESS_TOKEN, 'POST', `${env.IG_USER_ID}/media`, {
				image_url: campaign.media[0].url, caption: delivery.content, alt_text: campaign.media[0].altText,
			}, fetcher);
			state.parentContainerId = String(created.id);
			await saveState(env.DB, campaign.id, 'instagram', state);
		}
	} else {
		state.childContainerIds ||= [];
		for (let index = state.childContainerIds.length; index < campaign.media.length; index++) {
			const item = campaign.media[index];
			const created = await metaRequest(config.igHost, config.version, env.IG_ACCESS_TOKEN, 'POST', `${env.IG_USER_ID}/media`, {
				image_url: item.url, is_carousel_item: true, alt_text: item.altText,
			}, fetcher);
			state.childContainerIds[index] = String(created.id);
			await saveState(env.DB, campaign.id, 'instagram', state);
		}
		if (!state.parentContainerId) {
			const created = await metaRequest(config.igHost, config.version, env.IG_ACCESS_TOKEN, 'POST', `${env.IG_USER_ID}/media`, {
				media_type: 'CAROUSEL', children: state.childContainerIds.join(','), caption: delivery.content,
			}, fetcher);
			state.parentContainerId = String(created.id);
			await saveState(env.DB, campaign.id, 'instagram', state);
		}
	}
	await waitForContainer(env, state.parentContainerId, fetcher);
	let media: any = null;
	try {
		media = await metaRequest(config.igHost, config.version, env.IG_ACCESS_TOKEN, 'POST', `${env.IG_USER_ID}/media_publish`, { creation_id: state.parentContainerId }, fetcher);
	} catch (error) {
		media = await reconcileInstagram(env, delivery.content, state.startedAt, campaign.media.length, fetcher);
		if (!media) throw error;
	}
	const mediaId = String(media.id);
	const details = media.permalink ? media : await metaRequest(config.igHost, config.version, env.IG_ACCESS_TOKEN, 'GET', mediaId, { fields: 'id,permalink,timestamp' }, fetcher);
	return { remoteId: mediaId, permalink: details.permalink || null, state: { ...state, mediaId } };
}

async function reconcileFacebook(env: SocialEnv, token: string, message: string, startedAt: string, fetcher: typeof fetch) {
	const config = metaConfig(env);
	const result = await metaRequest(config.fbHost, config.version, token, 'GET', `${env.FB_PAGE_ID}/feed`, {
		fields: 'id,message,created_time,permalink_url', limit: 25,
	}, fetcher);
	const cutoff = Date.parse(startedAt) - 300_000;
	const matches = (result.data || []).filter((item: any) => item.message === message && Date.parse(item.created_time) >= cutoff);
	return matches.length === 1 ? matches[0] : null;
}

export async function publishFacebook(env: SocialEnv, pageToken: string, campaign: Campaign, delivery: Delivery, fetcher: typeof fetch) {
	const config = metaConfig(env);
	const state: any = { ...delivery.state, startedAt: delivery.state.startedAt || new Date().toISOString(), photoIds: (delivery.state.photoIds as string[]) || [] };
	await saveState(env.DB, campaign.id, 'facebook', state);
	for (let index = state.photoIds.length; index < campaign.media.length; index++) {
		const item = campaign.media[index];
		const uploaded = await metaRequest(config.fbHost, config.version, pageToken, 'POST', `${env.FB_PAGE_ID}/photos`, {
			url: item.url, published: false, alt_text_custom: item.altText,
		}, fetcher);
		state.photoIds[index] = String(uploaded.id);
		await saveState(env.DB, campaign.id, 'facebook', state);
	}
	let post: any = null;
	try {
		post = await metaRequest(config.fbHost, config.version, pageToken, 'POST', `${env.FB_PAGE_ID}/feed`, {
			message: delivery.content,
			attached_media: state.photoIds.map((media_fbid: string) => ({ media_fbid })),
		}, fetcher);
	} catch (error) {
		post = await reconcileFacebook(env, pageToken, delivery.content, state.startedAt, fetcher);
		if (!post) throw error;
	}
	const postId = String(post.id);
	const details = post.permalink_url ? post : await metaRequest(config.fbHost, config.version, pageToken, 'GET', postId, { fields: 'id,permalink_url,is_published' }, fetcher);
	return { remoteId: postId, permalink: details.permalink_url || null, state: { ...state, postId } };
}

async function finishDelivery(db: D1Database, campaignId: string, platform: SocialPlatform, result: { remoteId: string; permalink: string | null; state: object }) {
	await db.prepare(`UPDATE social_deliveries SET status = 'published', state_json = ?, remote_id = ?, permalink = ?, last_error = NULL, next_attempt_at = NULL, published_at = datetime('now'), updated_at = datetime('now') WHERE campaign_id = ? AND platform = ?`)
		.bind(JSON.stringify(result.state), result.remoteId, result.permalink, campaignId, platform).run();
}

async function failDelivery(db: D1Database, campaignId: string, platform: SocialPlatform, error: unknown) {
	const row = await db.prepare('SELECT attempts FROM social_deliveries WHERE campaign_id = ? AND platform = ?').bind(campaignId, platform).first<{ attempts: number }>();
	const attempts = Number(row?.attempts || 1);
	const retry = retryDisposition(attempts, error instanceof MetaError && error.transient);
	await db.prepare(`UPDATE social_deliveries SET status = ?, next_attempt_at = ?, last_error = ?, updated_at = datetime('now') WHERE campaign_id = ? AND platform = ?`)
		.bind(retry.status, retry.delaySeconds ? sqlTime(new Date(Date.now() + retry.delaySeconds * 1000)) : null, (error instanceof Error ? error.message : String(error)).slice(0, 4000), campaignId, platform).run();
}

export function retryDisposition(attempts: number, transient: boolean): { status: 'retrying' | 'failed'; delaySeconds: number | null } {
	return transient && attempts < 5
		? { status: 'retrying', delaySeconds: Math.min(60 * 2 ** Math.max(0, attempts - 1), 3600) }
		: { status: 'failed', delaySeconds: null };
}

export function deriveCampaignStatus(statuses: DeliveryStatus[]): CampaignStatus {
	if (statuses.every(value => value === 'published')) return 'published';
	if (statuses.includes('published')) return 'partial';
	if (statuses.includes('failed')) return 'failed';
	if (statuses.every(value => value === 'canceled')) return 'canceled';
	return 'scheduled';
}

async function aggregateCampaign(db: D1Database, campaignId: string) {
	const result = await db.prepare('SELECT status FROM social_deliveries WHERE campaign_id = ?').bind(campaignId).all<{ status: DeliveryStatus }>();
	const statuses = (result.results || []).map(row => row.status);
	const status = deriveCampaignStatus(statuses);
	await db.prepare('UPDATE social_campaigns SET status = ?, lease_expires_at = NULL, updated_at = datetime(\'now\') WHERE id = ?').bind(status, campaignId).run();
}

export async function claimDueCampaign(db: D1Database, now = new Date()): Promise<Campaign | null> {
	const current = sqlTime(now);
	await db.batch([
		db.prepare(`UPDATE social_deliveries SET status = 'retrying', next_attempt_at = ?, last_error = 'Recovered stale Worker lease', updated_at = datetime('now')
			WHERE status = 'running' AND campaign_id IN (SELECT id FROM social_campaigns WHERE status = 'publishing' AND lease_expires_at <= ?)`)
			.bind(current, current),
		db.prepare(`UPDATE social_campaigns SET status = CASE WHEN EXISTS (SELECT 1 FROM social_deliveries d WHERE d.campaign_id = social_campaigns.id AND d.status = 'published') THEN 'partial' ELSE 'scheduled' END,
			lease_expires_at = NULL, updated_at = datetime('now') WHERE status = 'publishing' AND lease_expires_at <= ?`).bind(current),
	]);
	const candidate = await db.prepare(`SELECT c.id FROM social_campaigns c
		WHERE c.status IN ('scheduled', 'partial') AND c.scheduled_at <= ?
		AND (c.lease_expires_at IS NULL OR c.lease_expires_at <= ?)
		AND (
			EXISTS (SELECT 1 FROM social_deliveries ig WHERE ig.campaign_id = c.id AND ig.platform = 'instagram' AND ig.status IN ('scheduled', 'retrying') AND (ig.next_attempt_at IS NULL OR ig.next_attempt_at <= ?))
			OR (
				EXISTS (SELECT 1 FROM social_deliveries ig WHERE ig.campaign_id = c.id AND ig.platform = 'instagram' AND ig.status = 'published')
				AND EXISTS (SELECT 1 FROM social_deliveries fb WHERE fb.campaign_id = c.id AND fb.platform = 'facebook' AND fb.status IN ('scheduled', 'retrying') AND (fb.next_attempt_at IS NULL OR fb.next_attempt_at <= ?))
			)
		)
		ORDER BY c.scheduled_at LIMIT 1`).bind(current, current, current, current).first<{ id: string }>();
	if (!candidate) return null;
	const lease = sqlTime(new Date(now.getTime() + 15 * 60_000));
	const claimed = await db.prepare(`UPDATE social_campaigns SET status = 'publishing', lease_expires_at = ?, updated_at = datetime('now')
		WHERE id = ? AND status IN ('scheduled', 'partial') AND (lease_expires_at IS NULL OR lease_expires_at <= ?)`)
		.bind(lease, candidate.id, current).run();
	if (!claimed.meta.changes) return null;
	return getCampaign(db, candidate.id);
}

export async function processDueCampaign(env: SocialEnv, fetcher: typeof fetch = fetch) {
	const campaign = await claimDueCampaign(env.DB);
	if (!campaign) return { processed: false };
	let page: Awaited<ReturnType<typeof resolveFacebookPage>> | null = null;
	try {
		await instagramHealth(env, fetcher);
		page = await resolveFacebookPage(env, fetcher);
	} catch (error) {
		const platform = error instanceof MetaError && error.platform ? error.platform : 'instagram';
		await env.DB.prepare(`UPDATE social_deliveries SET attempts = attempts + 1, status = 'running', updated_at = datetime('now') WHERE campaign_id = ? AND platform = ? AND status != 'published'`).bind(campaign.id, platform).run();
		await failDelivery(env.DB, campaign.id, platform, error);
		await aggregateCampaign(env.DB, campaign.id);
		return { processed: true, ok: false, campaignId: campaign.id, error: error instanceof Error ? error.message : String(error) };
	}

	for (const platform of ['instagram', 'facebook'] as const) {
		const fresh = await getCampaign(env.DB, campaign.id);
		const delivery = fresh?.deliveries.find(item => item.platform === platform);
		if (!fresh || !delivery || delivery.status === 'published') continue;
		if (platform === 'facebook' && fresh.deliveries.find(item => item.platform === 'instagram')?.status !== 'published') break;
		await env.DB.prepare(`UPDATE social_deliveries SET status = 'running', attempts = attempts + 1, updated_at = datetime('now') WHERE campaign_id = ? AND platform = ?`).bind(fresh.id, platform).run();
		try {
			const running = (await getCampaign(env.DB, fresh.id))!.deliveries.find(item => item.platform === platform)!;
			const result = platform === 'instagram'
				? await publishInstagram(env, fresh, running, fetcher)
				: await publishFacebook(env, page!.token, fresh, running, fetcher);
			await finishDelivery(env.DB, fresh.id, platform, result);
		} catch (error) {
			await failDelivery(env.DB, fresh.id, platform, error);
			break;
		}
	}
	await aggregateCampaign(env.DB, campaign.id);
	return { processed: true, ok: (await getCampaign(env.DB, campaign.id))?.status === 'published', campaignId: campaign.id };
}
