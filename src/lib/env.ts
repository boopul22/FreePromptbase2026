// @ts-ignore - cloudflare:workers is a Workers-only built-in module
import { env } from 'cloudflare:workers';

export function getEnv(_locals?: App.Locals): Record<string, string> {
  return env as unknown as Record<string, string>;
}

export function getDB(_locals?: App.Locals): D1Database | null {
  try {
    return env.DB as unknown as D1Database;
  } catch {
    return null;
  }
}
