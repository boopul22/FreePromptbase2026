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
    .prepare('SELECT share_count FROM prompts WHERE slug = ?')
    .bind(slug)
    .first<{ share_count: number }>();
  if (!promptRow) return json({ error: 'Not found' }, 404);

  await db.batch([
    db.prepare('UPDATE prompts SET share_count = share_count + 1 WHERE slug = ?').bind(slug),
    db
      .prepare('INSERT INTO prompt_events (prompt_slug, actor_id, kind) VALUES (?, ?, ?)')
      .bind(slug, actorId, 'share'),
  ]);

  return json({ count: promptRow.share_count + 1 });
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
