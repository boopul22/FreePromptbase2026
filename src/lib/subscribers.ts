// Newsletter subscribers — double opt-in, powered by Cloudflare Email Service.
//
// Flow:
//   1. Footer form POSTs an email to /api/subscribe.
//   2. We insert a `pending` row with a single-use confirm_token + a long-lived
//      unsubscribe_token, then send a confirmation email (transactional) via the
//      Cloudflare Email Sending binding (env.EMAIL).
//   3. Clicking the link hits /api/subscribe/confirm, which flips the row to
//      `confirmed` and sends a welcome email.
//   4. Any email footer links to /api/subscribe/unsubscribe, which flips the row
//      to `unsubscribed` (kept for suppression + audit, never deleted).
//
// The `subscribers` table is defined in db/schema.sql (migration 0006). Sending
// only ever emails ONE person per action (the subscriber) — this is transactional
// email, which is what Cloudflare Email Service is designed for, not bulk sends.

// @ts-ignore - cloudflare:workers is a Workers-only built-in module
import { env } from 'cloudflare:workers';

// Minimal shape of the Cloudflare Email Sending binding (env.EMAIL.send()).
// `npx wrangler types` generates the full `SendEmail` type; we type it loosely
// here so the lib compiles without the generated worker-configuration.d.ts.
interface EmailBinding {
	send(message: {
		to: string | string[];
		from: { email: string; name?: string };
		replyTo?: string;
		subject: string;
		html: string;
		text: string;
		headers?: Record<string, string>;
	}): Promise<{ messageId?: string }>;
}

interface Env {
	DB: D1Database;
	EMAIL?: EmailBinding;
	EMAIL_FROM?: string;
	EMAIL_FROM_NAME?: string;
	EMAIL_REPLY_TO?: string;
	SITE_URL?: string;
}

function getConfig() {
	const e = env as unknown as Env;
	return {
		db: e.DB,
		email: e.EMAIL,
		from: e.EMAIL_FROM || 'updates@freepromptbase.com',
		fromName: e.EMAIL_FROM_NAME || 'Free Prompt Base',
		replyTo: e.EMAIL_REPLY_TO || undefined,
		siteUrl: (e.SITE_URL || 'https://freepromptbase.com').replace(/\/$/, ''),
	};
}

