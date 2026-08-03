import { generateSlug, logActivity, toScheduleUtc } from './cms';
import { generateId } from './crypto';
import { invalidatePromptPublish } from './publicCache';

export interface PromptPublishActor {
  id: string;
  name: string;
}

export interface PromptPublishInput {
  title?: unknown;
  slug?: unknown;
  description?: unknown;
  promptText?: unknown;
  category?: unknown;
  tags?: unknown;
  createdBy?: unknown;
  author?: unknown;
  date?: unknown;
  coverImage?: unknown;
  images?: unknown;
  featured?: unknown;
  popularity?: unknown;
  howToUse?: unknown;
  status?: unknown;
  publishAt?: unknown;
  coverW?: unknown;
  coverH?: unknown;
  /** Required for agent API requests that attach gallery images. */
  sampleIdentityPolicy?: unknown;
  /** Required when sampleIdentityPolicy is explicitly-authorized-reference. */
  identityAuthorization?: unknown;
}

export class PromptPublishError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export interface NormalizedPromptPublishInput {
  title: string;
  slug: string;
  description: string;
  promptText: string;
  category: string;
  tags: string[];
  createdBy?: string;
  author?: string;
  date?: string;
  coverImage: string | null;
  images: string[];
  featured: boolean;
  popularity: number;
  howToUse: string | null;
  status: 'draft' | 'approved';
  publishAt: string | null;
  coverW: number | null;
  coverH: number | null;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function optionalNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.round(value) : null;
}

function isTrustedImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'freepromptbase.com' && url.pathname.startsWith('/cdn/');
  } catch {
    return false;
  }
}

export function normalizePromptPublishInput(
  body: PromptPublishInput,
  options: { trustedImagesOnly?: boolean; maxImages?: number; requireIdentityPolicy?: boolean } = {},
): {
  prompt: NormalizedPromptPublishInput;
  warnings: string[];
} {
  const title = text(body.title);
  const promptText = text(body.promptText);
  const category = text(body.category);
  const description = text(body.description);
  if (!title || !promptText || !category) {
    throw new PromptPublishError('Missing required fields: title, promptText, category.');
  }
  if (title.length > 120) throw new PromptPublishError('Title must be 120 characters or fewer.');
  if (description.length > 320) throw new PromptPublishError('Description must be 320 characters or fewer.');

  const requestedStatus = body.status === undefined ? 'approved' : text(body.status);
  if (requestedStatus !== 'draft' && requestedStatus !== 'approved') {
    throw new PromptPublishError("Invalid status. Use 'draft' or 'approved'.");
  }

  const rawTags = Array.isArray(body.tags) ? body.tags : [];
  const tags = [...new Set(rawTags.map(text).filter(Boolean))].slice(0, 12);
  const rawImages = Array.isArray(body.images) ? body.images : [];
  const images = [...new Set(rawImages.map(text).filter(Boolean))];
  if (options.maxImages && images.length > options.maxImages) {
    throw new PromptPublishError(`A prompt can contain at most ${options.maxImages} images.`);
  }
  if (options.trustedImagesOnly && images.some((url) => !isTrustedImageUrl(url))) {
    throw new PromptPublishError('Every image must be a trusted https://freepromptbase.com/cdn/ URL.');
  }
  if (options.requireIdentityPolicy && images.length > 0) {
    const policy = text(body.sampleIdentityPolicy);
    const authorization = text(body.identityAuthorization);
    if (policy !== 'fictional' && policy !== 'explicitly-authorized-reference') {
      throw new PromptPublishError(
        'sampleIdentityPolicy is required for agent gallery images: use “fictional” or “explicitly-authorized-reference”.',
      );
    }
    if (policy === 'explicitly-authorized-reference' && authorization !== 'current-user-request') {
      throw new PromptPublishError(
        'Private identity references require identityAuthorization: “current-user-request”.',
      );
    }
  }

  const suppliedCover = text(body.coverImage);
  if (options.trustedImagesOnly && suppliedCover && !isTrustedImageUrl(suppliedCover)) {
    throw new PromptPublishError('coverImage must be a trusted https://freepromptbase.com/cdn/ URL.');
  }
  const coverImage = suppliedCover || images[0] || null;
  if (options.trustedImagesOnly && coverImage && images.length > 0 && !images.includes(coverImage)) {
    throw new PromptPublishError('coverImage must also appear in images.');
  }

  const rawSlug = text(body.slug) || title;
  const slug = generateSlug(rawSlug) || `prompt-${generateId(8).toLowerCase()}`;
  const publishAt = toScheduleUtc(typeof body.publishAt === 'string' ? body.publishAt : null);
  const date = text(body.date);
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new PromptPublishError('date must use YYYY-MM-DD.');
  }

  const popularity = typeof body.popularity === 'number' && Number.isFinite(body.popularity)
    ? Math.max(0, Math.round(body.popularity))
    : 0;
  const coverW = optionalNumber(body.coverW);
  const coverH = optionalNumber(body.coverH);
  const warnings: string[] = [];
  if (title.length < 45 || title.length > 65) warnings.push('SEO title is strongest at roughly 45–65 characters.');
  if (!/prompt/i.test(title)) warnings.push('SEO title should normally include “Prompt”.');
  if (description.length < 110 || description.length > 170) warnings.push('Description is strongest at roughly 110–170 characters.');
  if (images.length === 0) warnings.push('No gallery images supplied; the public card will use its fallback artwork.');
  if (coverImage && (!coverW || !coverH)) warnings.push('Cover dimensions are missing; provide coverW and coverH to prevent layout shift.');
  if (tags.length < 3) warnings.push('Use at least three specific tags for discovery and related-prompt matching.');

  return {
    prompt: {
      title,
      slug,
      description,
      promptText,
      category,
      tags,
      createdBy: text(body.createdBy) || undefined,
      author: text(body.author) || undefined,
      date: date || undefined,
      coverImage,
      images,
      featured: body.featured === true,
      popularity,
      howToUse: text(body.howToUse) || null,
      status: requestedStatus,
      publishAt,
      coverW,
      coverH,
    },
    warnings,
  };
}

