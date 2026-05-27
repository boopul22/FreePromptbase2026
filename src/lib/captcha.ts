// Manual CAPTCHA — small arithmetic challenge with an HMAC-signed token.
// No third-party API. The token encodes the expected answer + an expiry; the
// signature prevents tampering. After verifyCaptcha succeeds, callers MUST
// treat the token as one-time-use; on this single-Worker setup we rely on the
// short expiry + post-success token rotation (the page fetches a fresh
// challenge), which is enough to deter abuse without a shared store.

import { env } from 'cloudflare:workers';

const CHALLENGE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export interface CaptchaChallenge {
	question: string;
	token: string;
}

function getSecret(): string {
	const e = env as unknown as Record<string, string | undefined>;
	const secret = e.AUTH_SECRET;
	if (!secret) {
		throw new Error('AUTH_SECRET is not configured — CAPTCHA cannot sign tokens.');
	}
	return secret;
}

function b64url(input: ArrayBuffer | Uint8Array | string): string {
	let bytes: Uint8Array;
	if (typeof input === 'string') bytes = new TextEncoder().encode(input);
	else if (input instanceof Uint8Array) bytes = input;
	else bytes = new Uint8Array(input);
	let s = '';
	for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
	return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(input: string): string {
	const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
	const b64 = input.replace(/-/g, '+').replace(/_/g, '/') + pad;
	return atob(b64);
}

async function hmacB64Url(payload: string): Promise<string> {
	const key = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(getSecret()),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign'],
	);
	const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
	return b64url(sig);
}

function randInt(min: number, max: number): number {
	const buf = new Uint32Array(1);
	crypto.getRandomValues(buf);
	return min + (buf[0] % (max - min + 1));
}

// Produce a fresh challenge. Mix of +, -, × keeps things readable.
// Negative results are avoided.
export async function issueCaptcha(): Promise<CaptchaChallenge> {
	const op = ['+', '-', '×'][randInt(0, 2)] as '+' | '-' | '×';
	let a: number, b: number, answer: number, question: string;
	switch (op) {
		case '+': {
			a = randInt(1, 9);
			b = randInt(1, 9);
			answer = a + b;
			question = `${a} + ${b}`;
			break;
		}
		case '-': {
			a = randInt(2, 9);
			b = randInt(1, a); // keep the result non-negative
			answer = a - b;
			question = `${a} − ${b}`;
			break;
		}
		case '×': {
			a = randInt(1, 5);
			b = randInt(1, 5);
			answer = a * b;
			question = `${a} × ${b}`;
			break;
		}
	}

	const exp = Date.now() + CHALLENGE_TTL_MS;
	const payload = `${answer}|${exp}`;
	const sig = await hmacB64Url(payload);
	const token = `${b64url(payload)}.${sig}`;
	return { question, token };
}

export type CaptchaError =
	| 'malformed'
	| 'expired'
	| 'bad-signature'
	| 'wrong-answer';

export async function verifyCaptcha(
	token: string | undefined | null,
	rawAnswer: string | undefined | null,
): Promise<{ ok: true } | { ok: false; error: CaptchaError }> {
	if (!token || typeof token !== 'string') return { ok: false, error: 'malformed' };
	if (rawAnswer === undefined || rawAnswer === null) return { ok: false, error: 'wrong-answer' };

	const parts = token.split('.');
	if (parts.length !== 2) return { ok: false, error: 'malformed' };
	const [payloadB64, sig] = parts;

	let payload: string;
	try {
		payload = b64urlDecode(payloadB64);
	} catch {
		return { ok: false, error: 'malformed' };
	}

	const expectedSig = await hmacB64Url(payload);
	// Constant-time-ish: same length, compare every char.
	if (expectedSig.length !== sig.length) return { ok: false, error: 'bad-signature' };
	let diff = 0;
	for (let i = 0; i < expectedSig.length; i++) diff |= expectedSig.charCodeAt(i) ^ sig.charCodeAt(i);
	if (diff !== 0) return { ok: false, error: 'bad-signature' };

	const [answerStr, expStr] = payload.split('|');
	const exp = parseInt(expStr, 10);
	if (!Number.isFinite(exp) || Date.now() > exp) return { ok: false, error: 'expired' };

	const expected = parseInt(answerStr, 10);
	const got = parseInt(String(rawAnswer).trim(), 10);
	if (!Number.isFinite(got) || got !== expected) return { ok: false, error: 'wrong-answer' };

	return { ok: true };
}

export function captchaErrorMessage(err: CaptchaError): string {
	switch (err) {
		case 'expired': return 'Captcha expired — please try the new one.';
		case 'wrong-answer': return 'Captcha answer is incorrect.';
		case 'bad-signature':
		case 'malformed':
		default: return 'Captcha token is invalid — please reload the page.';
	}
}
