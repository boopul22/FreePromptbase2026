import { handle } from '@astrojs/cloudflare/handler';
import { processDueCampaign, type SocialEnv } from './lib/socialScheduler';
import { processDueRagaReel, type RagaReelEnv } from './lib/ragaReelScheduler';
import { earlyRedirectTarget } from './data/request-redirects';
import { isProbePath, probeNotFoundResponse } from './data/probe-paths';

const CANONICAL_HOST = 'freepromptbase.com';

function earlyRedirect(request: Request): Response | undefined {
	const source = new URL(request.url);
	const target = earlyRedirectTarget(source.pathname);
	if (!target) return undefined;

	// Collapse a legacy path, trailing slash, HTTP, and www into the same hop on
	// production. Preserve the preview origin when testing Workers locally.
	if (source.hostname === CANONICAL_HOST || source.hostname === `www.${CANONICAL_HOST}`) {
		source.protocol = 'https:';
		source.hostname = CANONICAL_HOST;
		source.port = '';
	}
	source.pathname = target;
	return Response.redirect(source.toString(), 301);
}

export default {
	fetch(request, env, ctx) {
		const redirect = earlyRedirect(request);
		if (redirect) return redirect;
		// Scanner probes (/.env, /wp-login.php, *.php, stray *.json, ...) get a
		// tiny static 404 here instead of a D1 slug lookup + SSR 404 render.
		if (isProbePath(new URL(request.url).pathname)) return probeNotFoundResponse();
		return handle(request, env, ctx);
	},
	async scheduled(_controller, env) {
		// These are separate projects and separate durable queues. A failure in
		// either publisher must never prevent or delay the other one from running.
		const [social, raga] = await Promise.allSettled([
			processDueCampaign(env),
			processDueRagaReel(env as RagaReelEnv),
		]);
		if (social.status === 'fulfilled') console.log(JSON.stringify({ event: 'social_cron', ...social.value }));
		else console.error(JSON.stringify({ event: 'social_cron_error', error: social.reason instanceof Error ? social.reason.message : String(social.reason) }));
		if (raga.status === 'fulfilled') console.log(JSON.stringify({ event: 'raga_reel_cron', ...raga.value }));
		else console.error(JSON.stringify({ event: 'raga_reel_cron_error', error: raga.reason instanceof Error ? raga.reason.message : String(raga.reason) }));
	},
} satisfies ExportedHandler<SocialEnv & RagaReelEnv>;
