import { tags } from '../data/tags.ts';
import { isTagAssignable, isTagIndexable } from '../data/tag-seo.ts';

export const MAX_LANDING_MEMBERSHIPS = 4;

export class LandingMembershipValidationError extends Error {}

export function normalizeLandingSlugs(value: unknown): string[] {
	if (value === undefined || value === null) return [];
	if (!Array.isArray(value)) {
		throw new LandingMembershipValidationError('landingSlugs must be an array of landing slugs.');
	}
	if (value.some((item) => typeof item !== 'string' || !item.trim())) {
		throw new LandingMembershipValidationError('Every landingSlugs value must be a non-empty string.');
	}
	const normalized = [...new Set(value.map((item) => item.trim().toLowerCase()))];
	if (normalized.length > MAX_LANDING_MEMBERSHIPS) {
		throw new LandingMembershipValidationError(
			`A prompt can belong to at most ${MAX_LANDING_MEMBERSHIPS} keyword landings.`,
		);
	}
	const invalid = normalized.filter((slug) => !isTagAssignable(slug));
	if (invalid.length > 0) {
		throw new LandingMembershipValidationError(
			`Unknown or redirected landing slug${invalid.length === 1 ? '' : 's'}: ${invalid.join(', ')}.`,
		);
	}
	return normalized;
}

export function landingMembershipStatements(
	db: D1Database,
	promptSlug: string,
	landingSlugs: string[],
): D1PreparedStatement[] {
	return [
		db.prepare('DELETE FROM prompt_landing_memberships WHERE prompt_slug = ?').bind(promptSlug),
		...landingSlugs.map((landingSlug, index) => db.prepare(
			`INSERT INTO prompt_landing_memberships
			 (landing_slug, prompt_slug, position, updated_at)
			 VALUES (?, ?, ?, datetime('now'))`,
		).bind(landingSlug, promptSlug, index + 1)),
	];
}

export async function getPromptLandingSlugs(db: D1Database, promptSlug: string): Promise<string[]> {
	const { results } = await db.prepare(
		`SELECT landing_slug FROM prompt_landing_memberships
		 WHERE prompt_slug = ? ORDER BY position IS NULL, position, landing_slug`,
	).bind(promptSlug).all<{ landing_slug: string }>();
	return results.map((row) => row.landing_slug);
}

export const LANDING_OPTIONS = tags
	.filter((tag) => isTagAssignable(tag.slug))
	.map((tag) => ({ slug: tag.slug, name: tag.name, indexable: isTagIndexable(tag.slug) }));
