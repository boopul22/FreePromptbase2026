const SITE_ORIGIN = 'https://freepromptbase.com';
// Bump after a structural public-HTML change that must bypass previously stored
// Cache API entries immediately. The revision lives only in the internal cache
// key; visitors and canonical URLs never see it.
const PUBLIC_CACHE_REVISION = '2026-08-09-prompt-edit';

export function publicCacheKey(url: string | URL): Request {
  const key = new URL(url.toString());
  key.searchParams.set('__fpb_cache', PUBLIC_CACHE_REVISION);
  return new Request(key.toString());
}

function getCache(): Cache | null {
  try {
    return (globalThis.caches as unknown as { default?: Cache })?.default ?? null;
  } catch {
    return null;
  }
}

export async function invalidatePublicPaths(paths: string[]): Promise<{ path: string; deleted: boolean }[]> {
  const cache = getCache();
  const uniquePaths = [...new Set(paths)]
    .filter((path) => path.startsWith('/') && !path.startsWith('//'))
    .slice(0, 20);
  if (!cache) return uniquePaths.map((path) => ({ path, deleted: false }));

  return Promise.all(uniquePaths.map(async (path) => ({
    path,
    deleted: await cache.delete(publicCacheKey(`${SITE_ORIGIN}${path}`)),
  })));
}

export async function invalidatePromptPublish(slug: string, category: string): Promise<void> {
  await invalidatePublicPaths([
    `/${encodeURIComponent(slug)}`,
    '/',
    `/category/${encodeURIComponent(category)}`,
    '/categories',
    '/sitemap.xml',
  ]);
}
