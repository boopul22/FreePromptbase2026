// Client-side image → WebP conversion, run in the browser before upload.
//
// This keeps all conversion off the Cloudflare Worker (which has tight CPU
// limits that make server-side encoding of full-size images unreliable). The
// upload endpoints just store whatever bytes they receive.
//
// Behaviour:
//   - JPEG/PNG (and other raster types) → re-encoded to WebP via <canvas>.
//   - Animated GIF / SVG / already-WebP → returned untouched (canvas would
//     flatten a GIF to one frame and rasterise an SVG; WebP is already done).
//   - EXIF orientation is honoured so phone photos aren't rotated.
//   - "Smaller wins": if the WebP somehow ends up larger than the original
//     (can happen with tiny, already-optimised JPEGs), the original is kept so
//     we never make a file bigger.
//   - Any failure falls back to the original file — conversion never blocks an
//     upload.

const WEBP_QUALITY = 0.92; // visually lossless, big size win

function swapExt(name: string): string {
  const base = name.replace(/\.[^./\\]+$/, '');
  return `${base || 'image'}.webp`;
}

export async function imageToWebp(file: File, quality = WEBP_QUALITY): Promise<File> {
  const type = (file.type || '').toLowerCase();

  // Formats we must not re-encode.
  if (
    type === 'image/webp' ||
    type === 'image/gif' ||
    type === 'image/svg+xml' ||
    !type.startsWith('image/')
  ) {
    return file;
  }

  try {
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      // Older browsers may not accept the options bag.
      bitmap = await createImageBitmap(file);
    }

    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close?.();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close?.();

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/webp', quality),
    );

    // Browser doesn't support WebP encoding, or it came out empty/larger.
    if (!blob || blob.size === 0 || blob.size >= file.size) {
      return file;
    }

    return new File([blob], swapExt(file.name), {
      type: 'image/webp',
      lastModified: file.lastModified,
    });
  } catch {
    return file;
  }
}
