// ---------------------------------------------------------------------------
// Prompt categories. Static seed data for now — will move to a D1 table later.
// Consumed only through src/lib/prompts.ts so the D1 swap stays isolated.
// ---------------------------------------------------------------------------

export interface Category {
	slug: string;
	name: string;
	description: string;
	emoji: string;
}

export const categories: Category[] = [
	{
		slug: 'writing-copy',
		name: 'Writing & Copy',
		description: 'Blog posts, emails, scripts and copy that convert.',
		emoji: '✍️',
	},
	{
		slug: 'coding',
		name: 'Coding',
		description: 'Refactors, reviews, debugging and dev workflows.',
		emoji: '💻',
	},
	{
		slug: 'image-generation',
		name: 'Image Generation',
		description: 'Midjourney, Gemini and photoreal art direction.',
		emoji: '🎨',
	},
	{
		slug: 'productivity',
		name: 'Productivity',
		description: 'Plan, prioritise and automate your day.',
		emoji: '⚡',
	},
	{
		slug: 'marketing',
		name: 'Marketing',
		description: 'Hooks, ads, funnels and growth experiments.',
		emoji: '📈',
	},
	{
		slug: 'business',
		name: 'Business',
		description: 'Strategy, plans and operations on autopilot.',
		emoji: '💼',
	},
	{
		slug: 'education',
		name: 'Education',
		description: 'Lesson plans, study aids and explainers.',
		emoji: '🎓',
	},
	{
		slug: 'entertainment',
		name: 'Entertainment',
		description: 'Stories, games and creative fun.',
		emoji: '🎬',
	},
];
