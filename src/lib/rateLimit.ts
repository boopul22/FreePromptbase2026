// Workers Rate Limiting bindings (see `ratelimits` in wrangler.jsonc). Counters
// live at the edge, so a check costs no D1 traffic. Fails open when the binding
// is absent (astro dev) or errors: a limiter outage must not block real users.

// @ts-ignore - cloudflare:workers is a Workers-only built-in module
import { env } from 'cloudflare:workers';

export async function withinRateLimit(
	binding: 'SUBSCRIBE_RATE_LIMITER' | 'SUBMIT_RATE_LIMITER',
	key: string | null | undefined,
): Promise<boolean> {
	if (!key) return true;
	try {
		const limiter = (env as any)[binding];
		if (!limiter) return true;
		const { success } = await limiter.limit({ key });
		return success;
	} catch {
		return true;
	}
}
