// Server-side image → WebP conversion for the Cloudflare Workers runtime.
//
// Native `sharp` can't run on Workers, so we use the jsquash WASM codecs. The
// codec `.wasm` files are imported as build-time WebAssembly.Module objects
// (enabled via `wasmModuleImports: true` in astro.config.mjs) and handed to each
// codec's `init()` once per isolate — jsquash then instantiates them
// synchronously instead of trying to fetch the wasm at runtime (which Workers
// forbid).
//
// Policy (confirmed near-lossless):
//   - JPEG  → WebP quality 90  (visually identical, big size win)
//   - PNG   → WebP lossless    (pixel-perfect — keeps text/screenshots crisp)
//   - WebP / GIF / SVG / anything else → passthrough, never re-encoded
//     (GIF animation + SVG vectors must be preserved).
// Dimensions are never changed.

import decodeJpeg, { init as initJpeg } from '@jsquash/jpeg/decode';
import decodePng, { init as initPng } from '@jsquash/png/decode';
import encodeWebp, { init as initWebp } from '@jsquash/webp/encode';

// Build-time WebAssembly.Module imports. Workers support wasm SIMD, so
// `wasm-feature-detect`'s simd() returns true inside @jsquash/webp/encode and it
// loads the SIMD glue — therefore we must pass the *SIMD* webp encoder wasm.
// @ts-ignore - .wasm imports are provided by the cloudflare adapter
import JPEG_DEC_WASM from '@jsquash/jpeg/codec/dec/mozjpeg_dec.wasm';
// @ts-ignore
import PNG_DEC_WASM from '@jsquash/png/codec/pkg/squoosh_png_bg.wasm';
// @ts-ignore
import WEBP_ENC_WASM from '@jsquash/webp/codec/enc/webp_enc_simd.wasm';

const JPEG_QUALITY = 90;

let jpegReady: Promise<unknown> | null = null;
let pngReady: Promise<unknown> | null = null;
let webpReady: Promise<unknown> | null = null;

function ensureJpeg() {
  if (!jpegReady) jpegReady = Promise.resolve(initJpeg(JPEG_DEC_WASM));
  return jpegReady;
}
function ensurePng() {
  if (!pngReady) pngReady = Promise.resolve(initPng(PNG_DEC_WASM));
  return pngReady;
}
function ensureWebp() {
  if (!webpReady) webpReady = Promise.resolve(initWebp(WEBP_ENC_WASM));
  return webpReady;
}

export type ConversionResult =
  | { converted: true; bytes: Uint8Array; contentType: 'image/webp' }
  | { converted: false };

// Returns WebP bytes for JPEG/PNG input, or { converted: false } for formats we
// deliberately leave untouched (webp/gif/svg) or on any decode/encode failure.
// Callers must treat a non-conversion as "store the original" — image conversion
// should never break an upload.
export async function convertToWebp(
  input: ArrayBuffer,
  mimeType: string,
): Promise<ConversionResult> {
  const mime = (mimeType || '').toLowerCase();

  // Nothing to gain / must preserve — skip.
  if (
    mime === 'image/webp' ||
    mime === 'image/gif' ||
    mime === 'image/svg+xml' ||
    (mime !== 'image/jpeg' && mime !== 'image/png')
  ) {
    return { converted: false };
  }

  try {
    let imageData;
    if (mime === 'image/jpeg') {
      await ensureJpeg();
      imageData = await decodeJpeg(input);
    } else {
      await ensurePng();
      imageData = await decodePng(input);
    }

    if (!imageData || !imageData.width || !imageData.height) {
      return { converted: false };
    }

    await ensureWebp();
    const webpBuffer = await encodeWebp(
      imageData,
      mime === 'image/png'
        ? { lossless: 1 } // PNG → pixel-perfect
        : { quality: JPEG_QUALITY }, // JPEG → visually lossless
    );

    return {
      converted: true,
      bytes: new Uint8Array(webpBuffer),
      contentType: 'image/webp',
    };
  } catch (err) {
    console.error(`WebP conversion failed for ${mime}:`, err);
    return { converted: false };
  }
}

// Swap an original filename's extension for .webp (e.g. "photo.JPG" → "photo.webp").
export function toWebpFilename(filename: string): string {
  const base = filename.replace(/\.[^./\\]+$/, '');
  return `${base || 'image'}.webp`;
}
