export const prerender = false;

import type { APIRoute } from 'astro';
import { submitPrompt, getCategoryBySlug } from '../../lib/prompts';

export const POST: APIRoute = async ({ request, locals }) => {
	// Middleware enforces auth, but double-check defensively.
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

	const title = typeof body.title === 'string' ? body.title.trim() : '';
	const promptText = typeof body.promptText === 'string' ? body.promptText : '';
	const category = typeof body.category === 'string' ? body.category : '';

	if (!title || !promptText.trim() || !category) {
		return new Response(JSON.stringify({ error: 'Title, prompt text and category are required.' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	// Validate category exists.
	const cat = await getCategoryBySlug(category);
	if (!cat) {
		return new Response(JSON.stringify({ error: 'Invalid category.' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const tags = Array.isArray(body.tags)
		? body.tags.filter((t: unknown): t is string => typeof t === 'string' && t.trim().length > 0).slice(0, 12)
		: [];

	try {
		const { slug } = await submitPrompt(
			{
				title,
				description: typeof body.description === 'string' ? body.description : '',
				promptText,
				category,
				tags,
				howToUse: typeof body.howToUse === 'string' ? body.howToUse : undefined,
				coverImage: typeof body.coverImage === 'string' ? body.coverImage : undefined,
				slug: typeof body.slug === 'string' ? body.slug : undefined,
			},
			{ id: locals.user.id, name: locals.user.name },
		);

		const redirect = locals.user.username
			? `/author/${locals.user.username}?submitted=${slug}`
			: `/account?submitted=${slug}`;

		return new Response(JSON.stringify({ success: true, slug, status: 'pending', redirect }), {
			status: 201,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err: any) {
		console.error('submit-prompt error:', err);
		return new Response(JSON.stringify({ error: err?.message || 'Submission failed.' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};
