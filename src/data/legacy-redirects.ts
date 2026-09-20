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

	// Recent Search Console 404s.
	'/blog/artistabhii__dpaxmxzeaps_blog': '/blog/ai-photo-prompt-ideas',
	'/blog/image-generation/artistabhii__dpaxmxzeaps_blog': '/blog/ai-photo-prompt-ideas',
	'/blog/image-generation/master-the-stranger-things-ai-aesthetic-with-nanobanana_ds7kp9texka':
		'/blog/nano-banana-prompts',
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

	// Existing editorial replacements.
	'/blog/image-generation/master-gemini-prompts-for-viral-social-media-content_dsrx4_sfkyv':
		'/blog/trending-gemini-prompts',
	'/blog/mastering-nano-banana-prompts-a-comprehensive-guide-to-ai-powered-personal-branding-and-creative-imagery':
		'/blog/nano-banana-prompts',
	'/blog/mastering-nano-banana-guide-to-viral-ai-image-prompts_drm6g-qjqaw':
		'/blog/nano-banana-prompts',
	'/blog/master-ai-for-photorealistic-content-a-creators-guide_dspdsfwjckh':
		'/blog/how-to-edit-photos-with-ai-prompts',
	'/blog/image-generation/guide-to-photorealistic-ai-mastering-visual-content-creation_dsxc0lfjtxl':
		'/blog/how-to-edit-photos-with-ai-prompts',
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
	if (importedAuthorBlog) return '/blog/ai-photo-prompt-ideas';

	if (path.startsWith('/blog/image-generation/')) {
		if (/nano-?banana|nanobanana|stranger-things/.test(path)) return '/blog/nano-banana-prompts';
		if (path.includes('gemini')) return '/blog/trending-gemini-prompts';
		if (/photorealistic|photography|photo/.test(path)) return '/blog/how-to-edit-photos-with-ai-prompts';
		return '/blog/ai-photo-prompt-ideas';
	}

	if (path.startsWith('/blog/mastering-nano-banana') || path.includes('nano-banana-guide')) {
		return '/blog/nano-banana-prompts';
	}
	if (path.startsWith('/blog/master-ai-for-photorealistic') || path.includes('photorealistic-ai')) {
		return '/blog/how-to-edit-photos-with-ai-prompts';
	}

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