export async function publishPrompt(options: {
  db: D1Database;
  body: PromptPublishInput;
  actor: PromptPublishActor;
  mode: 'admin' | 'agent';
  dryRun?: boolean;
}): Promise<{
  success: true;
  slug: string;
  publicUrl: string;
  status: 'draft' | 'approved';
  publishAt: string | null;
  warnings: string[];
  idempotent: boolean;
  dryRun: boolean;
}> {
  const { prompt, warnings } = normalizePromptPublishInput(options.body, {
    trustedImagesOnly: options.mode === 'agent',
    maxImages: options.mode === 'agent' ? 8 : undefined,
    requireIdentityPolicy: options.mode === 'agent',
  });
  const { db, actor } = options;

  const category = await db
    .prepare('SELECT slug FROM prompt_categories WHERE slug = ?')
    .bind(prompt.category)
    .first<{ slug: string }>();
  if (!category) throw new PromptPublishError(`Unknown prompt category: ${prompt.category}.`);

  let createdById = actor.id;
  let authorName = prompt.author || actor.name;
  if (prompt.createdBy) {
    const user = await db
      .prepare("SELECT id, name FROM users WHERE id = ? AND is_banned = 0")
      .bind(prompt.createdBy)
      .first<{ id: string; name: string }>();
    if (!user) throw new PromptPublishError('Selected author does not exist or is unavailable.');
    createdById = user.id;
    authorName = user.name;
  }

  let slug = prompt.slug;
  const existing = await db
    .prepare(
      `SELECT slug, title, description, prompt_text, category, tags, author,
              cover_image, images, featured, popularity, how_to_use, status,
              publish_at, cover_w, cover_h
       FROM prompts WHERE slug = ?`,
    )
    .bind(slug)
    .first<{
      slug: string;
      title: string;
      description: string;
      prompt_text: string;
      category: string;
      tags: string;
      author: string;
      cover_image: string | null;
      images: string;
      featured: number;
      popularity: number;
      how_to_use: string | null;
      status: string;
      publish_at: string | null;
      cover_w: number | null;
      cover_h: number | null;
    }>();
  if (existing) {
    const samePrompt =
      existing.title === prompt.title &&
      existing.description === prompt.description &&
      existing.prompt_text === prompt.promptText &&
      existing.category === prompt.category &&
      existing.tags === JSON.stringify(prompt.tags) &&
      existing.author === authorName &&
      existing.cover_image === prompt.coverImage &&
      existing.images === JSON.stringify(prompt.images) &&
      existing.featured === (prompt.featured ? 1 : 0) &&
      existing.popularity === prompt.popularity &&
      existing.how_to_use === prompt.howToUse &&
      existing.status === prompt.status &&
      existing.publish_at === prompt.publishAt &&
      existing.cover_w === prompt.coverW &&
      existing.cover_h === prompt.coverH;
    if (options.mode === 'agent' && samePrompt) {
      return {
        success: true,
        slug,
        publicUrl: `https://freepromptbase.com/${slug}`,
        status: existing.status === 'draft' ? 'draft' : 'approved',
        publishAt: existing.publish_at,
        warnings,
        idempotent: true,
        dryRun: !!options.dryRun,
      };
    }
    if (options.mode === 'agent') {
      throw new PromptPublishError(`Slug “${slug}” already belongs to a different prompt.`, 409);
    }
    slug = `${slug}-${generateId(6).toLowerCase()}`;
  }

  const today = new Date().toISOString().slice(0, 10);
  const effectiveDate = prompt.publishAt ? prompt.publishAt.slice(0, 10) : prompt.date || today;
  if (options.dryRun) {
    return {
      success: true,
      slug,
      publicUrl: `https://freepromptbase.com/${slug}`,
      status: prompt.status,
      publishAt: prompt.publishAt,
      warnings,
      idempotent: false,
      dryRun: true,
    };
  }

  await db
    .prepare(
      `INSERT INTO prompts
        (slug, title, description, prompt_text, category, tags, author, date,
         cover_image, images, featured, liked, popularity, how_to_use, created_by, status, publish_at, updated_at, cover_w, cover_h)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?)`,
    )
    .bind(
      slug,
      prompt.title,
      prompt.description,
      prompt.promptText,
      prompt.category,
      JSON.stringify(prompt.tags),
      authorName,
      effectiveDate,
      prompt.coverImage,
      JSON.stringify(prompt.images),
      prompt.featured ? 1 : 0,
      0,
      prompt.popularity,
      prompt.howToUse,
      createdById,
      prompt.status,
      prompt.publishAt,
      prompt.coverW,
      prompt.coverH,
    )
    .run();

  await logActivity(db, {
    userId: actor.id,
    userName: actor.name,
    action: 'create_prompt',
    entityType: 'prompt',
    entityId: slug,
    entityTitle: prompt.title,
    details: [prompt.status === 'draft' ? 'draft' : null, options.mode === 'agent' ? 'agent-api' : null]
      .filter(Boolean)
      .join(', ') || undefined,
  });

  // The public site uses the Workers Cache API for anonymous HTML. Refresh the
  // prompt/listing surfaces in this serving colo immediately after a publish.
  await invalidatePromptPublish(slug, prompt.category);

  return {
    success: true,
    slug,
    publicUrl: `https://freepromptbase.com/${slug}`,
    status: prompt.status,
    publishAt: prompt.publishAt,
    warnings,
    idempotent: false,
    dryRun: false,
  };
}

