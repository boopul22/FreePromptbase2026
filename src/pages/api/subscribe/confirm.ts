export const prerender = false;

import type { APIRoute } from 'astro';
import { confirm } from '../../../lib/subscribers';

// Minimal branded confirmation page — this is a link target opened from an email,
// so it renders standalone HTML rather than reusing the site layout.
function page(title: string, message: string, status = 200) {
	const html = `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${title} — Free Prompt Base</title>
<style>
	body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f5f4f0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#222;padding:24px;}
	.card{max-width:440px;background:#fff;border:1px solid #e7e5e0;border-radius:16px;padding:40px 32px;text-align:center;}
	h1{font-size:20px;margin:0 0 10px;}
	p{margin:0 0 24px;color:#555;line-height:1.6;}
	a{display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 24px;border-radius:9px;font-weight:600;font-size:14px;}
</style></head><body>
	<div class="card"><h1>${title}</h1><p>${message}</p><a href="https://freepromptbase.com">Browse prompts</a></div>
</body></html>`;
	return new Response(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

export const GET: APIRoute = async ({ url }) => {
	const token = url.searchParams.get('token') ?? '';
	const result = await confirm(token);

	if (!result.ok) {
		return page('Invalid or expired link', 'This confirmation link is no longer valid. Try subscribing again from the site.', 400);
	}
	if (result.alreadyConfirmed) {
		return page("You're all set", 'Your subscription was already confirmed. Thanks for being here!');
	}
	return page('Subscription confirmed', "You're on the list 🎉 We'll send you the best new AI prompts. Copy, paste, create.");
};
