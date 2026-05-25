// ---------------------------------------------------------------------------
// Data-access layer for prompts & categories.
//
// This is the ONLY module the rest of the app imports for data. Today it reads
// from the in-memory seed arrays; when we move to Cloudflare D1, only the bodies
// of these functions change (e.g. `await env.DB.prepare(...).all()`), and every
// page/component keeps working unchanged.
//
// All functions are async on purpose so the D1 swap is drop-in (D1 is async).
// ---------------------------------------------------------------------------

import { prompts, type Prompt } from '../data/prompts';
import { categories, type Category } from '../data/categories';

export type { Prompt, Category };
export type { AiModel } from '../data/prompts';

/** All prompts, newest first by default. */
export async function getAllPrompts(): Promise<Prompt[]> {
	return [...prompts].sort(
		(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
	);
}

/** A single prompt by its slug, or undefined if not found. */
export async function getPromptBySlug(slug: string): Promise<Prompt | undefined> {
	return prompts.find((p) => p.slug === slug);
}

/** Prompts in a given category, newest first. */
export async function getPromptsByCategory(categorySlug: string): Promise<Prompt[]> {
	return (await getAllPrompts()).filter((p) => p.category === categorySlug);
}

/** Featured prompts for the hero / spotlight area. */
export async function getFeaturedPrompts(): Promise<Prompt[]> {
	return (await getAllPrompts()).filter((p) => p.featured);
}

/** Related prompts: same category first, then most popular, excluding self. */
export async function getRelatedPrompts(prompt: Prompt, limit = 3): Promise<Prompt[]> {
	const others = prompts.filter((p) => p.slug !== prompt.slug);
	others.sort((a, b) => {
		const sameCat = (p: Prompt) => (p.category === prompt.category ? 1 : 0);
		const byCat = sameCat(b) - sameCat(a);
		return byCat !== 0 ? byCat : b.popularity - a.popularity;
	});
	return others.slice(0, limit);
}

/** All categories. */
export async function getAllCategories(): Promise<Category[]> {
	return categories;
}

/** A single category by slug. */
export async function getCategoryBySlug(slug: string): Promise<Category | undefined> {
	return categories.find((c) => c.slug === slug);
}

/** Map of category slug -> prompt count (for category listings). */
export async function getCategoryCounts(): Promise<Record<string, number>> {
	return prompts.reduce<Record<string, number>>((acc, p) => {
		acc[p.category] = (acc[p.category] ?? 0) + 1;
		return acc;
	}, {});
}

/** Rough read-time estimate in minutes from prompt + guidance length. */
export function readTime(prompt: Prompt): number {
	const words = `${prompt.description} ${prompt.promptText} ${prompt.howToUse ?? ''}`
		.trim()
		.split(/\s+/).length;
	return Math.max(1, Math.round(words / 200));
}
