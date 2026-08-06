// ---------------------------------------------------------------------------
// Tag SEO policy — which keyword landings stay indexable, which 301, which
// hubs appear in related/tags index. Source of truth for sitemap + [slug]
// routing. Keep in sync with seo/tracklist.md and the cannibalization audit.
// ---------------------------------------------------------------------------

/** Junk / off-topic / thin creator pages: keep URL live but noindex + out of sitemap. */
export const TAG_NOINDEX_SLUGS = new Set([
	'add-2',
	'banana-prompt-xyz',
	'openai-news',
	'technology-news-today',
	'mk-edit',
	'prompt-wala',
	'prompt-by-vikas-editing',
	'anup-sagar-prompt',
	'ai-prompt-razz-suman',
	'ai-prompt-ghaus-editz',
	'gemini-prompt-vercel-app',
	'prompt-gemini-ai-foto-sendiri',
	'gimini',
]);

/**
 * Near-dupe merges → primary hub slug (301). Do not also put these in
 * TAG_NOINDEX_SLUGS; the redirect wins.
 */
export const TAG_REDIRECTS: Record<string, string> = {
	'ai-gemini-photo-prompt': 'gemini-ai-photo-prompt',
	'gemini-ai-photo': 'gemini-ai-photo-prompt',
	'gemini-photo-prompt': 'gemini-ai-photo-prompt',
	'google-gemini-ai-photo': 'gemini-ai-photo-prompt',
	'google-gemini-ai-photo-prompt': 'gemini-ai-photo-prompt',
	'gemini-prompt-for-image-generation': 'gemini-ai-photo-prompt',
	'gemini-ai-photo-prompt-copy-paste-trending': 'gemini-ai-photo-prompt-copy-paste',
	'gemini-ai-prompt-copy-paste': 'gemini-ai-photo-prompt-copy-paste',
	'google-gemini-trending-photo-prompt': 'gemini-ai-photo-prompt-copy-paste',
	'prompt-for-gemini': 'prompt-for-gemini-ai',
	'gemini-ai-prompt': 'prompt-for-gemini-ai',
	'ai-gemini-prompt': 'prompt-for-gemini-ai',
	'ai-gemini': 'prompt-for-gemini-ai',
	'banana-prompts': 'banana-prompt',
};

/** Curated hubs for /tags index + “Related searches” (priority tracklist + strong intents). */
export const TAG_HUB_SLUGS = [
	'nano-banana-prompt',
	'gemini-ai-photo-prompt-copy-paste',
	'nano-banana-ai',
	'prompt-for-gemini-ai',
	'gemini-ai-photo-prompt',
	'gemini-couple-photo-prompt',
	'trending-gemini-prompt',
	'nano-banana',
	'photo-editing-prompt',
	'chatgpt-photo-editing-prompt',
	'ai-image-prompt',
	'gemini-photo-editing-prompt',
	'couple-prompt',
	'baby-krishna-ai-photo-editing-prompt',
	'holi-prompt',
	'nano-banana-pro',
	'nano-banana-2',
	'banana-ai',
	'gemini-photo-prompt-for-man',
	'gemini-photo-prompt-for-woman',
	'gemini-family-photo-prompt',
	'gemini-birthday-photo-prompt',
	'gemini-ai-photo-editor',
	'chatgpt-caricature-prompt',
] as const;

export const TAG_HUB_SLUG_SET = new Set<string>(TAG_HUB_SLUGS);

export function isTagIndexable(slug: string): boolean {
	if (TAG_REDIRECTS[slug]) return false;
	if (TAG_NOINDEX_SLUGS.has(slug)) return false;
	return true;
}

export function tagCanonicalTarget(slug: string): string | undefined {
	return TAG_REDIRECTS[slug];
}
