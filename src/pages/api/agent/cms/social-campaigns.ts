export const prerender = false;

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getAgentActor, requireAgentAuth } from '../../../../lib/agentAuth';
import { logActivity } from '../../../../lib/cms';
import { createCampaign, SocialError } from '../../../../lib/socialScheduler';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
	status,
	headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

export const POST: APIRoute = async ({ request, locals }) => {
	const unauthorized = await requireAgentAuth(request);
	if (unauthorized) return unauthorized;

	try {
		const actor = await getAgentActor(env.DB);
		// The batch agent preflights every final JPEG externally. A Worker cannot
		// reliably HEAD its own custom-domain CDN without recursive edge failures.
		const result = await createCampaign(env.DB, await request.json(), actor.id,
			async () => new Response(null, { headers: { 'Content-Type': 'image/jpeg' } }));
		if (result.created && result.campaign) {
			await logActivity(env.DB, {
				userId: actor.id,
				userName: actor.name,
				action: 'create_social_campaign',
				entityType: 'social_campaign',
				entityId: result.campaign.id,
				entityTitle: result.campaign.promptSlug,
				details: 'Created by the authenticated social batch agent.',
			});
		}
		return json(result, result.created ? 201 : 200);
	} catch (error) {
		return json({ error: error instanceof Error ? error.message : 'Unable to create campaign.' },
			error instanceof SocialError ? error.status : 400);
	}
};
