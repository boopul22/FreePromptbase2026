/**
 * Verified dead URLs with a true replacement.
 *
 * Google wants a server-side 301 to an equivalent page, not a homepage dump
 * (those read as soft 404s). Unknown paths stay crawlable 404s.
 *
 * Sources: Search Console URL Inspection (20 Sep 2026) and the last 16 months
 * of page performance. The still-indexed 404 is listed first.
 */

export const LEGACY_EDITORIAL_REDIRECTS: Readonly<Record<string, string>> = {
	// Still indexed in Search Console while the live URL 404s.
	'/principal-ai-code-reviewer-senior-software-engineer-architect-prompt-pc-1101':
		'/blog/chatgpt-prompt-frameworks',

	// Recent Search Console 404s. Legacy URLs point at the closest page that is
	// already indexed, so the rankings they still hold transfer on the 301.
	'/blog/artistabhii__dpaxmxzeaps_blog': '/gemini-ai-photo-prompt',
	'/blog/image-generation/artistabhii__dpaxmxzeaps_blog': '/gemini-ai-photo-prompt',
	'/blog/image-generation/master-the-stranger-things-ai-aesthetic-with-nanobanana_ds7kp9texka':
		'/nano-banana-prompt',
	'/category/writing-copy': '/blog/how-to-write-a-good-ai-prompt',

	// Old tool and marketing URLs that used to collect Search Console clicks.
	'/add-prompt': '/submit',
	'/prompt-engineering': '/blog/how-to-write-a-good-ai-prompt',
	'/image-to-prompt': '/tools/gemini-prompt-generator',
	'/blog/image-to-prompt': '/tools/gemini-prompt-generator',

	// Highest-click /prompts/ URLs from Search Console.
	'/prompts/photo-prompts': '/photo-editing-prompt',
	'/prompts/chatgpt-prompt-for-answering-physics-problem-assignment-solutions':
		'/blog/chatgpt-prompt-frameworks',
	'/prompts/chatgpt-prompt-for-answering-chemistry-lab-report-assignments':
		'/blog/chatgpt-prompt-frameworks',
	'/prompts/chatgpt-prompt-for-answering-economics-assignment-problems':
		'/blog/chatgpt-prompt-frameworks',
	'/prompts/chatgpt-prompt-for-answering-math-problem-assignments-step-by-step':
		'/blog/chatgpt-prompt-frameworks',
	'/prompts/chatgpt-prompt-for-answering-history-assignment-research-questions':
		'/blog/chatgpt-prompt-frameworks',
	'/prompts/complete-mobile-app-development-prompt-for-expert-level': '/skills',
	'/prompts/complete-motion-graphics-and-animation-prompt-for-expert-level': '/skills',
	'/prompts/complete-interior-design-and-space-planning-prompt-for-expert-level': '/skills',
	'/prompts/complete-web-security-implementation-prompt-for-expert-level': '/skills',

	// Existing editorial replacements. Legacy guides point at the indexed hub for
	// their topic rather than the matching blog post, because the hubs are in the
	// index already and inherit the old rankings; the blog posts are not indexed yet.
	'/blog/image-generation/master-gemini-prompts-for-viral-social-media-content_dsrx4_sfkyv':
		'/gemini-ai-photo-prompt-copy-paste',
	'/blog/mastering-nano-banana-prompts-a-comprehensive-guide-to-ai-powered-personal-branding-and-creative-imagery':
		'/nano-banana-prompt',
	'/blog/mastering-nano-banana-guide-to-viral-ai-image-prompts_drm6g-qjqaw':
		'/nano-banana-prompt',
	'/blog/master-ai-for-photorealistic-content-a-creators-guide_dspdsfwjckh':
		'/gemini-ai-photo-prompt',
	'/blog/image-generation/guide-to-photorealistic-ai-mastering-visual-content-creation_dsxc0lfjtxl':
		'/gemini-ai-photo-prompt',

	// Legacy 404s verified 23 Sep 2026: old blog posts and category URLs that
	// still show Search Console impressions while the live URL returns 404.
	'/blog/ai-training-revolution-future-of-cycling-and-running_dsu146rken8':
		'/prompt-for-gemini-ai',
	'/blog/anannyaraii_dk97lc1bb0r': '/gemini-ai-photo-prompt',
	'/blog/guide-to-ai-realism-master-photorealistic-content-creation_drzbvdbdj_4':
		'/gemini-ai-photo-prompt',
	'/blog/marketing/analyze_lead_generation_data_2_blog': '/blog',
	'/blog/marketing/analyze_lead_generation_data_3_blog': '/blog',
	'/blog/master-ai-art-a-guide-to-the-nano-banana-design-trend_dpvuom1jdgs':
		'/nano-banana-prompt',
	'/blog/master-nature-themed-ai-prompt-engineering-a-strategy-guide_dslgcagkygo':
		'/prompt-for-gemini-ai',
	'/blog/master-stranger-things-ai-art-with-google-gemini_dscpa1pdh6y':
		'/nano-banana-prompt',
	'/blog/mastering-gemini-nano-banana-prompts-2025-creator-guide_ds6fiarfaf2':
		'/nano-banana-prompt',
	'/blog/mastering-high-fidelity-ai-visuals-2025-realistic-prompts_ds2fz4lffuq':
		'/gemini-ai-photo-prompt',
	'/blog/mastering-stylized-3d-holiday-character-prompts_dspgq1qakcg':
		'/nano-banana-prompt',
	'/blog/mastering-the-ai-haute-couture-aesthetic-how-to-create-dior-inspired-cinematic-portraits-in-midjourney':
		'/blog/how-to-write-midjourney-prompts',
	'/category/image-generation': '/category/images',
	'/category/coding': '/blog/chatgpt-prompt-frameworks',
	'/category/business': '/blog',
	'/disclaimer': '/terms',
};

