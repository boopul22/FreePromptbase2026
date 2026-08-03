export const prerender = false;

import type { APIRoute } from 'astro';
import { requireAgentAuth } from '../../../../lib/agentAuth';
import { invalidatePublicPaths } from '../../../../lib/publicCache';

export const POST: APIRoute = async ({ request }) => {
  const unauthorized = await requireAgentAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const paths = Array.isArray(body?.paths) ? body.paths.filter((item: unknown) => typeof item === 'string') : [];
    if (paths.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Provide a non-empty paths array.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const invalidated = await invalidatePublicPaths(paths);
    return new Response(JSON.stringify({ success: true, invalidated }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Invalidation failed.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
