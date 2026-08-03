import { generateId } from './crypto';
import { logActivity } from './cms';

export const AGENT_MEDIA_MAX_FILES = 8;
export const MEDIA_MAX_SIZE = 10 * 1024 * 1024;
export const MEDIA_ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
] as const;

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
};

async function sha256Hex(body: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', body);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export interface MediaActor {
  id: string;
  name: string;
}

export interface UploadedMedia {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  deduped: boolean;
}

export async function publishMediaFile(options: {
  db: D1Database;
  bucket: R2Bucket;
  publicBaseUrl: string;
  file: File;
  folder?: string;
  altText?: string;
  actor: MediaActor;
}): Promise<UploadedMedia> {
  const { db, bucket, file, actor } = options;
  if (!MEDIA_ALLOWED_TYPES.includes(file.type as any)) {
    throw new Error(`Unsupported file type: ${file.type || 'unknown'}`);
  }
  if (file.size <= 0 || file.size > MEDIA_MAX_SIZE) {
    throw new Error(`Invalid file size. Maximum is ${MEDIA_MAX_SIZE / 1024 / 1024}MB.`);
  }

  const folder = (options.folder || 'prompts').replace(/[^a-z0-9/_-]/gi, '').replace(/^\/+|\/+$/g, '') || 'prompts';
  const body = await file.arrayBuffer();
  const hash = await sha256Hex(body);
  const ext = EXTENSIONS[file.type] || 'bin';
  const key = `cms/${folder}/${hash}.${ext}`;
  const publicBaseUrl = options.publicBaseUrl.replace(/\/$/, '');
  const publicUrl = `${publicBaseUrl}/${key}`;

  const existing = await db
    .prepare('SELECT id, url, filename, mime_type, size_bytes FROM media WHERE r2_key = ?')
    .bind(key)
    .first<{ id: string; url: string; filename: string; mime_type: string; size_bytes: number }>();
  if (existing) {
    return {
      id: existing.id,
      url: existing.url,
      filename: existing.filename,
      mimeType: existing.mime_type,
      sizeBytes: existing.size_bytes,
      deduped: true,
    };
  }

  if (!(await bucket.head(key))) {
    await bucket.put(key, body, { httpMetadata: { contentType: file.type } });
  }

  const id = generateId();
  await db
    .prepare(
      'INSERT INTO media (id, r2_key, url, filename, alt_text, size_bytes, mime_type, folder, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    )
    .bind(id, key, publicUrl, file.name, options.altText || '', file.size, file.type, folder, actor.id)
    .run();

  await logActivity(db, {
    userId: actor.id,
    userName: actor.name,
    action: 'upload_media',
    entityType: 'media',
    entityId: id,
    entityTitle: file.name,
    details: 'agent-api',
  });

  return { id, url: publicUrl, filename: file.name, mimeType: file.type, sizeBytes: file.size, deduped: false };
}
