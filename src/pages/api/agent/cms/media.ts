export const prerender = false;

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getDB } from '../../../../lib/db';
import { getAgentActor, requireAgentAuth } from '../../../../lib/agentAuth';
import {
  AGENT_MEDIA_MAX_FILES,
  MEDIA_ALLOWED_TYPES,
  MEDIA_MAX_SIZE,
  publishMediaFile,
} from '../../../../lib/mediaPublishing';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request, locals }) => {
  const unauthorized = await requireAgentAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const formData = await request.formData();
    const files = [
      ...formData.getAll('files'),
      ...formData.getAll('file'),
    ].filter((item): item is File => item instanceof File);
    if (files.length === 0) return json({ success: false, error: 'Attach at least one file using “files”.' }, 400);
    if (files.length > AGENT_MEDIA_MAX_FILES) {
      return json({ success: false, error: `Maximum ${AGENT_MEDIA_MAX_FILES} files per request.` }, 400);
    }
    // Validate the whole batch before the first R2 write so a bad later file
    // cannot leave the request partially uploaded.
    for (const file of files) {
      if (!MEDIA_ALLOWED_TYPES.includes(file.type as any)) {
        return json({ success: false, error: `${file.name}: unsupported file type ${file.type || 'unknown'}.` }, 400);
      }
      if (file.size <= 0 || file.size > MEDIA_MAX_SIZE) {
        return json({ success: false, error: `${file.name}: invalid size (maximum 10MB).` }, 400);
      }
    }

    const db = getDB(locals);
    const actor = await getAgentActor(db);
    const folder = String(formData.get('folder') || 'prompts');
    const altText = String(formData.get('alt_text') || '');
    const uploads = [];
    for (const file of files) {
      uploads.push(await publishMediaFile({
        db,
        bucket: (env as any).R2,
        publicBaseUrl: String((env as any).R2_PUBLIC_URL || 'https://freepromptbase.com/cdn'),
        file,
        folder,
        altText,
        actor,
      }));
    }

    return json({ success: true, uploads }, uploads.every((item) => item.deduped) ? 200 : 201);
  } catch (error) {
    return json({ success: false, error: error instanceof Error ? error.message : 'Upload failed.' }, 400);
  }
};
