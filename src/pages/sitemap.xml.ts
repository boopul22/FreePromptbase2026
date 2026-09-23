import type { APIRoute } from 'astro';
import { renderSitemapIndex, sitemapResponse } from '../lib/sitemap';

export const prerender = false;

export const GET: APIRoute = async () => sitemapResponse(renderSitemapIndex([
	'/sitemaps/core.xml',
	'/sitemaps/prompts.xml',
	'/sitemaps/editorial.xml',
]));
