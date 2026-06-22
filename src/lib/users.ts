// User profile module — public author profile data + username/bio/twitter editing.
// Auth + sessions are handled in src/lib/{auth,session}.ts; this is the layer
// the /author, /account, and /submit pages talk to.

import { env } from 'cloudflare:workers';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: 'user' | 'admin';
  username: string;
  bio: string;
  twitter: string;
  instagram: string;
  website: string;
}

interface UserRow {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  role: string;
  username: string | null;
  bio: string | null;
  twitter: string | null;
  instagram: string | null;
  website: string | null;
}

function getDB(): D1Database {
  const db = env.DB;
  if (!db) throw new Error('D1 binding "DB" is not available.');
  return db;
}

function rowToProfile(r: UserRow): UserProfile {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    avatarUrl: r.avatar_url ?? '',
    role: r.role as 'user' | 'admin',
    username: r.username ?? '',
    bio: r.bio ?? '',
    twitter: r.twitter ?? '',
    instagram: r.instagram ?? '',
    website: r.website ?? '',
  };
}

const USER_COLS = 'id, name, email, avatar_url, role, username, bio, twitter, instagram, website';

export async function getUserByUsername(username: string): Promise<UserProfile | null> {
  const row = await getDB()
    .prepare(`SELECT ${USER_COLS} FROM users WHERE username = ? AND is_banned = 0`)
    .bind(username)
    .first<UserRow>();
  return row ? rowToProfile(row) : null;
}

export async function getUserById(id: string): Promise<UserProfile | null> {
  const row = await getDB()
    .prepare(`SELECT ${USER_COLS} FROM users WHERE id = ?`)
    .bind(id)
    .first<UserRow>();
  return row ? rowToProfile(row) : null;
}

export interface TopContributor {
  username: string;
  name: string;
  avatarUrl: string;
  promptCount: number;
}

// The author with the most published prompts — powers the homepage "Top
// contributor" badge. Respects scheduling (only live prompts count) and skips
// banned / username-less accounts. Returns null when no one qualifies.
export async function getTopContributor(): Promise<TopContributor | null> {
  const row = await getDB()
    .prepare(
      `SELECT u.username AS username, u.name AS name, u.avatar_url AS avatar_url,
              COUNT(p.slug) AS prompt_count
       FROM users u
       JOIN prompts p ON (p.submitted_by = u.id OR p.created_by = u.id)
       WHERE p.status = 'approved'
         AND (p.publish_at IS NULL OR p.publish_at <= datetime('now'))
         AND u.username IS NOT NULL
         AND u.is_banned = 0
       GROUP BY u.id
       ORDER BY prompt_count DESC, MAX(COALESCE(p.publish_at, p.created_at)) DESC
       LIMIT 1`,
    )
    .first<{ username: string; name: string; avatar_url: string | null; prompt_count: number }>();
  if (!row || !row.username) return null;
  return {
    username: row.username,
    name: row.name,
    avatarUrl: row.avatar_url ?? '',
    promptCount: Number(row.prompt_count) || 0,
  };
}

// Usernames of users who have at least one approved prompt — used by the
// sitemap so /author/<username> pages get crawled.
export async function getActiveAuthorUsernames(): Promise<string[]> {
  const { results } = await getDB()
    .prepare(
      `SELECT DISTINCT u.username AS username
       FROM users u
       JOIN prompts p ON p.submitted_by = u.id OR p.created_by = u.id
       WHERE p.status = 'approved'
         AND u.username IS NOT NULL
         AND u.is_banned = 0`,
    )
    .all<{ username: string }>();
  return (results ?? []).map((r) => r.username).filter(Boolean);
}

// Slug shape: 3-32 chars, lowercase ascii alphanum + hyphen, no leading/trailing hyphen.
const USERNAME_RE = /^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])?$/;
const RESERVED = new Set([
  'admin', 'api', 'author', 'submit', 'account', 'login', 'logout', 'saved', 'liked',
  'about', 'privacy', 'terms', 'blog', 'category', 'categories', 'p', 'sitemap',
  'robots', 'feed', 'rss', 'auth', 'cms', 'dashboard', 'static', 'public',
]);

export function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
}

export function validateUsername(username: string): string | null {
  if (!USERNAME_RE.test(username)) {
    return 'Username must be 3-32 chars, lowercase letters, numbers and hyphens only.';
  }
  if (RESERVED.has(username)) return 'That username is reserved.';
  return null;
}

async function isUsernameTaken(db: D1Database, username: string, exceptUserId?: string): Promise<boolean> {
  const row = await db
    .prepare('SELECT id FROM users WHERE username = ? AND id != ?')
    .bind(username, exceptUserId ?? '')
    .first<{ id: string }>();
  return !!row;
}

