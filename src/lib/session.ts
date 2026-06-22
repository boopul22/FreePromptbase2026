import { generateRandomToken } from './crypto';

export interface SessionUser {
  id: string;
  googleId: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: 'user' | 'admin';
  /** Profile slug used at /author/<username>. Assigned on first login. */
  username: string;
  bio: string;
  twitter: string;
  instagram: string;
  website: string;
}

const SESSION_DURATION_DAYS = 30;

export async function createSession(db: D1Database, userId: string): Promise<string> {
  const token = generateRandomToken(32);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  await db
    .prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(token, userId, expiresAt)
    .run();

  return token;
}

export async function getSession(db: D1Database, token: string): Promise<SessionUser | null> {
  const row = await db
    .prepare(
      `SELECT u.id, u.google_id, u.name, u.email, u.avatar_url, u.role, u.is_banned,
              u.username, u.bio, u.twitter, u.instagram, u.website, s.expires_at
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.id = ?`
    )
    .bind(token)
    .first<{
      id: string;
      google_id: string;
      name: string;
      email: string;
      avatar_url: string;
      role: string;
      is_banned: number;
      username: string | null;
      bio: string | null;
      twitter: string | null;
      instagram: string | null;
      website: string | null;
      expires_at: string;
    }>();

  if (!row) return null;
  if (new Date(row.expires_at) < new Date()) return null;
  if (row.is_banned) return null;

  return {
    id: row.id,
    googleId: row.google_id,
    name: row.name,
    email: row.email,
    avatarUrl: row.avatar_url,
    role: row.role as 'user' | 'admin',
    username: row.username ?? '',
    bio: row.bio ?? '',
    twitter: row.twitter ?? '',
    instagram: row.instagram ?? '',
    website: row.website ?? '',
  };
}

export async function deleteSession(db: D1Database, token: string): Promise<void> {
  await db.prepare('DELETE FROM sessions WHERE id = ?').bind(token).run();
}
