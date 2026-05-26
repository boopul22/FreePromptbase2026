export const prerender = false;

import type { APIRoute } from 'astro';
import { exchangeCodeForTokens, fetchGoogleUser, getRedirectUri } from '../../../lib/auth';
import { createSession } from '../../../lib/session';
import { generateId } from '../../../lib/crypto';
import { getDB } from '../../../lib/db';
import { getEnv } from '../../../lib/env';

export const GET: APIRoute = async ({ request, url, cookies, redirect, locals }) => {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  // Parse cookies from raw header as fallback
  const rawCookie = request.headers.get('cookie') || '';
  const parseCookie = (name: string) => {
    const match = rawCookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
    return match ? match[1] : undefined;
  };

  const storedState = cookies.get('google_oauth_state')?.value || parseCookie('google_oauth_state');
  const codeVerifier =
    cookies.get('google_oauth_code_verifier')?.value || parseCookie('google_oauth_code_verifier');

  if (!code || !state || !storedState || !codeVerifier || state !== storedState) {
    const missing = [
      !code && 'code',
      !state && 'state',
      !storedState && 'storedState(cookie)',
      !codeVerifier && 'codeVerifier(cookie)',
      state && storedState && state !== storedState && 'state-mismatch',
    ]
      .filter(Boolean)
      .join(', ');
    return new Response(`Invalid OAuth state — missing: ${missing}`, { status: 400 });
  }

  try {
    const env = getEnv(locals);
    const db = getDB(locals);
    const redirectUri = getRedirectUri(import.meta.env.DEV);

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(
      code,
      codeVerifier,
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      redirectUri,
    );

    // Fetch user info
    const googleUser = await fetchGoogleUser(tokens.access_token);

    // Check if this is the first user (gets admin role)
    const countResult = await db
      .prepare('SELECT COUNT(*) as count FROM users')
      .first<{ count: number }>();
    const isFirstUser = (countResult?.count ?? 0) === 0;

    // Upsert user
    const userId = generateId();
    await db
      .prepare(
        `INSERT INTO users (id, google_id, email, name, avatar_url, role)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(google_id) DO UPDATE SET
           email = excluded.email,
           name = excluded.name,
           avatar_url = excluded.avatar_url,
           updated_at = datetime('now')`,
      )
      .bind(
        userId,
        googleUser.sub,
        googleUser.email,
        googleUser.name,
        googleUser.picture,
        isFirstUser ? 'admin' : 'user',
      )
      .run();

    // Get actual user ID (might be existing user)
    const user = await db
      .prepare('SELECT id FROM users WHERE google_id = ?')
      .bind(googleUser.sub)
      .first<{ id: string }>();

    if (!user) {
      return new Response('Failed to create user', { status: 500 });
    }

    // Create session
    const sessionToken = await createSession(db, user.id);

    // Set session cookie and clear OAuth cookies
    const isSecure = import.meta.env.PROD;
    const domain = isSecure ? '; Domain=.freepromptbase.com' : '';
    const maxAge = 30 * 24 * 60 * 60; // 30 days
    const sessionFlags = `HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${isSecure ? '; Secure' : ''}${domain}`;
    const clearFlags = `HttpOnly; SameSite=Lax; Path=/; Max-Age=0${isSecure ? '; Secure' : ''}${domain}`;

    // Cache-bust: append timestamp so the browser doesn't serve a stale cached page
    return new Response(null, {
      status: 302,
      headers: [
        ['Location', `/?_=${Date.now()}`],
        ['Set-Cookie', `session=${sessionToken}; ${sessionFlags}`],
        ['Set-Cookie', `google_oauth_state=; ${clearFlags}`],
        ['Set-Cookie', `google_oauth_code_verifier=; ${clearFlags}`],
        ['Cache-Control', 'no-store'],
      ],
    });
  } catch (err: any) {
    console.error('OAuth callback error:', err);
    return new Response('Authentication failed: ' + (err.message || 'Unknown error'), {
      status: 500,
    });
  }
};
