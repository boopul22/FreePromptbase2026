export const prerender = false;

import type { APIRoute } from 'astro';
import { getDB } from '../../../../../../lib/db';
import { logActivity } from '../../../../../../lib/cms';

// Publish an admin draft → 'approved' (the public/live state). Refreshes `date`
// so the prompt sorts into "Newest" at the publish moment. This is the admin
// direct-publish path; user submissions go through the review queue instead, so
// publishing a 'pending'/'rejected' prompt here is refused.
export const POST: APIRoute = async ({ params, locals }) => {
  if (!locals.user || locals.user.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const db = getDB(locals);
  const slug = params.slug!;

  const prompt = await db
    .prepare('SELECT title, status FROM prompts WHERE slug = ?')
    .bind(slug)
    .first<{ title: string; status: string }>();
  if (!prompt) {
    return new Response(JSON.stringify({ error: 'Prompt not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }
  if (prompt.status === 'pending' || prompt.status === 'rejected') {
    return new Response(
      JSON.stringify({ error: 'This is a user submission — approve it from the review queue instead.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Publishing always means "live now": clear any pending schedule so a
  // scheduled prompt published from the list isn't left hidden by a future time.
  const today = new Date().toISOString().slice(0, 10);
  await db
    .prepare("UPDATE prompts SET status = 'approved', date = ?, publish_at = NULL, updated_at = datetime('now') WHERE slug = ?")
    .bind(today, slug)
    .run();

  await logActivity(db, {
    userId: locals.user.id,
    userName: locals.user.name,
    action: 'publish_prompt',
    entityType: 'prompt',
    entityId: slug,
    entityTitle: prompt.title,
  });

  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
