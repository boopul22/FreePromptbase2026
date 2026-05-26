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

  const promptRow = await db
    .prepare('SELECT like_count FROM prompts WHERE slug = ?')
    .bind(slug)
    .first<{ like_count: number }>();
  if (!promptRow) return json({ error: 'Not found' }, 404);

  const inserted = await db
    .prepare(
      'INSERT OR IGNORE INTO prompt_likes (actor_id, prompt_slug) VALUES (?, ?)',
    )
    .bind(actorId, slug)
    .run();

  let liked: boolean;
  let count: number;

  if (inserted.meta.changes > 0) {
    liked = true;
    count = promptRow.like_count + 1;
    await db.batch([
      db.prepare('UPDATE prompts SET like_count = like_count + 1 WHERE slug = ?').bind(slug),
      db
        .prepare('INSERT INTO prompt_events (prompt_slug, actor_id, kind) VALUES (?, ?, ?)')
        .bind(slug, actorId, 'like'),
    ]);
  } else {
    liked = false;
    count = Math.max(0, promptRow.like_count - 1);
    await db.batch([
      db
        .prepare('DELETE FROM prompt_likes WHERE actor_id = ? AND prompt_slug = ?')
        .bind(actorId, slug),
      db
        .prepare(
          'UPDATE prompts SET like_count = MAX(0, like_count - 1) WHERE slug = ?',
        )
        .bind(slug),
      db
        .prepare('INSERT INTO prompt_events (prompt_slug, actor_id, kind) VALUES (?, ?, ?)')
        .bind(slug, actorId, 'unlike'),
    ]);
  }

  return json({ liked, count });
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
