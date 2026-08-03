const SITE_ORIGIN = 'https://freepromptbase.com';

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
    deleted: await cache.delete(new Request(`${SITE_ORIGIN}${path}`)),
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