export function isValidEmail(email: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// URL-safe random token (192 bits of entropy, hex-encoded).
function randomToken(): string {
	const bytes = new Uint8Array(24);
	crypto.getRandomValues(bytes);
	return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export type SubscribeResult =
	| { ok: true; status: 'pending' | 'already-confirmed' }
	| { ok: false; error: string };

interface SubscriberRow {
	id: string;
	email: string;
	status: 'pending' | 'confirmed' | 'unsubscribed';
	confirm_token: string | null;
	unsubscribe_token: string;
}

/**
 * Insert (or re-arm) a pending subscriber and send the double opt-in email.
 * Idempotent: re-subscribing a pending/unsubscribed address issues a fresh
 * confirm token + email; an already-confirmed address is a friendly no-op.
 */
export async function subscribe(
	rawEmail: string,
	meta: { ip?: string; userAgent?: string } = {},
): Promise<SubscribeResult> {
	const { db } = getConfig();
	const email = rawEmail.trim().toLowerCase();
	if (!isValidEmail(email)) return { ok: false, error: 'Please enter a valid email address.' };

	const existing = await db
		.prepare('SELECT id, email, status, confirm_token, unsubscribe_token FROM subscribers WHERE email = ?')
		.bind(email)
		.first<SubscriberRow>();

	if (existing?.status === 'confirmed') {
		return { ok: true, status: 'already-confirmed' };
	}

	const confirmToken = randomToken();
	let unsubscribeToken = existing?.unsubscribe_token ?? randomToken();

	if (existing) {
		// Re-arm a pending / previously-unsubscribed row with a fresh confirm token.
		await db
			.prepare(
				`UPDATE subscribers
				 SET status = 'pending', confirm_token = ?, ip = ?, user_agent = ?
				 WHERE id = ?`,
			)
			.bind(confirmToken, meta.ip ?? null, meta.userAgent ?? null, existing.id)
			.run();
	} else {
		unsubscribeToken = randomToken();
		await db
			.prepare(
				`INSERT INTO subscribers (id, email, status, confirm_token, unsubscribe_token, ip, user_agent)
				 VALUES (?, ?, 'pending', ?, ?, ?, ?)`,
			)
			.bind(crypto.randomUUID(), email, confirmToken, unsubscribeToken, meta.ip ?? null, meta.userAgent ?? null)
			.run();
	}

	await sendConfirmationEmail(email, confirmToken, unsubscribeToken);
	return { ok: true, status: 'pending' };
}

/** Confirm a pending subscriber by their single-use token. */
export async function confirm(token: string): Promise<{ ok: boolean; alreadyConfirmed?: boolean }> {
	const { db } = getConfig();
	if (!token || !/^[a-f0-9]{48}$/.test(token)) return { ok: false };

	const row = await db
		.prepare('SELECT id, email, status, confirm_token, unsubscribe_token FROM subscribers WHERE confirm_token = ?')
		.bind(token)
		.first<SubscriberRow>();

	// Token cleared once confirmed, so a valid-but-already-confirmed link won't
	// match. Treat a missing row as "already handled" rather than a hard error.
	if (!row) return { ok: true, alreadyConfirmed: true };

	await db
		.prepare(
			`UPDATE subscribers
			 SET status = 'confirmed', confirm_token = NULL, confirmed_at = datetime('now')
			 WHERE id = ?`,
		)
		.bind(row.id)
		.run();

	await sendWelcomeEmail(row.email, row.unsubscribe_token);
	return { ok: true };
}

/** Unsubscribe by long-lived token. Kept for suppression + audit. */
export async function unsubscribe(token: string): Promise<{ ok: boolean; email?: string }> {
	const { db } = getConfig();
	if (!token || !/^[a-f0-9]{48}$/.test(token)) return { ok: false };

	const row = await db
		.prepare('SELECT id, email FROM subscribers WHERE unsubscribe_token = ?')
		.bind(token)
		.first<{ id: string; email: string }>();
	if (!row) return { ok: false };

	await db
		.prepare(
			`UPDATE subscribers
			 SET status = 'unsubscribed', confirm_token = NULL, unsubscribed_at = datetime('now')
			 WHERE id = ?`,
		)
		.bind(row.id)
		.run();

	return { ok: true, email: row.email };
}

// --- Email templates ------------------------------------------------------

function shell(bodyHtml: string, unsubscribeUrl?: string): string {
	const foot = unsubscribeUrl
		? `<tr><td style="padding:24px 32px;border-top:1px solid #eee;color:#888;font-size:12px;line-height:1.6;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
			You're receiving this because you signed up at freepromptbase.com.
			<a href="${unsubscribeUrl}" style="color:#888;">Unsubscribe</a>.
		   </td></tr>`
		: '';
	return `<!doctype html><html><body style="margin:0;background:#f5f4f0;padding:24px;">
	<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #eee;">
		<tr><td style="padding:32px 32px 8px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
			<span style="font-size:15px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#111;">Free Prompt Base</span>
		</td></tr>
		<tr><td style="padding:8px 32px 32px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#333;font-size:15px;line-height:1.65;">
			${bodyHtml}
		</td></tr>
		${foot}
	</table></body></html>`;
}

async function sendConfirmationEmail(email: string, confirmToken: string, unsubToken: string): Promise<void> {
	const { email: EMAIL, from, fromName, replyTo, siteUrl } = getConfig();
	if (!EMAIL) {
		// Binding not configured (e.g. domain not onboarded yet). Don't crash the
		// signup — the row is already saved; surface it in logs instead.
		console.warn('EMAIL binding unavailable — confirmation email not sent to', email);
		return;
	}
	const confirmUrl = `${siteUrl}/api/subscribe/confirm?token=${confirmToken}`;
	const unsubUrl = `${siteUrl}/api/subscribe/unsubscribe?token=${unsubToken}`;

	const button = `<a href="${confirmUrl}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;font-size:14px;">Confirm subscription</a>`;
	const bodyHtml = `
		<p style="margin:0 0 16px;">One quick step — confirm you'd like updates on new AI prompts, guides, and drops:</p>
		<p style="margin:0 0 20px;">${button}</p>
		<p style="margin:0;color:#888;font-size:13px;">If the button doesn't work, paste this link into your browser:<br>
		<a href="${confirmUrl}" style="color:#555;word-break:break-all;">${confirmUrl}</a></p>
		<p style="margin:16px 0 0;color:#aaa;font-size:12px;">If you didn't request this, just ignore this email — you won't be subscribed.</p>`;
	const text = `Confirm your subscription to Free Prompt Base updates:\n${confirmUrl}\n\nIf you didn't request this, ignore this email.`;

	await EMAIL.send({
		to: email,
		from: { email: from, name: fromName },
		replyTo,
		subject: 'Confirm your Free Prompt Base subscription',
		html: shell(bodyHtml, unsubUrl),
		text,
		headers: {
			'List-Unsubscribe': `<${unsubUrl}>`,
			'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
		},
	});
}

async function sendWelcomeEmail(email: string, unsubToken: string): Promise<void> {
	const { email: EMAIL, from, fromName, replyTo, siteUrl } = getConfig();
	if (!EMAIL) return;
	const unsubUrl = `${siteUrl}/api/subscribe/unsubscribe?token=${unsubToken}`;

	const bodyHtml = `
		<p style="margin:0 0 16px;">You're in 🎉 Thanks for subscribing to Free Prompt Base.</p>
		<p style="margin:0 0 16px;">We'll send you the best new AI prompts and guides — copy, paste, create. No spam.</p>
		<p style="margin:0;"><a href="${siteUrl}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;font-size:14px;">Browse prompts</a></p>`;
	const text = `You're subscribed to Free Prompt Base. Browse prompts: ${siteUrl}\n\nUnsubscribe: ${unsubUrl}`;

	await EMAIL.send({
		to: email,
		from: { email: from, name: fromName },
		replyTo,
		subject: "You're subscribed to Free Prompt Base",
		html: shell(bodyHtml, unsubUrl),
		text,
		headers: {
			'List-Unsubscribe': `<${unsubUrl}>`,
			'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
		},
	});
}
