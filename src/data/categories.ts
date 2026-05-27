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
		slug: 'images',
		name: 'Images',
		description: 'Prompts for AI image generators — Midjourney, Gemini, DALL·E, Stable Diffusion.',
		emoji: '🖼️',
	},
	{
		slug: 'text',
		name: 'Text',
		description: 'Prompts for writing, coding, planning, and anything text-based.',
		emoji: '📝',
	},
];