function normalizePath(pathname: string): string {
	return pathname.length > 1 ? pathname.replace(/\/+$/, '').toLowerCase() : pathname;
}

function promptsFolderTarget(slug: string): string | undefined {
	if (!slug || slug.includes('/')) return undefined;

	const exact = LEGACY_EDITORIAL_REDIRECTS[`/prompts/${slug}`];
	if (exact) return exact;

	if (/(?:^|-)(?:nano-)?banana(?:-|$)/.test(slug)) return '/nano-banana-prompt';
	if (/\bgemini\b/.test(slug.replace(/-/g, ' ')) || slug.includes('gemini')) {
		return '/gemini-ai-photo-prompt-copy-paste';
	}
	if (
		slug.includes('assignment') ||
		slug.includes('lab-report') ||
		slug.includes('resume') ||
		slug.includes('academic') ||
		slug.startsWith('chatgpt-prompt-for-answering')
	) {
		return '/blog/chatgpt-prompt-frameworks';
	}
	if (slug.startsWith('complete-') || slug.includes('masterclass') || slug.includes('framework-for-')) {
		return '/skills';
	}
	if (
		slug.includes('photo') ||
		slug.includes('image') ||
		slug.includes('portrait') ||
		slug.includes('instagram') ||
		slug.includes('figurine')
	) {
		return '/photo-editing-prompt';
	}
	if (slug.includes('chatgpt') || slug.includes('prompt-for')) {
		return '/blog/chatgpt-prompt-frameworks';
	}
	return '/photo-editing-prompt';
}

function blogFolderTarget(path: string): string | undefined {
	const exact = LEGACY_EDITORIAL_REDIRECTS[path];
	if (exact) return exact;

	const importedAuthorBlog = /^\/blog(?:\/image-generation)?\/[^/]+_blog$/.test(path);
	if (importedAuthorBlog) return '/gemini-ai-photo-prompt';

	if (path.startsWith('/blog/image-generation/')) {
		if (/nano-?banana|nanobanana|stranger-things/.test(path)) return '/nano-banana-prompt';
		if (/photorealistic|photography|photo/.test(path)) return '/gemini-ai-photo-prompt';
		if (path.includes('gemini')) return '/gemini-ai-photo-prompt-copy-paste';
		return '/blog/ai-photo-prompt-ideas';
	}

	if (path.startsWith('/blog/mastering-nano-banana') || path.includes('nano-banana-guide')) {
		return '/nano-banana-prompt';
	}
	if (path.startsWith('/blog/master-ai-for-photorealistic') || path.includes('photorealistic-ai')) {
		return '/gemini-ai-photo-prompt';
	}

	// Imported legacy posts carry an underscore hash suffix. Live slugs never do,
	// so an unmatched one is safe to send to the prompt guides index.
	if (/_[a-z0-9-]{6,}$/.test(path.slice('/blog/'.length))) return '/blog/ai-photo-prompt-ideas';

	return undefined;
}

export function legacyEditorialTarget(pathname: string): string | undefined {
	const path = normalizePath(pathname);
	const exact = LEGACY_EDITORIAL_REDIRECTS[path];
	if (exact) return exact;

	if (path.startsWith('/prompts/')) {
		return promptsFolderTarget(path.slice('/prompts/'.length));
	}

	if (path.startsWith('/blog/')) {
		return blogFolderTarget(path);
	}

	return undefined;
}
