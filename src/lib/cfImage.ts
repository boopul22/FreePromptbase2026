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

const DEFAULT_QUALITY = 82;

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
  return `/cdn-cgi/image/width=${width},quality=${quality},format=auto/${path.replace(/^\//, '')}`;
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
