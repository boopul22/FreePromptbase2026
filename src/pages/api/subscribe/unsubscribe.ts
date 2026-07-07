export const prerender = false;

import type { APIRoute } from 'astro';
import { unsubscribe } from '../../../lib/subscribers';

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
	<div class="card"><h1>${title}</h1><p>${message}</p><a href="https://freepromptbase.com">Back to site</a></div>
</body></html>`;
	return new Response(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

// Support both GET (link click) and POST (one-click List-Unsubscribe-Post).
async function handle(token: string) {
	const result = await unsubscribe(token);
	if (!result.ok) {
		return page('Link not found', 'We couldn’t find that subscription. It may already be removed.', 400);
	}
	return page('Unsubscribed', 'You’ve been unsubscribed. Sorry to see you go — you can resubscribe any time from the site.');
}

export const GET: APIRoute = async ({ url }) => handle(url.searchParams.get('token') ?? '');

export const POST: APIRoute = async ({ url }) => handle(url.searchParams.get('token') ?? '');
