// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
	// Cloudflare adapter — enables on-demand (SSR) rendering for the D1-backed
	// pages. Static pages (about, privacy, terms, 404) stay prerendered; only
	// pages with `export const prerender = false` render at request time.
	// platformProxy exposes Cloudflare bindings (D1) during `astro dev`.
	adapter: cloudflare({ platformProxy: { enabled: true } }),

	// SSR everywhere — the CMS middleware resolves sessions for every request,
	// so we need request-time rendering. Pages that don't need it (about/privacy/
	// terms/404) still opt into pre-render via `export const prerender = true`.
	output: 'server',

	// Canonical production URL — powers <link rel="canonical">, Open Graph URLs
	// and the generated sitemap.
	site: 'https://freepromptbase.com',

	// Clean URLs without trailing slashes. `build.format: 'file'` emits
	// `/slug.html` (not `/slug/index.html`) so Cloudflare Workers static assets
	// serve `/slug` with a 200 instead of a 307 trailing-slash redirect.
	trailingSlash: 'never',
	build: { format: 'file' },

	// Sitemap is generated dynamically from D1 at /sitemap.xml (see
	// src/pages/sitemap.xml.ts) so it always reflects current prompts.

	// Tailwind CSS v4 via the official Vite plugin (the @astrojs/tailwind
	// integration is deprecated as of Tailwind v4 / Astro 6).
	vite: {
		plugins: [tailwindcss()],
	},

	// Astro 6 built-in Fonts API — self-hosts Rubik (body + heading role)
	// with automatic download, caching, fallbacks and preload optimization.
	fonts: [
		{
			name: 'Rubik',
			cssVariable: '--font-rubik',
			provider: fontProviders.google(),
			weights: ['300', '400', '500', '600', '700'],
			styles: ['normal'],
		},
	],
});
