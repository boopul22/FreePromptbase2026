import { handle } from '@astrojs/cloudflare/handler';
import { processDueCampaign, type SocialEnv } from './lib/socialScheduler';

export default {
	fetch(request, env, ctx) {
		return handle(request, env, ctx);
	},
	async scheduled(_controller, env) {
		try {
			const result = await processDueCampaign(env);
			console.log(JSON.stringify({ event: 'social_cron', ...result }));
		} catch (error) {
			console.error(JSON.stringify({ event: 'social_cron_error', error: error instanceof Error ? error.message : String(error) }));
			throw error;
		}
	},
} satisfies ExportedHandler<SocialEnv>;
