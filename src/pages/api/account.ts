export const prerender = false;

import type { APIRoute } from 'astro';
import { isUsernameAvailable, updateUserProfile, validateUsername } from '../../lib/users';

export const GET: APIRoute = async ({ url, locals }) => {
	if (!locals.user) {
		return new Response(JSON.stringify({ error: 'Authentication required' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const check = url.searchParams.get('check');
	if (check) {
		const candidate = check.toLowerCase();
		const validationError = validateUsername(candidate);
		if (validationError) {
			return new Response(JSON.stringify({ available: false, reason: validationError }), {
				headers: { 'Content-Type': 'application/json' },
			});
		}
		const available = await isUsernameAvailable(candidate, locals.user.id);
		return new Response(JSON.stringify({
			available,
			reason: available ? 'Available.' : 'That username is already taken.',
		}), {
			headers: { 'Content-Type': 'application/json' },
		});
	}

	return new Response(JSON.stringify({ error: 'Bad request' }), {
		status: 400,
		headers: { 'Content-Type': 'application/json' },
	});
};

export const POST: APIRoute = async ({ request, locals }) => {
	if (!locals.user) {
		return new Response(JSON.stringify({ error: 'Authentication required' }), {
			status: 401,
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

	const patch: { username?: string; bio?: string; twitter?: string; instagram?: string; website?: string } = {};
	if (typeof body.username === 'string') patch.username = body.username;
	if (typeof body.bio === 'string') patch.bio = body.bio;
	if (typeof body.twitter === 'string') patch.twitter = body.twitter;
	if (typeof body.instagram === 'string') patch.instagram = body.instagram;
	if (typeof body.website === 'string') patch.website = body.website;

	const result = await updateUserProfile(locals.user.id, patch);

	if (!result.ok) {
		return new Response(JSON.stringify({ ok: false, error: result.error, field: result.field }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	return new Response(JSON.stringify({
		ok: true,
		username: result.username,
		bio: result.bio,
		twitter: result.twitter,
		instagram: result.instagram,
		website: result.website,
	}), {
		headers: { 'Content-Type': 'application/json' },
	});
};
