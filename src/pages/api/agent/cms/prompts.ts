export const prerender = false;

import type { APIRoute } from 'astro';
import { getDB } from '../../../../lib/db';
import { getAgentActor, requireAgentAuth } from '../../../../lib/agentAuth';
import { publishPrompt, PromptPublishError, updatePrompt } from '../../../../lib/promptPublishing';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request, locals, url }) => {
  const unauthorized = await requireAgentAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const db = getDB(locals);
    const actor = await getAgentActor(db);
    const body = await request.json();
    const dryRun = url.searchParams.get('dryRun') === '1' || body?.dryRun === true;
    const result = await publishPrompt({ db, body, actor, mode: 'agent', dryRun });
    return json(result, dryRun || result.idempotent ? 200 : 201);
  } catch (error) {
    const status = error instanceof PromptPublishError ? error.status : 500;
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Prompt publishing failed.',
    }, status);
  }
};

export const PATCH: APIRoute = async ({ request, locals, url }) => {
  const unauthorized = await requireAgentAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const db = getDB(locals);
    const actor = await getAgentActor(db);
    const body = await request.json();
    const dryRun = url.searchParams.get('dryRun') === '1' || body?.dryRun === true;
    const result = await updatePrompt({ db, body, actor, dryRun });
    return json(result, 200);
  } catch (error) {
    const status = error instanceof PromptPublishError ? error.status : 500;
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Prompt update failed.',
    }, status);
  }
};
