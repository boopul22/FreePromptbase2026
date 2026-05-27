export const prerender = false;

import type { APIRoute } from 'astro';
import { reviewPrompt } from '../../../../../lib/prompts';

// Admin-only — the /api/admin/* path is already gated by middleware, but we
// re-check defensively in case routing changes.
export const PATCH: APIRoute = async ({ request, params, locals }) => {
	if (!locals.user || locals.user.role !== 'admin') {
		return new Response(JSON.stringify({ error: 'Forbidden' }), {
			status: 403,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const slug = params.slug;
	if (!slug) {
		return new Response(JSON.stringify({ error: 'Missing slug' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	let body: any;
	try {
		body = await request.json();
	} catch {
		return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const action = body.action;
	if (action !== 'approve' && action !== 'reject') {
		return new Response(JSON.stringify({ error: "action must be 'approve' or 'reject'" }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const reason = typeof body.reason === 'string' ? body.reason : undefined;

	const result = await reviewPrompt(
		slug,
		action,
		{ id: locals.user.id, name: locals.user.name },
		reason,
	);

	if (!result.ok) {
		return new Response(JSON.stringify({ error: result.error }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	return new Response(JSON.stringify({ success: true, status: result.status }), {
		headers: { 'Content-Type': 'application/json' },
	});
};
