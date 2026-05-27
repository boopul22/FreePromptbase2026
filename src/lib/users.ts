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
  };
}

const USER_COLS = 'id, name, email, avatar_url, role, username, bio, twitter';

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

// Slug shape: 3-32 chars, lowercase ascii alphanum + hyphen, no leading/trailing hyphen.
const USERNAME_RE = /^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])?$/;
const RESERVED = new Set([
  'admin', 'api', 'author', 'submit', 'account', 'login', 'logout', 'saved',
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
}

export interface ProfileUpdateResult {
  ok: true;
  username: string;
  bio: string;
  twitter: string;
}

export interface ProfileUpdateError {
  ok: false;
  error: string;
  field?: 'username' | 'bio' | 'twitter';
}

const BIO_MAX = 280;
const TWITTER_RE = /^[A-Za-z0-9_]{1,15}$/;

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

  const sets: string[] = [];
  const binds: unknown[] = [];
  if (username !== undefined) { sets.push('username = ?'); binds.push(username); }
  if (bio !== undefined) { sets.push('bio = ?'); binds.push(bio); }
  if (twitter !== undefined) { sets.push('twitter = ?'); binds.push(twitter); }
  sets.push("updated_at = datetime('now')");
  binds.push(userId);

  await db
    .prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`)
    .bind(...binds)
    .run();

  const row = await db
    .prepare('SELECT username, bio, twitter FROM users WHERE id = ?')
    .bind(userId)
    .first<{ username: string | null; bio: string | null; twitter: string | null }>();

  return {
    ok: true,
    username: row?.username ?? '',
    bio: row?.bio ?? '',
    twitter: row?.twitter ?? '',
  };
}

export async function isUsernameAvailable(username: string, exceptUserId?: string): Promise<boolean> {
  const err = validateUsername(username);
  if (err) return false;
  return !(await isUsernameTaken(getDB(), username, exceptUserId));
}
