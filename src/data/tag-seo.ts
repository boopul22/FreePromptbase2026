import { tags } from './tags.ts';

// Keyword-landing SEO policy: the single source of truth for routing, robots,
// sitemap eligibility, related links, and publishing membership validation.

export type LandingIndexState = 'index' | 'noindex' | 'redirect';
export type LandingPageKind = 'collection' | 'guide';

export interface LandingSeoPolicy {
	slug: string;
	indexState: LandingIndexState;
	seoTitle?: string;
	pageKind?: LandingPageKind;
	contentUpdatedAt?: string;
	minimumPrompts?: number;
	relatedSlugs?: readonly string[];
	redirectTo?: string;
}

/** The deliberately small first indexing-recovery cohort. */
export const INDEXABLE_LANDING_POLICIES = {
	'nano-banana-prompt': {
		seoTitle: 'Nano Banana Prompts: Copy & Paste | Free Prompt Base',
		pageKind: 'collection', contentUpdatedAt: '2026-09-23', minimumPrompts: 8,
		relatedSlugs: ['nano-banana-ai', 'gemini-ai-photo-prompt-copy-paste', 'ai-image-prompt'],
	},
	'gemini-ai-photo-prompt-copy-paste': {
		seoTitle: 'Gemini AI Photo Prompts: Copy & Paste | Free Prompt Base',
		pageKind: 'collection', contentUpdatedAt: '2026-09-23', minimumPrompts: 8,
		relatedSlugs: ['gemini-ai-photo-prompt', 'trending-gemini-prompt', 'prompt-for-gemini-ai', 'photo-editing-prompt'],
	},
	'nano-banana-ai': {
		seoTitle: 'Nano Banana AI Guide & Prompts | Free Prompt Base',
		pageKind: 'guide', contentUpdatedAt: '2026-09-23', minimumPrompts: 8,
		relatedSlugs: ['nano-banana-prompt', 'ai-image-prompt', 'gemini-ai-photo-prompt'],
	},
	'prompt-for-gemini-ai': {
		seoTitle: 'Prompts for Gemini AI: Copy & Paste | Free Prompt Base',
		pageKind: 'collection', contentUpdatedAt: '2026-09-23', minimumPrompts: 8,
		relatedSlugs: ['gemini-ai-photo-prompt', 'trending-gemini-prompt', 'ai-image-prompt'],
	},
	'gemini-ai-photo-prompt': {
		seoTitle: 'Gemini AI Photo Prompts | Free Prompt Base',
		pageKind: 'guide', contentUpdatedAt: '2026-09-23', minimumPrompts: 8,
		relatedSlugs: ['gemini-ai-photo-prompt-copy-paste', 'trending-gemini-prompt', 'nano-banana-ai', 'photo-editing-prompt', 'gemini-couple-photo-prompt'],
	},
	'gemini-couple-photo-prompt': {
		seoTitle: 'Gemini Couple Photo Prompts | Free Prompt Base',
		pageKind: 'collection', contentUpdatedAt: '2026-09-23', minimumPrompts: 8,
		relatedSlugs: ['gemini-ai-photo-prompt', 'photo-editing-prompt', 'trending-gemini-prompt'],
	},
	'trending-gemini-prompt': {
		seoTitle: 'Trending Gemini Prompts | Free Prompt Base',
		pageKind: 'collection', contentUpdatedAt: '2026-08-30', minimumPrompts: 8,
		relatedSlugs: ['prompt-for-gemini-ai', 'gemini-ai-photo-prompt-copy-paste', 'nano-banana-prompt'],
	},
	'photo-editing-prompt': {
		seoTitle: 'Photo Editing Prompts | Free Prompt Base',
		pageKind: 'collection', contentUpdatedAt: '2026-08-30', minimumPrompts: 8,
		relatedSlugs: ['chatgpt-photo-editing-prompt', 'gemini-ai-photo-prompt', 'ai-image-prompt'],
	},
	'chatgpt-photo-editing-prompt': {
		seoTitle: 'ChatGPT Photo Editing Prompts | Free Prompt Base',
		pageKind: 'collection', contentUpdatedAt: '2026-08-30', minimumPrompts: 8,
		relatedSlugs: ['photo-editing-prompt', 'ai-image-prompt', 'gemini-ai-photo-prompt'],
	},
	'ai-image-prompt': {
		seoTitle: 'AI Image Prompts | Free Prompt Base',
		pageKind: 'collection', contentUpdatedAt: '2026-08-30', minimumPrompts: 8,
		relatedSlugs: ['photo-editing-prompt', 'nano-banana-prompt', 'nano-banana-ai', 'prompt-for-gemini-ai'],
	},
	'baby-krishna-ai-photo-editing-prompt': {
		seoTitle: 'Baby Krishna AI Photo Prompts | Free Prompt Base',
		pageKind: 'collection', contentUpdatedAt: '2026-08-30', minimumPrompts: 4,
		relatedSlugs: ['gemini-ai-photo-prompt', 'photo-editing-prompt', 'ai-image-prompt'],
	},
} as const satisfies Record<string, {
	seoTitle: string;
	pageKind: LandingPageKind;
	contentUpdatedAt: string;
	minimumPrompts: number;
	relatedSlugs: readonly string[];
}>;

export const TAG_HUB_SLUGS = Object.keys(INDEXABLE_LANDING_POLICIES);
export const TAG_HUB_SLUG_SET = new Set<string>(TAG_HUB_SLUGS);

/** Every redirect points directly to its final indexable destination. */
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
	'nano-banana': 'nano-banana-ai',
	'banana-ai': 'nano-banana-ai',
	'banana-prompt': 'nano-banana-prompt',
	'banana-prompts': 'nano-banana-prompt',
	'couple-prompt-for-gemini-ai': 'gemini-couple-photo-prompt',
};

/** Every other known, non-redirect landing is temporarily noindex, follow. */
export const TAG_NOINDEX_SLUGS = new Set(
	tags.map((tag) => tag.slug).filter(
		(slug) => !TAG_HUB_SLUG_SET.has(slug) && !TAG_REDIRECTS[slug],
	),
);

export function isTagIndexable(slug: string): boolean {
	return TAG_HUB_SLUG_SET.has(slug);
}

export function isTagAssignable(slug: string): boolean {
	return tags.some((tag) => tag.slug === slug) && !TAG_REDIRECTS[slug];
}

export function tagCanonicalTarget(slug: string): string | undefined {
	return TAG_REDIRECTS[slug];
}

export function getLandingPolicy(slug: string): LandingSeoPolicy {
	const indexed = INDEXABLE_LANDING_POLICIES[slug as keyof typeof INDEXABLE_LANDING_POLICIES];
	if (indexed) return { slug, indexState: 'index', ...indexed };
	const redirectTo = TAG_REDIRECTS[slug];
	if (redirectTo) return { slug, indexState: 'redirect', redirectTo };
	return { slug, indexState: 'noindex' };
}
