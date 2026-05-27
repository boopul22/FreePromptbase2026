export const prerender = false;

import type { APIRoute } from 'astro';
import { submitPrompt, getCategoryBySlug } from '../../lib/prompts';
import { verifyCaptcha, captchaErrorMessage } from '../../lib/captcha';
import { getEnv } from '../../lib/env';

const MAX_IMAGES = 3;

function jsonError(error: string, status = 400, extra: Record<string, unknown> = {}) {
	return new Response(JSON.stringify({ error, ...extra }), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});
}

// Accept only image URLs we issued ourselves (R2 public bucket). Prevents the
// submission form being used to launder arbitrary URLs into the site.
function isAcceptableImageUrl(url: string, r2PublicUrl: string): boolean {
	if (typeof url !== 'string') return false;
	if (!r2PublicUrl) return false;
	try {
		const u = new URL(url);
		const base = new URL(r2PublicUrl);
		return u.origin === base.origin && u.pathname.startsWith('/submissions/');
	} catch {
		return false;
	}
}

export const POST: APIRoute = async ({ request, locals }) => {
	if (!locals.user) return jsonError('Authentication required', 401);

	let body: any;
	try {
		body = await request.json();
	} catch {
		return jsonError('Invalid JSON body');
	}

	// CAPTCHA first — fail fast.
	const captchaResult = await verifyCaptcha(body.captchaToken, body.captchaAnswer);
	if (!captchaResult.ok) {
		return jsonError(captchaErrorMessage(captchaResult.error), 400, { field: 'captcha' });
	}

	const title = typeof body.title === 'string' ? body.title.trim() : '';
	const promptText = typeof body.promptText === 'string' ? body.promptText : '';
	const category = typeof body.category === 'string' ? body.category : '';

	if (!title) return jsonError('Title is required.', 400, { field: 'title' });
	if (!promptText.trim()) return jsonError('Prompt text is required.', 400, { field: 'promptText' });
	if (!category) return jsonError('Please pick a category.', 400, { field: 'category' });

	if (title.length > 120) return jsonError('Title is too long (120 chars max).', 400, { field: 'title' });

	const cat = await getCategoryBySlug(category);
	if (!cat) return jsonError('Invalid category.', 400, { field: 'category' });

	const tags = Array.isArray(body.tags)
		? body.tags
			.filter((t: unknown): t is string => typeof t === 'string' && t.trim().length > 0)
			.map((t: string) => t.trim().slice(0, 40))
			.slice(0, 12)
		: [];

	const env = getEnv(locals);
	const r2PublicUrl = env.R2_PUBLIC_URL || '';
	const rawImages: unknown[] = Array.isArray(body.images) ? body.images : [];
	const images = rawImages
		.filter((u): u is string => typeof u === 'string')
		.filter((u) => isAcceptableImageUrl(u, r2PublicUrl))
		.slice(0, MAX_IMAGES);

	const coverImage =
		typeof body.coverImage === 'string' && isAcceptableImageUrl(body.coverImage, r2PublicUrl)
			? body.coverImage
			: undefined;

	try {
		const { slug } = await submitPrompt(
			{
				title,
				description: typeof body.description === 'string' ? body.description.slice(0, 280) : '',
				promptText,
				category,
				tags,
				howToUse: typeof body.howToUse === 'string' ? body.howToUse : undefined,
				coverImage,
				images,
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
		return jsonError(err?.message || 'Submission failed.', 500);
	}
};
