import test from 'node:test';
import assert from 'node:assert/strict';
import { LEGACY_EDITORIAL_REDIRECTS, legacyEditorialTarget } from '../src/data/legacy-redirects.ts';

test('still-indexed 404 and recent Search Console 404s 301 to live equivalents', () => {
	assert.equal(
		legacyEditorialTarget('/principal-ai-code-reviewer-senior-software-engineer-architect-prompt-pc-1101/'),
		'/blog/chatgpt-prompt-frameworks',
	);
	assert.equal(
		legacyEditorialTarget('/blog/artistabhii__dpaxmxzeaps_blog/'),
		'/gemini-ai-photo-prompt',
	);
	assert.equal(
		legacyEditorialTarget('/blog/image-generation/master-the-stranger-things-ai-aesthetic-with-nanobanana_ds7kp9texka/'),
		'/nano-banana-prompt',
	);
	assert.equal(legacyEditorialTarget('/category/writing-copy/'), '/blog/how-to-write-a-good-ai-prompt');
});

test('old /prompts/ folder maps to an equivalent live page, never a 404', () => {
	assert.equal(legacyEditorialTarget('/prompts/photo-prompts'), '/photo-editing-prompt');
	assert.equal(
		legacyEditorialTarget('/prompts/chatgpt-prompt-for-answering-physics-problem-assignment-solutions'),
		'/blog/chatgpt-prompt-frameworks',
	);
	assert.equal(
		legacyEditorialTarget('/prompts/complete-mobile-app-development-prompt-for-expert-level'),
		'/skills',
	);
	assert.equal(legacyEditorialTarget('/prompts/banana-prompt'), '/nano-banana-prompt');
	assert.equal(
		legacyEditorialTarget('/prompts/gemini-couple-street-portrait'),
		'/gemini-ai-photo-prompt-copy-paste',
	);
	assert.equal(legacyEditorialTarget('/prompts/random-legacy-prompt-slug'), '/photo-editing-prompt');
});

test('old tools and nested image-generation blogs collapse in one hop', () => {
	assert.equal(legacyEditorialTarget('/add-prompt'), '/submit');
	assert.equal(legacyEditorialTarget('/prompt-engineering'), '/blog/how-to-write-a-good-ai-prompt');
	assert.equal(legacyEditorialTarget('/image-to-prompt'), '/tools/gemini-prompt-generator');
	assert.equal(
		legacyEditorialTarget('/blog/image-generation/master-gemini-prompts-for-viral-social-media-content_dsrx4_sfkyv'),
		'/gemini-ai-photo-prompt-copy-paste',
	);
	assert.equal(
		legacyEditorialTarget('/blog/awaisthedesigner_dosemnydgen_blog'),
		'/gemini-ai-photo-prompt',
	);
});

test('legacy 404s from the 23 Sep 2026 audit land on indexed pages in one hop', () => {
	assert.equal(
		legacyEditorialTarget('/blog/master-nature-themed-ai-prompt-engineering-a-strategy-guide_dslgcagkygo/'),
		'/prompt-for-gemini-ai',
	);
	assert.equal(
		legacyEditorialTarget('/blog/mastering-gemini-nano-banana-prompts-2025-creator-guide_ds6fiarfaf2/'),
		'/nano-banana-prompt',
	);
	assert.equal(legacyEditorialTarget('/category/image-generation/'), '/category/images');
	assert.equal(legacyEditorialTarget('/category/coding/'), '/blog/chatgpt-prompt-frameworks');
	assert.equal(legacyEditorialTarget('/disclaimer/'), '/terms');
});

test('live current pages are not swallowed by legacy rules', () => {
	assert.equal(legacyEditorialTarget('/'), undefined);
	assert.equal(legacyEditorialTarget('/nano-banana-prompt'), undefined);
	assert.equal(legacyEditorialTarget('/blog/nano-banana-prompts'), undefined);
	assert.equal(legacyEditorialTarget('/blog/ai-photo-prompt-ideas'), undefined);
	assert.equal(legacyEditorialTarget('/category/images'), undefined);
	assert.equal(legacyEditorialTarget('/removed-pc-1234'), undefined);
	assert.ok(LEGACY_EDITORIAL_REDIRECTS['/principal-ai-code-reviewer-senior-software-engineer-architect-prompt-pc-1101']);
});
