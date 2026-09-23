// ---------------------------------------------------------------------------
// Site-level UI strings for the home hero. Kept separate from prompt content
// so the data swap to D1 stays isolated.
// ---------------------------------------------------------------------------

export const collection = {
	title: 'Free AI prompts you can copy and paste',
	description:
		'Photo editing and image prompts for Gemini, ChatGPT, Midjourney, and Claude. Find one, paste it, make something. No account needed.',
};

// Keyword landing pages surfaced in the hero. The footer already links these,
// but an in-content link from the homepage carries more weight and gets clicks.
export const popularLinks = [
	{ label: 'Nano Banana prompts', href: '/nano-banana-prompt' },
	{ label: 'Nano Banana AI guide', href: '/nano-banana-ai' },
	{ label: 'Gemini photo prompts', href: '/gemini-ai-photo-prompt' },
	{ label: 'Copy-paste Gemini prompts', href: '/gemini-ai-photo-prompt-copy-paste' },
	{ label: 'Prompts for Gemini', href: '/prompt-for-gemini-ai' },
	{ label: 'Couple photo prompts', href: '/gemini-couple-photo-prompt' },
	{ label: 'Trending Gemini prompts', href: '/trending-gemini-prompt' },
	{ label: 'Photo editing prompts', href: '/photo-editing-prompt' },
	{ label: 'ChatGPT photo prompts', href: '/chatgpt-photo-editing-prompt' },
	{ label: 'AI image prompts', href: '/ai-image-prompt' },
];
