export const prerender = false;

import type { APIRoute } from 'astro';
import { subscribe } from '../../lib/subscribers';

function json(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});
}

export const POST: APIRoute = async ({ request }) => {
	let body: any;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid request.' }, 400);
	}

	const email = typeof body?.email === 'string' ? body.email : '';
	if (!email.trim()) return json({ error: 'Please enter your email.' }, 400);

	try {
		const result = await subscribe(email, {
			ip: request.headers.get('CF-Connecting-IP') ?? undefined,
			userAgent: request.headers.get('User-Agent') ?? undefined,
		});

		if (!result.ok) return json({ error: result.error }, 400);

		const message =
			result.status === 'already-confirmed'
				? "You're already subscribed — thanks!"
				: 'Almost there — check your inbox to confirm.';
		return json({ success: true, message });
	} catch (err: any) {
		console.error('subscribe error:', err?.code || '', err?.message || err);
		return json({ error: 'Something went wrong. Please try again.' }, 500);
	}
};
