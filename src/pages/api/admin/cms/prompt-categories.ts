export const prerender = false;

import type { APIRoute } from 'astro';
import { getDB } from '../../../../lib/db';

// Prompt categories are seed-managed (src/data/categories.ts). This endpoint
// exposes them read-only so admin forms (the prompt editor) can populate a
// category <select>. Add a write endpoint here when self-service category
// management is needed.

export const GET: APIRoute = async ({ locals }) => {
  if (!locals.user || locals.user.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const db = getDB(locals);
  const rows = await db
    .prepare('SELECT slug, name, description, emoji, sort_order FROM prompt_categories ORDER BY sort_order')
    .all<{ slug: string; name: string; description: string; emoji: string; sort_order: number }>();

  return new Response(
    JSON.stringify({
      success: true,
      categories: (rows.results || []).map((c) => ({
        slug: c.slug,
        name: c.name,
        description: c.description,
        emoji: c.emoji,
        sortOrder: c.sort_order,
      })),
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
};
