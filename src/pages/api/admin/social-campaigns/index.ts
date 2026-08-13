export const prerender = false;

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { logActivity } from '../../../../lib/cms';
import { createCampaign, listCampaigns, SocialError } from '../../../../lib/socialScheduler';

const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
	status,
	headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

export const GET: APIRoute = async ({ locals, url }) => {
	if (!locals.user || locals.user.role !== 'admin') return response({ error: 'Forbidden' }, 403);
	try {
		return response(await listCampaigns(env.DB, {
			page: Number(url.searchParams.get('page') || 1),
			limit: Number(url.searchParams.get('limit') || 25),
			status: url.searchParams.get('status') || undefined,
			search: url.searchParams.get('search') || undefined,
			from: url.searchParams.get('from') || undefined,
			to: url.searchParams.get('to') || undefined,
		}));
	} catch (error) {
		return response({ error: error instanceof Error ? error.message : 'Unable to list campaigns.' }, 400);
	}
};

export const POST: APIRoute = async ({ request, locals }) => {
	if (!locals.user || locals.user.role !== 'admin') return response({ error: 'Forbidden' }, 403);
	try {
		const result = await createCampaign(env.DB, await request.json(), locals.user.id);
		if (result.created && result.campaign) {
			await logActivity(env.DB, {
				userId: locals.user.id, userName: locals.user.name,
				action: 'create_social_campaign', entityType: 'social_campaign',
				entityId: result.campaign.id, entityTitle: result.campaign.promptSlug,
			});
		}
		return response(result, result.created ? 201 : 200);
	} catch (error) {
		const status = error instanceof SocialError ? error.status : 400;
		return response({ error: error instanceof Error ? error.message : 'Unable to create campaign.' }, status);
	}
};
