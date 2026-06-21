// Cloudflare Image Transformations helpers (/cdn-cgi/image/...).
//
// Originals stay untouched in R2 and are served via the /cdn/<key> proxy.
// Cloudflare resizes on the fly and serves AVIF/WebP automatically
// (format=auto), so we can hand small images to cards and full-res to detail
// pages from a single source file. Transformations must be enabled on the zone
// (Dashboard → Images → Transformations).
//
// Only our own same-origin /cdn/ images are transformed; anything else (and
// SVGs) is returned unchanged so the helper is always safe to call.

// 76 is visually indistinguishable from 82 for AVIF/WebP at card/cover sizes but
// ~25% smaller — directly trims LCP bytes (the scored metric).
const DEFAULT_QUALITY = 76;

// Cloudflare Image Transformations only run on a real zone (the production
// domain). On *.workers.dev preview URLs and on localhost the /cdn-cgi/image/
// prefix isn't served, so a relative transform URL 404s and every card/cover
// srcset breaks. Emitting the transform URL as an absolute on the canonical
// origin makes those environments load the (already transformed + edge-cached)
// image straight from production, so images render everywhere. On production
// itself this is just a same-origin absolute URL, so nothing changes there.
const ORIGIN = import.meta.env.SITE ?? 'https://freepromptbase.com';

function cdnPath(src: string | undefined | null): string | null {
  if (!src) return null;
  let path = src;
  try {
    path = new URL(src).pathname; // strip origin from absolute URLs
  } catch {
    /* already a path */
  }
  if (!path.startsWith('/cdn/')) return null; // only our proxied media
  if (/\.svg(\?|$)/i.test(path)) return null; // never rasterise SVG
  return path;
}

/** Single transformed URL at a given width (AVIF/WebP auto-negotiated). */
export function cfImg(src: string, width: number, quality = DEFAULT_QUALITY): string {
  const path = cdnPath(src);
  if (!path) return src;
  return `${ORIGIN}/cdn-cgi/image/width=${width},quality=${quality},format=auto/${path.replace(/^\//, '')}`;
}

/** `srcset` string across widths, or undefined when src isn't transformable. */
export function cfSrcset(
  src: string,
  widths: number[],
  quality = DEFAULT_QUALITY,
): string | undefined {
  if (!cdnPath(src)) return undefined;
  return widths.map((w) => `${cfImg(src, w, quality)} ${w}w`).join(', ');
}
