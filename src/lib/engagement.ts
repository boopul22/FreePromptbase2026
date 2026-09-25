/**
 * Per-visitor saved/liked state for anonymous visitors is applied in the
 * browser (see hydrateEngagement in src/scripts/social.ts) so public HTML can
 * be served from the shared edge cache without a per-visitor D1 batch.
 *
 * `fpb_eng` is a non-sensitive, host-only hint cookie: "0" means this device
 * has no saves/likes, so the client skips the /api/engagement fetch; "1" (or
 * absent, for devices that predate the hint) means fetch. /api/engagement
 * refreshes it from the authoritative D1 answer, and a successful save/like
 * sets it to "1" client-side.
 */
export const ENGAGEMENT_HINT_COOKIE = 'fpb_eng';

export interface EngagementState {
	saved: string[];
	liked: string[];
}

export async function getActorEngagement(db: D1Database, actorId: string): Promise<EngagementState> {
	const [savedRes, likedRes] = await db.batch<{ prompt_slug: string }>([
		db.prepare('SELECT prompt_slug FROM prompt_saves WHERE actor_id = ?').bind(actorId),
		db.prepare('SELECT prompt_slug FROM prompt_likes WHERE actor_id = ?').bind(actorId),
	]);
	return {
		saved: savedRes.results.map((r) => r.prompt_slug),
		liked: likedRes.results.map((r) => r.prompt_slug),
	};
}
