// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
	// Canonical production URL — powers <link rel="canonical">, Open Graph URLs
	// and the generated sitemap.
	site: 'https://freepromptbase.com',

	// Clean URLs without trailing slashes. `build.format: 'file'` emits
	// `/slug.html` (not `/slug/index.html`) so Cloudflare Workers static assets
	// serve `/slug` with a 200 instead of a 307 trailing-slash redirect.
	trailingSlash: 'never',
	build: { format: 'file' },

	integrations: [sitemap()],

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
