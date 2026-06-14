export const prerender = false;

import type { APIRoute } from 'astro';
import { getDB } from '../../../../lib/db';

// Records a prompt view. Deduped to one counted view per actor per prompt per
// 24h so refreshes and bots can't inflate the ranking behind Prompt of the Day.
// Mirrors the share endpoint: bumps the denormalized prompts.view_count and logs
// a kind='view' row in prompt_events (which powers the trailing-window query).
export const POST: APIRoute = async ({ params, locals }) => {
  const slug = params.slug;
  const actorId = locals.actorId;
  if (!slug || !actorId) return json({ error: 'Bad request' }, 400);

  const db = getDB(locals);

  const promptRow = await db
    .prepare('SELECT view_count FROM prompts WHERE slug = ?')
    .bind(slug)
    .first<{ view_count: number }>();
  if (!promptRow) return json({ error: 'Not found' }, 404);

  // Already counted a view from this actor in the last 24h? No-op (idempotent).
  const recent = await db
    .prepare(
      `SELECT 1 FROM prompt_events
       WHERE prompt_slug = ? AND actor_id = ? AND kind = 'view'
         AND created_at > datetime('now', '-1 day')
       LIMIT 1`,
    )
    .bind(slug, actorId)
    .first<{ 1: number }>();
  if (recent) return json({ count: promptRow.view_count, counted: false });

  await db.batch([
    db.prepare('UPDATE prompts SET view_count = view_count + 1 WHERE slug = ?').bind(slug),
    db
      .prepare('INSERT INTO prompt_events (prompt_slug, actor_id, kind) VALUES (?, ?, ?)')
      .bind(slug, actorId, 'view'),
  ]);

  return json({ count: promptRow.view_count + 1, counted: true });
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
