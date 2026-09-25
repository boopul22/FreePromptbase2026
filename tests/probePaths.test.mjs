import test from 'node:test';
import assert from 'node:assert/strict';
import { isProbePath, probeNotFoundResponse } from '../src/data/probe-paths.ts';

test('scanner probe paths are recognised', () => {
	for (const path of [
		'/.env',
		'/.env.production',
		'/.git/config',
		'/.aws/credentials',
		'/index.php',
		'/admin/config.php',
		'/wp-login.php',
		'/wp-admin/',
		'/wp-content/uploads/x.png',
		'/blog/wp-includes/wlwmanifest.xml',
		'/wordpress',
		'/cgi-bin/luci',
		'/google-service-account.json',
		'/config.json',
		'/backup.sql',
		'/db.bak',
		'/docker-compose.yml',
		'/app.yaml',
		'/web.config',
		'/default.aspx',
		'/php.ini',
		'/.well-known/../.env',
	]) {
		assert.equal(isProbePath(path), true, path);
	}
});

test('real site routes are never treated as probes', () => {
	for (const path of [
		'/',
		'/nano-banana-prompt',
		'/gemini-ai-photo-prompt',
		'/blog',
		'/blog/how-to-write-a-good-ai-prompt',
		'/news/rss.xml',
		'/blog/rss.xml',
		'/sitemap.xml',
		'/sitemaps/prompts.xml',
		'/news-sitemap.xml',
		'/pinterest/rss.xml',
		'/pinterest/images.xml',
		'/og/some-prompt.svg',
		'/skills/agent-workflow-architect.md',
		'/robots.txt',
		'/llms.txt',
		'/ads.txt',
		'/logo.svg',
		'/logo-kit.zip',
		'/.well-known/security.txt',
		'/api/prompts/foo/save',
		'/api/anything.json',
		'/cdn/uploads/file.json',
		'/partials/prompts',
		'/category/images',
		'/tools/gemini-prompt-generator',
	]) {
		assert.equal(isProbePath(path), false, path);
	}
});

test('probe response is a small cacheable noindex 404', async () => {
	const res = probeNotFoundResponse();
	assert.equal(res.status, 404);
	assert.match(res.headers.get('content-type') ?? '', /^text\/plain/);
	assert.match(res.headers.get('x-robots-tag') ?? '', /noindex/);
	assert.equal(await res.text(), 'Not found');
});
