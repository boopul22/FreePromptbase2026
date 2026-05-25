// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
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
