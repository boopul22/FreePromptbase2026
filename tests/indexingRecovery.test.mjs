import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tags } from '../src/data/tags.ts';
import {
	getLandingPolicy,
	INDEXABLE_LANDING_POLICIES,
	isTagIndexable,
	TAG_NOINDEX_SLUGS,
	TAG_REDIRECTS,
} from '../src/data/tag-seo.ts';
import { INITIAL_LANDING_MEMBERSHIPS } from '../src/data/initial-landing-memberships.ts';
import { LEGACY_EDITORIAL_REDIRECTS, legacyEditorialTarget } from '../src/data/legacy-redirects.ts';
import { earlyRedirectTarget } from '../src/data/request-redirects.ts';
import { promptSlugConflict } from '../src/data/route-policy.ts';
import { normalizeLandingSlugs } from '../src/lib/landingMemberships.ts';
import {
	materialLastmod,
	renderSitemapIndex,
	renderUrlset,
	trustworthyDay,
} from '../src/lib/sitemap.ts';

const indexableSlugs = Object.keys(INDEXABLE_LANDING_POLICIES);

test('every keyword landing has one explicit index, noindex, or redirect state', () => {
	for (const tag of tags) {
		const states = [isTagIndexable(tag.slug), TAG_NOINDEX_SLUGS.has(tag.slug), Boolean(TAG_REDIRECTS[tag.slug])];
		assert.equal(states.filter(Boolean).length, 1, tag.slug);
		assert.equal(getLandingPolicy(tag.slug).slug, tag.slug);
	}
	assert.equal(indexableSlugs.length, 11);
	assert.equal(tags.some((tag) => tag.slug === 'couple-prompt'), false);
});

test('indexable landing policies meet the restoration quality gate', () => {
	const titles = new Set();
	for (const [slug, policy] of Object.entries(INDEXABLE_LANDING_POLICIES)) {
		assert.ok(policy.seoTitle.length < 60, `${slug} title is ${policy.seoTitle.length} chars`);
		assert.equal(titles.has(policy.seoTitle), false, `${slug} repeats a title`);
		titles.add(policy.seoTitle);
		assert.match(policy.contentUpdatedAt, /^\d{4}-\d{2}-\d{2}$/);
		assert.ok(policy.relatedSlugs.length >= 3 && policy.relatedSlugs.length <= 6);
		assert.equal(policy.relatedSlugs.includes(slug), false);
		for (const related of policy.relatedSlugs) assert.equal(isTagIndexable(related), true, related);
	}
});

test('every initial indexed landing has a substantive authored guide', async () => {
	for (const slug of indexableSlugs) {
		const article = await readFile(new URL(`../src/data/tag-articles/${slug}.json`, import.meta.url), 'utf8');
		const parsed = JSON.parse(article);
		assert.ok(parsed.bodyHtml.length >= 1_000, `${slug} guide is too thin`);
		assert.ok(parsed.faqs.length >= 2, `${slug} needs useful FAQs`);
	}
});

test('redirect registry is cycle-free and always lands directly on an indexed page', () => {
	for (const [source, target] of Object.entries(TAG_REDIRECTS)) {
		assert.notEqual(source, target);
		assert.equal(TAG_REDIRECTS[target], undefined, `${source} creates a redirect chain`);
		assert.equal(isTagIndexable(target), true, `${source} targets non-indexable ${target}`);
	}
	assert.equal(TAG_REDIRECTS['nano-banana'], 'nano-banana-ai');
	assert.equal(TAG_REDIRECTS['banana-prompt'], 'nano-banana-prompt');
	assert.equal(TAG_REDIRECTS['couple-prompt-for-gemini-ai'], 'gemini-couple-photo-prompt');
});

