import test from 'node:test';
import assert from 'node:assert/strict';
import { routedPath } from '../src/lib/routedPath.ts';

test('spellings Astro routes to /admin normalise to the gated path', () => {
	for (const raw of ['/%61dmin/cms', '//admin/cms', '///admin/cms', '/%61dmin//cms']) {
		assert.equal(routedPath(raw), '/admin/cms');
	}
	assert.equal(routedPath('/%73ubmit'), '/submit');
	assert.equal(routedPath('/%61pi/%61dmin/cms/users'), '/api/admin/cms/users');
});

test('ordinary and malformed paths are left alone', () => {
	assert.equal(routedPath('/'), '/');
	assert.equal(routedPath('/nano-banana-prompt'), '/nano-banana-prompt');
	assert.equal(routedPath('/%E0%A4%A'), '/%E0%A4%A');
	assert.equal(routedPath('/a%2Fb'), '/a%2Fb');
});
