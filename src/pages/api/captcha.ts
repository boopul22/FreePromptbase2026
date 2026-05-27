export const prerender = false;

import type { APIRoute } from 'astro';
import { issueCaptcha } from '../../lib/captcha';

export const GET: APIRoute = async () => {
	const challenge = await issueCaptcha();
	return new Response(JSON.stringify(challenge), {
		headers: {
			'Content-Type': 'application/json',
			'Cache-Control': 'no-store',
		},
	});
};