test('reviewed membership seed satisfies counts and no two indexed grids are identical', () => {
	const signatures = new Set();
	const landingCountByPrompt = new Map();
	for (const [slug, policy] of Object.entries(INDEXABLE_LANDING_POLICIES)) {
		const members = INITIAL_LANDING_MEMBERSHIPS[slug];
		assert.ok(members, `missing seed for ${slug}`);
		assert.ok(members.length >= policy.minimumPrompts, `${slug} is below minimum`);
		assert.ok(members.length <= 24, `${slug} exceeds visible cap`);
		assert.equal(new Set(members).size, members.length, `${slug} repeats a prompt`);
		for (const member of members) landingCountByPrompt.set(member, (landingCountByPrompt.get(member) ?? 0) + 1);
		const signature = [...members].sort().join('|');
		assert.equal(signatures.has(signature), false, `${slug} duplicates another grid`);
		signatures.add(signature);
	}
	for (const [member, count] of landingCountByPrompt) assert.ok(count <= 4, `${member} belongs to ${count} landings`);
});

test('schema and migration contain the complete reviewed membership seed', async () => {
	const [schema, migration] = await Promise.all([
		readFile(new URL('../db/schema.sql', import.meta.url), 'utf8'),
		readFile(new URL('../db/migrations/0026-prompt-landing-memberships.sql', import.meta.url), 'utf8'),
	]);
	assert.match(schema, /CREATE TABLE prompt_landing_memberships/);
	assert.match(migration, /idx_prompt_landing_memberships_landing_position/);
	for (const [landing, members] of Object.entries(INITIAL_LANDING_MEMBERSHIPS)) {
		assert.match(migration, new RegExp(`\\('${landing.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`));
		for (const member of members) assert.equal(migration.includes(`"${member}"`), true, member);
	}
});

test('publishing membership validation permits zero to four known non-redirect landings', () => {
	assert.deepEqual(normalizeLandingSlugs(undefined), []);
	assert.deepEqual(normalizeLandingSlugs(['AI-IMAGE-PROMPT', 'ai-image-prompt']), ['ai-image-prompt']);
	assert.throws(() => normalizeLandingSlugs(['ai-image-prompt', 7]), /non-empty string/);
	assert.throws(() => normalizeLandingSlugs(['nano-banana']), /redirected landing slug/);
	assert.throws(() => normalizeLandingSlugs(['no-such-landing']), /Unknown/);
	assert.throws(() => normalizeLandingSlugs(indexableSlugs.slice(0, 5)), /at most 4/);
});

test('prompt slugs cannot shadow static or keyword routes', () => {
	assert.match(promptSlugConflict('blog') ?? '', /reserved/);
	assert.match(promptSlugConflict('nano-banana-prompt') ?? '', /keyword landing/);
	assert.equal(promptSlugConflict('couple-prompt'), undefined);
	assert.equal(promptSlugConflict('new-specific-prompt'), undefined);
});

test('landing query is exact membership-only and has no popular fallback', async () => {
	const source = await readFile(new URL('../src/lib/prompts.ts', import.meta.url), 'utf8');
	const start = source.indexOf('export async function getPromptsForLanding');
	const end = source.indexOf('export interface LandingMembershipStats');
	const landingQuery = source.slice(start, end);
	assert.match(landingQuery, /prompt_landing_memberships/);
	assert.doesNotMatch(source, /getPromptsByTag/);
	assert.doesNotMatch(landingQuery, /LIKE|fallback|popular/i);
});

test('only verified legacy articles redirect and unknown paths remain unmapped', () => {
	assert.equal(
		legacyEditorialTarget('/blog/mastering-nano-banana-guide-to-viral-ai-image-prompts_drm6g-qjqaw/'),
		'/blog/nano-banana-prompts',
	);
	assert.equal(legacyEditorialTarget('/category/writing-copy'), '/blog/how-to-write-a-good-ai-prompt');
	assert.equal(legacyEditorialTarget('/removed-pc-1234'), undefined);
	assert.ok(Object.keys(LEGACY_EDITORIAL_REDIRECTS).length >= 5);
});

