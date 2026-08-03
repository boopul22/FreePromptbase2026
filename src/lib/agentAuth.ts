// Bearer-token authentication for machine/agent publishing endpoints.
// The token is a Cloudflare Worker secret (AGENT_PUBLISH_TOKEN), never a
// committed var. Keeping this separate from browser sessions makes agent
// publishing explicit, revocable, and easy to audit.

// @ts-ignore - cloudflare:workers is a Workers-only built-in module
import { env } from 'cloudflare:workers';

function jsonError(error: string, status: number): Response {
  return new Response(JSON.stringify({ success: false, error }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function sha256(value: string): Promise<Uint8Array> {
  const data = new TextEncoder().encode(value);
  return new Uint8Array(await crypto.subtle.digest('SHA-256', data));
}

async function constantTimeEqual(a: string, b: string): Promise<boolean> {
  const [left, right] = await Promise.all([sha256(a), sha256(b)]);
  let diff = 0;
  for (let i = 0; i < left.length; i++) diff |= left[i] ^ right[i];
  return diff === 0;
}

export async function requireAgentAuth(request: Request): Promise<Response | null> {
  const configured = String((env as any).AGENT_PUBLISH_TOKEN || '').trim();
  if (!configured) return jsonError('Agent publishing is not configured.', 503);

  const authorization = request.headers.get('authorization') || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match || !(await constantTimeEqual(match[1].trim(), configured))) {
    return jsonError('Unauthorized.', 401);
  }
  return null;
}

export interface AgentActor {
  id: string;
  name: string;
}

export async function getAgentActor(db: D1Database): Promise<AgentActor> {
  const configuredId = String((env as any).AGENT_PUBLISH_USER_ID || '').trim();
  if (!configuredId) throw new Error('AGENT_PUBLISH_USER_ID is not configured.');

  const user = await db
    .prepare("SELECT id, name FROM users WHERE id = ? AND role = 'admin' AND is_banned = 0")
    .bind(configuredId)
    .first<AgentActor>();
  if (!user) throw new Error('Configured agent publishing user is missing or is not an active admin.');
  return user;
}
