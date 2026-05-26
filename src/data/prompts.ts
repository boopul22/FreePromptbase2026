// ---------------------------------------------------------------------------
// Prompt seed data. Hardcoded for now so we can build the design first; this
// will be replaced by a Cloudflare D1 table managed through an admin panel.
// IMPORTANT: nothing imports this file directly except src/lib/prompts.ts —
// that keeps the future D1 swap to a single module.
// ---------------------------------------------------------------------------

export type AiModel = 'ChatGPT' | 'Midjourney' | 'Claude' | 'Gemini';

export interface Prompt {
	slug: string;
	title: string;
	/** Short excerpt shown on cards and as the intro on the detail page. */
	description: string;
	/** The copyable prompt text. */
	promptText: string;
	model: AiModel;
	/** Category slug (see src/data/categories.ts). */
	category: string;
	tags: string[];
	author: string;
	/** ISO date — drives the "Newest" sort. */
	date: string;
	/** Optional cover image; a gradient fallback is shown when absent. */
	coverImage?: string;
	featured?: boolean;
	/** Whether the current user has saved/liked this prompt. */
	liked?: boolean;
	/** Drives the "Popular" sort. */
	popularity: number;
	/** Optional extra guidance rendered on the detail page. */
	howToUse?: string;
	/** Image gallery rendered as a carousel on the detail page. cover_image is used for cards. */
	images?: string[];
	/** users.id of the admin who added this prompt (null for seed entries). */
	createdBy?: string;
}

