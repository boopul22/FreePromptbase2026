// @ts-ignore - cloudflare:workers is a Workers-only built-in module
import { env } from 'cloudflare:workers';

export function getDB(_locals?: App.Locals): D1Database {
  return env.DB as unknown as D1Database;
}