/**
 * Full-replacement update for trusted agents. Requiring the complete manifest
 * makes the operation deterministic and prevents accidental partial-field
 * drift. Browser/admin partial updates keep using the existing CMS endpoint.
 */
export async function updatePrompt(options: {
  db: D1Database;
  body: PromptPublishInput;
  actor: PromptPublishActor;
  dryRun?: boolean;
}): Promise<{
  success: true;
  slug: string;
  publicUrl: string;
  status: 'draft' | 'approved';
  publishAt: string | null;
  warnings: string[];
  updated: boolean;
  dryRun: boolean;
}> {
  if (!text(options.body.slug)) throw new PromptPublishError('slug is required for an update.');
  const { prompt, warnings } = normalizePromptPublishInput(options.body, {
    trustedImagesOnly: true,
    maxImages: 8,
    requireIdentityPolicy: true,
  });
  const { db, actor } = options;

  const [category, existing] = await Promise.all([
    db.prepare('SELECT slug FROM prompt_categories WHERE slug = ?').bind(prompt.category).first<{ slug: string }>(),
    db.prepare('SELECT slug, date FROM prompts WHERE slug = ?').bind(prompt.slug).first<{ slug: string; date: string }>(),
  ]);
  if (!category) throw new PromptPublishError(`Unknown prompt category: ${prompt.category}.`);
  if (!existing) throw new PromptPublishError(`Prompt “${prompt.slug}” was not found.`, 404);

  let createdById = actor.id;
  let authorName = prompt.author || actor.name;
  if (prompt.createdBy) {
    const user = await db
      .prepare("SELECT id, name FROM users WHERE id = ? AND is_banned = 0")
      .bind(prompt.createdBy)
      .first<{ id: string; name: string }>();
    if (!user) throw new PromptPublishError('Selected author does not exist or is unavailable.');
    createdById = user.id;
    authorName = user.name;
  }

  if (options.dryRun) {
    return {
      success: true,
      slug: prompt.slug,
      publicUrl: `https://freepromptbase.com/${prompt.slug}`,
      status: prompt.status,
      publishAt: prompt.publishAt,
      warnings,
      updated: false,
      dryRun: true,
    };
  }

  const effectiveDate = prompt.publishAt ? prompt.publishAt.slice(0, 10) : prompt.date || existing.date;
  await db
    .prepare(
      `UPDATE prompts SET
        title = ?, description = ?, prompt_text = ?, category = ?, tags = ?,
        author = ?, date = ?, cover_image = ?, images = ?, featured = ?,
        popularity = ?, how_to_use = ?, created_by = ?, status = ?,
        publish_at = ?, updated_at = datetime('now'), cover_w = ?, cover_h = ?
       WHERE slug = ?`,
    )
    .bind(
      prompt.title,
      prompt.description,
      prompt.promptText,
      prompt.category,
      JSON.stringify(prompt.tags),
      authorName,
      effectiveDate,
      prompt.coverImage,
      JSON.stringify(prompt.images),
      prompt.featured ? 1 : 0,
      prompt.popularity,
      prompt.howToUse,
      createdById,
      prompt.status,
      prompt.publishAt,
      prompt.coverW,
      prompt.coverH,
      prompt.slug,
    )
    .run();

  await logActivity(db, {
    userId: actor.id,
    userName: actor.name,
    action: 'update_prompt',
    entityType: 'prompt',
    entityId: prompt.slug,
    entityTitle: prompt.title,
    details: 'agent-api',
  });
  await invalidatePromptPublish(prompt.slug, prompt.category);

  return {
    success: true,
    slug: prompt.slug,
    publicUrl: `https://freepromptbase.com/${prompt.slug}`,
    status: prompt.status,
    publishAt: prompt.publishAt,
    warnings,
    updated: true,
    dryRun: false,
  };
}
