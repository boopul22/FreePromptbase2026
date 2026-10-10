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

// Billing: Cloudflare charges per *unique* transformation (image × width ×
// quality) each month beyond 5,000 free. Cards, detail pages, feeds and blog
// posts used to ask for ~9 different width/quality pairs per image, so every
// width is snapped up to one shared ladder and a single quality is used
// site-wide — the same few variants are reused everywhere.
const WIDTH_LADDER = [400, 720, 1080, 1600] as const;
const SITE_QUALITY = 72;
const DEFAULT_QUALITY = SITE_QUALITY;

function snapWidth(width: number): number {
  return WIDTH_LADDER.find((w) => w >= width) ?? WIDTH_LADDER[WIDTH_LADDER.length - 1];
}

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
// `quality` is accepted for call-site compatibility but ignored: one site-wide
// quality keeps the unique-transformation count down (see WIDTH_LADDER).
export function cfImg(src: string, width: number, _quality = DEFAULT_QUALITY): string {
  const path = cdnPath(src);
  if (!path) return src;
  return `${ORIGIN}/cdn-cgi/image/width=${snapWidth(width)},quality=${SITE_QUALITY},format=auto/${path.replace(/^\//, '')}`;
}

/** `srcset` string across widths, or undefined when src isn't transformable. */
export function cfSrcset(
  src: string,
  widths: number[],
  quality = DEFAULT_QUALITY,
): string | undefined {
  if (!cdnPath(src)) return undefined;
  // Snapped widths can collide (e.g. 480 and 672 both -> 720); list each once
  // with its real width so the browser's srcset choice stays correct.
  const snapped = [...new Set(widths.map(snapWidth))];
  return snapped.map((w) => `${cfImg(src, w, quality)} ${w}w`).join(', ');
}

/**
 * Google profile photos (lh3.googleusercontent.com) take their size from a
 * `=sNN-c` suffix. OAuth hands us `=s96-c`, which for some accounts is a
 * ~180 KB PNG — far too heavy for a 32px avatar. Request the display size
 * (at 2x for retina) instead; any other URL is returned unchanged.
 */
export function sizedAvatar(src: string, displayPx: number): string {
  let host = '';
  try {
    host = new URL(src).hostname;
  } catch {
    return src;
  }
  if (!host.endsWith('googleusercontent.com')) return src;
  const size = `=s${displayPx * 2}-c`;
  return /=s\d+(-c)?$/.test(src) ? src.replace(/=s\d+(-c)?$/, size) : `${src}${size}`;
}
