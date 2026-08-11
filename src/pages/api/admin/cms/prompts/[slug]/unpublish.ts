export const prerender = false;

import type { APIRoute } from 'astro';
import { getDB } from '../../../../../../lib/db';
import { logActivity } from '../../../../../../lib/cms';
import { invalidatePromptPublish } from '../../../../../../lib/publicCache';

// Move a live prompt back to 'draft' (pulls it from the public site). Refused
// for user submissions ('pending'/'rejected') — those belong to the review flow.
export const POST: APIRoute = async ({ params, locals }) => {
  if (!locals.user || locals.user.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const db = getDB(locals);
  const slug = params.slug!;

  const prompt = await db
    .prepare('SELECT title, status, category FROM prompts WHERE slug = ?')
    .bind(slug)
    .first<{ title: string; status: string; category: string }>();
  if (!prompt) {
    return new Response(JSON.stringify({ error: 'Prompt not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }
  if (prompt.status === 'pending' || prompt.status === 'rejected') {
    return new Response(
      JSON.stringify({ error: 'This is a user submission — manage it from the review queue instead.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  await db
    .prepare("UPDATE prompts SET status = 'draft', updated_at = datetime('now') WHERE slug = ?")
    .bind(slug)
    .run();

  await logActivity(db, {
    userId: locals.user.id,
    userName: locals.user.name,
    action: 'unpublish_prompt',
    entityType: 'prompt',
    entityId: slug,
    entityTitle: prompt.title,
  });

  await invalidatePromptPublish(slug, prompt.category);

  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
