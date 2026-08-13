export const prerender = false;

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getSocialHealth } from '../../../../lib/socialScheduler';

export const GET: APIRoute = async ({ locals }) => {
	if (!locals.user || locals.user.role !== 'admin') {
		return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
	}
	const health = await getSocialHealth(env);
	return new Response(JSON.stringify(health), {
		status: health.ok ? 200 : 503,
		headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
	});
};
