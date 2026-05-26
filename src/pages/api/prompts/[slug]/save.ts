export const prerender = false;

import type { APIRoute } from 'astro';
import { getDB } from '../../../../lib/db';

export const POST: APIRoute = async ({ params, locals }) => {
  const slug = params.slug;
  const actorId = locals.actorId;
  if (!slug || !actorId) {
    return json({ error: 'Bad request' }, 400);
  }

  const db = getDB(locals);

  // Confirm the prompt exists (and capture current save_count) before mutating.
  const promptRow = await db
    .prepare('SELECT save_count FROM prompts WHERE slug = ?')
    .bind(slug)
    .first<{ save_count: number }>();
  if (!promptRow) return json({ error: 'Not found' }, 404);

  // Try to insert the save row. INSERT OR IGNORE returns changes=0 if the row
  // already existed → that's the "toggle off" branch.
  const inserted = await db
    .prepare(
      'INSERT OR IGNORE INTO prompt_saves (actor_id, prompt_slug) VALUES (?, ?)',
    )
    .bind(actorId, slug)
    .run();

  let saved: boolean;
  let count: number;

  if (inserted.meta.changes > 0) {
    saved = true;
    count = promptRow.save_count + 1;
    await db.batch([
      db.prepare('UPDATE prompts SET save_count = save_count + 1 WHERE slug = ?').bind(slug),
      db
        .prepare('INSERT INTO prompt_events (prompt_slug, actor_id, kind) VALUES (?, ?, ?)')
        .bind(slug, actorId, 'save'),
    ]);
  } else {
    saved = false;
    count = Math.max(0, promptRow.save_count - 1);
    await db.batch([
      db
        .prepare('DELETE FROM prompt_saves WHERE actor_id = ? AND prompt_slug = ?')
        .bind(actorId, slug),
      db
        .prepare(
          'UPDATE prompts SET save_count = MAX(0, save_count - 1) WHERE slug = ?',
        )
        .bind(slug),
      db
        .prepare('INSERT INTO prompt_events (prompt_slug, actor_id, kind) VALUES (?, ?, ?)')
        .bind(slug, actorId, 'unsave'),
    ]);
  }

  return json({ saved, count });
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