test('early redirects collapse trailing-slash legacy and tag routes into one hop', () => {
	assert.equal(earlyRedirectTarget('/nano-banana/'), '/nano-banana-ai');
	assert.equal(earlyRedirectTarget('/banana-prompts/'), '/nano-banana-prompt');
	assert.equal(earlyRedirectTarget('/tag/nano-banana/'), '/nano-banana-ai');
	assert.equal(
		earlyRedirectTarget('/blog/master-ai-for-photorealistic-content-a-creators-guide_dspdsfwjckh/'),
		'/blog/how-to-edit-photos-with-ai-prompts',
	);
	assert.equal(earlyRedirectTarget('/category/writing-copy/'), '/blog/how-to-write-a-good-ai-prompt');
	assert.equal(earlyRedirectTarget('/couple-prompt/'), undefined);
});

test('sitemap dates use the latest trustworthy date and clamp the future', () => {
	const now = new Date('2026-08-30T12:00:00Z');
	assert.equal(materialLastmod(['2026-08-20', '2026-08-29'], now), '2026-08-29');
	assert.equal(materialLastmod(['2026-09-12', '2026-08-29'], now), '2026-08-30');
	assert.equal(trustworthyDay('not-a-date', now), undefined);
	assert.equal(trustworthyDay('2026-02-31', now), undefined);
});

test('sitemap XML is segmented, absolute, unique, and rejects query URLs', () => {
	const index = renderSitemapIndex(['/sitemaps/core.xml', '/sitemaps/prompts.xml', '/sitemaps/editorial.xml']);
	assert.equal((index.match(/<sitemap>/g) ?? []).length, 3);
	assert.match(index, /https:\/\/freepromptbase\.com\/sitemaps\/prompts\.xml/);
	const urls = renderUrlset([
		{ loc: '/', lastmod: '2026-08-30' },
		{ loc: '/example-prompt', images: [{ url: '/cdn/prompts/example.webp', title: 'Example & prompt' }] },
	]);
	assert.match(urls, /<loc>https:\/\/freepromptbase\.com\/<\/loc>/);
	assert.match(urls, /https:\/\/freepromptbase\.com\/cdn\/prompts\/example\.webp/);
	assert.match(urls, /Example &amp; prompt/);
	assert.throws(() => renderUrlset([{ loc: '/?q=test' }]), /query or fragment/);
	assert.throws(() => renderUrlset([{ loc: '/same' }, { loc: '/same' }]), /Duplicate/);
	for (const xml of [index, urls]) {
		const parsed = spawnSync('/usr/bin/xmllint', ['--noout', '-'], { input: xml, encoding: 'utf8' });
		assert.equal(parsed.status, 0, parsed.stderr);
	}
});

test('route and sitemap sources preserve canonical, 301, 404, and child ownership rules', async () => {
	const [middleware, notFound, rootSitemap, core, prompts, editorial] = await Promise.all([
		readFile(new URL('../src/middleware.ts', import.meta.url), 'utf8'),
		readFile(new URL('../src/pages/404.astro', import.meta.url), 'utf8'),
		readFile(new URL('../src/pages/sitemap.xml.ts', import.meta.url), 'utf8'),
		readFile(new URL('../src/pages/sitemaps/core.xml.ts', import.meta.url), 'utf8'),
		readFile(new URL('../src/pages/sitemaps/prompts.xml.ts', import.meta.url), 'utf8'),
		readFile(new URL('../src/pages/sitemaps/editorial.xml.ts', import.meta.url), 'utf8'),
	]);
	assert.match(middleware, /CANONICAL_HOST = 'freepromptbase\.com'/);
	assert.equal(middleware.includes("path.replace(/\\/+$/, '')"), true);
	assert.match(middleware, /redirect\(dest\.toString\(\), 301\)/);
	assert.match(middleware, /X-Robots-Tag', 'noindex, follow'/);
	assert.match(notFound, /Astro\.response\.status = 404/);
	assert.match(rootSitemap, /core\.xml/);
	assert.doesNotMatch(core, /loc: `\/\$\{prompt\.slug\}`/);
	assert.match(prompts, /loc: `\/\$\{prompt\.slug\}`/);
	assert.doesNotMatch(prompts, /\/blog|\/news/);
	assert.match(editorial, /loc: '\/blog'/);
	assert.match(editorial, /loc: '\/news'/);
});
