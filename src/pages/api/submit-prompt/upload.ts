export const prerender = false;

import type { APIRoute } from 'astro';
import { getEnv } from '../../../lib/env';
import { getDB } from '../../../lib/db';
import { generateId } from '../../../lib/crypto';
import { logActivity } from '../../../lib/cms';
// @ts-ignore - cloudflare:workers is a Workers-only built-in module
import { env as cfEnv } from 'cloudflare:workers';

// Public image upload — used by /submit. Tighter limits than the admin endpoint:
//   - auth required (middleware gates this path)
//   - 5 MB max, jpeg/png/webp/gif only (no SVG — can carry script)
//   - per-user hourly rate limit (12 uploads/h is enough for 3-image × 4 submissions)
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_SIZE = 5 * 1024 * 1024;
const UPLOAD_RATE_LIMIT_PER_HOUR = 12;

function extFor(mime: string): string {
	if (mime === 'image/jpeg') return 'jpg';
	if (mime === 'image/png') return 'png';
	if (mime === 'image/webp') return 'webp';
	if (mime === 'image/gif') return 'gif';
	return 'bin';
}

function jsonError(error: string, status = 400) {
	return new Response(JSON.stringify({ error }), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});
}

export const POST: APIRoute = async ({ request, locals }) => {
	if (!locals.user) return jsonError('Authentication required', 401);
	if (locals.user.role !== 'admin' /* admins get the dedicated CMS endpoint */) {
		// Still allow admins through, just continue.
	}

	const db = getDB(locals);
	const env = getEnv(locals);

	// Rate limit: count uploads this user has done in the last hour via activity_log.
	try {
		const row = await db
			.prepare(
				`SELECT COUNT(*) AS n FROM activity_log
				 WHERE user_id = ? AND action = 'submit_upload'
				   AND created_at > datetime('now','-1 hour')`,
			)
			.bind(locals.user.id)
			.first<{ n: number }>();
		if ((row?.n ?? 0) >= UPLOAD_RATE_LIMIT_PER_HOUR) {
			return jsonError('Too many uploads in the last hour. Please try again later.', 429);
		}
	} catch {
		// Non-fatal — if the count query fails we still allow the upload.
	}

	let formData: FormData;
	try {
		formData = await request.formData();
	} catch {
		return jsonError('Invalid form data');
	}

	const file = formData.get('file');
	if (!file || !(file instanceof File)) return jsonError('No file provided');

	if (!ALLOWED_TYPES.has(file.type)) {
		return jsonError(`Unsupported file type: ${file.type || 'unknown'}. Use JPG, PNG, WEBP or GIF.`);
	}
	if (file.size > MAX_SIZE) {
		return jsonError('Image too large. Maximum 5 MB per file.');
	}
	if (file.size === 0) {
		return jsonError('Empty file.');
	}

	const id = generateId(16);
	const ext = extFor(file.type);
	const key = `submissions/${locals.user.id}/${id}.${ext}`;
	const body = await file.arrayBuffer();

	try {
		await (cfEnv as any).R2.put(key, body, { httpMetadata: { contentType: file.type } });
	} catch (err) {
		console.error('R2 upload failed:', err);
		return jsonError('Upload failed — please try again.', 500);
	}

	const publicUrl = `${env.R2_PUBLIC_URL}/${key}`;

	try {
		await logActivity(db, {
			userId: locals.user.id,
			userName: locals.user.name,
			action: 'submit_upload',
			entityType: 'media',
			entityId: id,
			entityTitle: file.name,
			details: String(file.size),
		});
	} catch {
		// Don't block the upload response on logging.
	}

	return new Response(
		JSON.stringify({ success: true, url: publicUrl, size: file.size, type: file.type }),
		{ status: 201, headers: { 'Content-Type': 'application/json' } },
	);
};
