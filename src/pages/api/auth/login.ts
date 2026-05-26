export const prerender = false;

import type { APIRoute } from 'astro';
import {
  generateState,
  generateCodeVerifier,
  generateCodeChallenge,
  buildGoogleAuthURL,
  getRedirectUri,
} from '../../../lib/auth';
import { getEnv } from '../../../lib/env';

export const GET: APIRoute = async ({ locals }) => {
  const env = getEnv(locals);
  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  const redirectUri = getRedirectUri(import.meta.env.DEV);
  const url = buildGoogleAuthURL(state, codeChallenge, env.GOOGLE_CLIENT_ID, redirectUri);

  const isSecure = import.meta.env.PROD;
  const domain = isSecure ? '; Domain=.freepromptbase.com' : '';
  const cookieFlags = `HttpOnly; SameSite=Lax; Path=/; Max-Age=600${isSecure ? '; Secure' : ''}${domain}`;

  return new Response(null, {
    status: 302,
    headers: [
      ['Location', url],
      ['Set-Cookie', `google_oauth_state=${state}; ${cookieFlags}`],
      ['Set-Cookie', `google_oauth_code_verifier=${codeVerifier}; ${cookieFlags}`],
    ],
  });
};
