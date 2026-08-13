export const prerender = false;

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { logActivity } from '../../../../lib/cms';
import { getCampaign, SocialError, updateCampaign } from '../../../../lib/socialScheduler';

const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
	status,
	headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

export const GET: APIRoute = async ({ locals, params }) => {
	if (!locals.user || locals.user.role !== 'admin') return response({ error: 'Forbidden' }, 403);
	const campaign = await getCampaign(env.DB, params.id || '');
	return campaign ? response({ campaign }) : response({ error: 'Campaign not found.' }, 404);
};

export const PATCH: APIRoute = async ({ request, locals, params }) => {
	if (!locals.user || locals.user.role !== 'admin') return response({ error: 'Forbidden' }, 403);
	try {
		const campaign = await updateCampaign(env.DB, params.id || '', await request.json());
		await logActivity(env.DB, {
			userId: locals.user.id, userName: locals.user.name,
			action: 'update_social_campaign', entityType: 'social_campaign',
			entityId: campaign.id, entityTitle: campaign.promptSlug,
		});
		return response({ campaign });
	} catch (error) {
		const status = error instanceof SocialError ? error.status : 400;
		return response({ error: error instanceof Error ? error.message : 'Unable to update campaign.' }, status);
	}
};
