export const prerender = false;

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { logActivity } from '../../../../../lib/cms';
import { campaignAction, SocialError, type SocialPlatform } from '../../../../../lib/socialScheduler';

const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
	status,
	headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

export const POST: APIRoute = async ({ request, locals, params }) => {
	if (!locals.user || locals.user.role !== 'admin') return response({ error: 'Forbidden' }, 403);
	try {
		const body = await request.json() as { action?: string; platform?: SocialPlatform };
		const action = String(body.action || '');
		const campaign = await campaignAction(env.DB, params.id || '', action, body.platform);
		await logActivity(env.DB, {
			userId: locals.user.id, userName: locals.user.name,
			action: `${action.replace('-', '_')}_social_campaign`, entityType: 'social_campaign',
			entityId: campaign.id, entityTitle: campaign.promptSlug,
			details: body.platform || undefined,
		});
		return response({ campaign });
	} catch (error) {
		const status = error instanceof SocialError ? error.status : 400;
		return response({ error: error instanceof Error ? error.message : 'Unable to update campaign.' }, status);
	}
};
