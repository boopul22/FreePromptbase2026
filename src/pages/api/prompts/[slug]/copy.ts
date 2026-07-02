export const prerender = false;

import type { APIRoute } from 'astro';
import { getDB } from '../../../../lib/db';

// Records a prompt copy — the main conversion event on a prompt page.
// Mirrors the view endpoint: bumps the denormalized prompts.copy_count and logs
// a kind='copy' row in prompt_events (which powers the admin stats page).
// Deduped to one counted copy per actor per prompt per minute so double-clicks
// and button mashing can't inflate the numbers.
export const POST: APIRoute = async ({ params, locals }) => {
  const slug = params.slug;
  const actorId = locals.actorId;
  if (!slug || !actorId) return json({ error: 'Bad request' }, 400);

  const db = getDB(locals);

  const promptRow = await db
    .prepare('SELECT copy_count FROM prompts WHERE slug = ?')
    .bind(slug)
    .first<{ copy_count: number }>();
  if (!promptRow) return json({ error: 'Not found' }, 404);

  const recent = await db
    .prepare(
      `SELECT 1 FROM prompt_events
       WHERE prompt_slug = ? AND actor_id = ? AND kind = 'copy'
         AND created_at > datetime('now', '-60 seconds')
       LIMIT 1`,
    )
    .bind(slug, actorId)
    .first<{ 1: number }>();
  if (recent) return json({ count: promptRow.copy_count, counted: false });

  await db.batch([
    db.prepare('UPDATE prompts SET copy_count = copy_count + 1 WHERE slug = ?').bind(slug),
    db
      .prepare('INSERT INTO prompt_events (prompt_slug, actor_id, kind) VALUES (?, ?, ?)')
      .bind(slug, actorId, 'copy'),
  ]);

  return json({ count: promptRow.copy_count + 1, counted: true });
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