// Generate a unique username from a display name. Called from the OAuth callback
// for users who don't have one yet. Suffix collisions with -2, -3, ...
export async function ensureUsername(db: D1Database, userId: string, displayName: string): Promise<string> {
  const existing = await db
    .prepare('SELECT username FROM users WHERE id = ?')
    .bind(userId)
    .first<{ username: string | null }>();
  if (existing?.username) return existing.username;

  let base = slugifyName(displayName);
  if (base.length < 3) base = `user-${userId.slice(0, 6).toLowerCase()}`;
  if (RESERVED.has(base)) base = `${base}-user`;

  let candidate = base;
  let suffix = 2;
  while (await isUsernameTaken(db, candidate, userId)) {
    candidate = `${base}-${suffix}`;
    suffix++;
    if (suffix > 9999) throw new Error('Could not allocate a unique username.');
  }

  await db
    .prepare('UPDATE users SET username = ?, updated_at = datetime(\'now\') WHERE id = ?')
    .bind(candidate, userId)
    .run();
  return candidate;
}

export interface ProfilePatch {
  username?: string;
  bio?: string;
  twitter?: string;
  instagram?: string;
  website?: string;
}

export interface ProfileUpdateResult {
  ok: true;
  username: string;
  bio: string;
  twitter: string;
  instagram: string;
  website: string;
}

export interface ProfileUpdateError {
  ok: false;
  error: string;
  field?: 'username' | 'bio' | 'twitter' | 'instagram' | 'website';
}

const BIO_MAX = 280;
const TWITTER_RE = /^[A-Za-z0-9_]{1,15}$/;
const INSTAGRAM_RE = /^[A-Za-z0-9._]{1,30}$/;

// Normalise a user-entered website into a safe absolute http(s) URL, or return
// null when it can't be made into one. Bare domains get https:// prepended.
function normalizeWebsite(raw: string): string | null {
  let value = raw.trim();
  if (!value) return '';
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
  try {
    const u = new URL(value);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    if (!u.hostname.includes('.')) return null;
    return u.toString().slice(0, 200);
  } catch {
    return null;
  }
}

export async function updateUserProfile(
  userId: string,
  patch: ProfilePatch,
): Promise<ProfileUpdateResult | ProfileUpdateError> {
  const db = getDB();

  let username: string | undefined;
  if (patch.username !== undefined) {
    username = patch.username.trim().toLowerCase();
    const err = validateUsername(username);
    if (err) return { ok: false, error: err, field: 'username' };
    if (await isUsernameTaken(db, username, userId)) {
      return { ok: false, error: 'That username is already taken.', field: 'username' };
    }
  }

  let bio: string | undefined;
  if (patch.bio !== undefined) {
    bio = patch.bio.trim().slice(0, BIO_MAX);
  }

  let twitter: string | undefined;
  if (patch.twitter !== undefined) {
    twitter = patch.twitter.trim().replace(/^@/, '');
    if (twitter && !TWITTER_RE.test(twitter)) {
      return { ok: false, error: 'Twitter handle must be 1-15 chars: letters, numbers, underscores. No @ or URL.', field: 'twitter' };
    }
  }

  let instagram: string | undefined;
  if (patch.instagram !== undefined) {
    instagram = patch.instagram.trim().replace(/^@/, '');
    // Accept a full instagram.com URL too — keep just the handle.
    const m = instagram.match(/(?:instagram\.com\/)([A-Za-z0-9._]+)/i);
    if (m) instagram = m[1];
    if (instagram && !INSTAGRAM_RE.test(instagram)) {
      return { ok: false, error: 'Instagram handle must be 1-30 chars: letters, numbers, periods, underscores. No @ or URL.', field: 'instagram' };
    }
  }

  let website: string | undefined;
  if (patch.website !== undefined) {
    const normalized = normalizeWebsite(patch.website);
    if (normalized === null) {
      return { ok: false, error: 'Enter a valid website URL (e.g. https://example.com).', field: 'website' };
    }
    website = normalized;
  }

  const sets: string[] = [];
  const binds: unknown[] = [];
  if (username !== undefined) { sets.push('username = ?'); binds.push(username); }
  if (bio !== undefined) { sets.push('bio = ?'); binds.push(bio); }
  if (twitter !== undefined) { sets.push('twitter = ?'); binds.push(twitter); }
  if (instagram !== undefined) { sets.push('instagram = ?'); binds.push(instagram); }
  if (website !== undefined) { sets.push('website = ?'); binds.push(website); }
  sets.push("updated_at = datetime('now')");
  binds.push(userId);

  await db
    .prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`)
    .bind(...binds)
    .run();

  const row = await db
    .prepare('SELECT username, bio, twitter, instagram, website FROM users WHERE id = ?')
    .bind(userId)
    .first<{ username: string | null; bio: string | null; twitter: string | null; instagram: string | null; website: string | null }>();

  return {
    ok: true,
    username: row?.username ?? '',
    bio: row?.bio ?? '',
    twitter: row?.twitter ?? '',
    instagram: row?.instagram ?? '',
    website: row?.website ?? '',
  };
}

export async function isUsernameAvailable(username: string, exceptUserId?: string): Promise<boolean> {
  const err = validateUsername(username);
  if (err) return false;
  return !(await isUsernameTaken(getDB(), username, exceptUserId));
}