export const prompts: Prompt[] = [
	{
		slug: 'cinematic-portrait',
		title: 'Cinematic Portrait Photography',
		description:
			'Direct Midjourney like a film DP — dramatic lighting, shallow depth of field and a moody color grade for striking portraits.',
		promptText:
			'cinematic portrait of {subject}, 85mm lens, shallow depth of field, dramatic rim lighting, soft key light, moody teal-and-orange color grade, film grain, shot on Arri Alexa, ultra detailed, photorealistic --ar 4:5 --style raw --v 6',
		model: 'Midjourney',
		category: 'image-generation',
		tags: ['portrait', 'photography', 'cinematic', 'lighting'],
		author: 'Admin',
		date: '2026-05-20',
		featured: true,
		popularity: 980,
		howToUse:
			'Replace {subject} with your person or character (e.g. "an elderly fisherman"). Adjust --ar for orientation and swap the color grade words to change the mood.',
	},
	{
		slug: 'viral-hook-generator',
		title: 'Viral Hook Generator',
		description:
			'Generate 10 scroll-stopping hooks for any topic, ranked by stopping power, with the psychological trigger behind each.',
		promptText:
			'You are a world-class short-form copywriter. Generate 10 scroll-stopping hooks for a post about [TOPIC] aimed at [AUDIENCE]. For each hook: (1) write it in under 12 words, (2) name the psychological trigger it uses (curiosity, fear, status, etc.), and (3) rate its stopping power 1-10. Sort from strongest to weakest.',
		model: 'ChatGPT',
		category: 'marketing',
		tags: ['copywriting', 'social media', 'hooks'],
		author: 'Admin',
		date: '2026-05-18',
		featured: true,
		liked: true,
		popularity: 1240,
		howToUse:
			'Swap [TOPIC] and [AUDIENCE] for yours. Ask for a follow-up: "expand hook #3 into a full caption".',
	},
	{
		slug: 'code-refactor-reviewer',
		title: 'Code Refactor Reviewer',
		description:
			'Have Claude review a function for readability, bugs and performance, then return a refactored version with a diff-style explanation.',
		promptText:
			'Act as a senior software engineer doing a careful code review. Here is a function:\n\n```\n[PASTE CODE]\n```\n\n1. List concrete issues grouped by Correctness, Readability, and Performance.\n2. Provide a refactored version.\n3. Explain each change in one line, referencing the original line it replaces.\nKeep the public API identical unless a change is required for correctness.',
		model: 'Claude',
		category: 'coding',
		tags: ['code review', 'refactor', 'engineering'],
		author: 'Admin',
		date: '2026-05-22',
		popularity: 870,
		howToUse: 'Paste your function where indicated. Mention the language and any constraints (e.g. "no new dependencies").',
	},
	{
		slug: 'blog-post-outliner',
		title: 'SEO Blog Post Outliner',
		description:
			'Turn a single keyword into a search-optimized outline with H2/H3s, search intent, and a suggested title and meta description.',
		promptText:
			'You are an SEO content strategist. For the target keyword "[KEYWORD]", produce: (1) the likely search intent, (2) a compelling H1 title under 60 characters, (3) a meta description under 155 characters, (4) a full outline of H2 and H3 sections that fully covers the topic, and (5) 5 "People also ask" style FAQ questions. Keep it scannable.',
		model: 'ChatGPT',
		category: 'writing-copy',
		tags: ['seo', 'blogging', 'outline'],
		author: 'Admin',
		date: '2026-05-15',
		popularity: 760,
	},
	{
		slug: 'weekly-planner',
		title: 'Weekly Priority Planner',
		description:
			'Drop in your tasks and goals and get a realistic, time-blocked week that protects deep work and respects your energy.',
		promptText:
			'Act as a productivity coach. Here are my goals and tasks for the week:\n[LIST TASKS]\n\nMy fixed commitments are:\n[LIST MEETINGS]\n\nBuild a Monday-Friday time-blocked plan that: protects 2 hours of deep work each morning, batches shallow tasks in the afternoon, and leaves buffer time. Flag anything unrealistic and suggest what to cut.',
		model: 'ChatGPT',
		category: 'productivity',
		tags: ['planning', 'time blocking', 'focus'],
		author: 'Admin',
		date: '2026-05-12',
		popularity: 540,
	},
	{
		slug: 'business-plan-drafter',
		title: 'One-Page Business Plan Drafter',
		description:
			'Describe your idea and get a crisp one-page plan: problem, solution, market, model, moat and the riskiest assumption to test first.',
		promptText:
			'You are a startup advisor. Based on this idea: [IDEA], draft a one-page business plan with these sections: Problem, Solution, Target Customer, Market Size (rough), Business Model, Go-to-Market, Competitive Moat, Key Risks. End with the single riskiest assumption I should validate first and a cheap experiment to test it.',
		model: 'Claude',
		category: 'business',
		tags: ['startup', 'strategy', 'planning'],
		author: 'Admin',
		date: '2026-05-10',
		popularity: 620,
	},
	{
		slug: 'lesson-plan-builder',
		title: 'Lesson Plan Builder',
		description:
			'Create an engaging, standards-aligned lesson plan for any topic and grade level, with objectives, activities and assessment.',
		promptText:
			'Act as an experienced teacher. Create a 45-minute lesson plan on [TOPIC] for [GRADE LEVEL]. Include: learning objectives, a hook to open, a step-by-step activity sequence with timings, materials needed, differentiation for struggling and advanced students, and a quick formative assessment to check understanding.',
		model: 'ChatGPT',
		category: 'education',
		tags: ['teaching', 'lesson plan', 'classroom'],
		author: 'Admin',
		date: '2026-05-08',
		popularity: 410,
	},
	{
		slug: 'story-idea-generator',
		title: 'Story Idea Generator',
		description:
			'Spin up original story premises in any genre, each with a logline, a twist and a memorable protagonist.',
		promptText:
			'You are an imaginative story editor. Generate 5 original story ideas in the [GENRE] genre. For each, give: a one-sentence logline, the protagonist and their flaw, the central conflict, and an unexpected twist. Avoid clichés and make each premise feel fresh.',
		model: 'Gemini',
		category: 'entertainment',
		tags: ['storytelling', 'creative writing', 'ideas'],
		author: 'Admin',
		date: '2026-05-05',
		popularity: 350,
	},
	{
		slug: 'product-photo-mockup',
		title: 'Luxury Product Mockup',
		description:
			'Studio-grade product shots in Midjourney — clean backdrop, soft shadows and tack-sharp detail for e-commerce and ads.',
		promptText:
			'professional product photograph of {product} on a minimal {color} backdrop, soft studio lighting, gentle reflection, subtle shadow, high detail, commercial e-commerce style, shot on Hasselblad, 100mm macro, crisp focus --ar 1:1 --style raw --v 6',
		model: 'Midjourney',
		category: 'image-generation',
		tags: ['product', 'ecommerce', 'studio'],
		author: 'Admin',
		date: '2026-05-03',
		liked: true,
		popularity: 690,
		howToUse: 'Replace {product} and {color}. Try "marble" or "gradient" backdrops, and --ar 4:5 for social ads.',
	},
	{
		slug: 'cold-email-writer',
		title: 'Cold Email Writer',
		description:
			'Write a short, personalized B2B cold email that earns a reply — strong subject line, one clear ask, zero fluff.',
		promptText:
			'You are a B2B sales expert. Write a cold email to [ROLE] at [COMPANY] offering [PRODUCT/SERVICE]. Constraints: under 90 words, one specific personalized opening line based on [TRIGGER], one clear value statement, one low-friction call to action (a question, not a meeting demand). Give me 2 subject line options under 5 words each.',
		model: 'ChatGPT',
		category: 'marketing',
		tags: ['sales', 'email', 'outreach'],
		author: 'Admin',
		date: '2026-05-01',
		popularity: 580,
	},
];
