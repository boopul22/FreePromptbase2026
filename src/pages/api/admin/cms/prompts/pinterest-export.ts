export const prerender = false;

import type { APIRoute } from 'astro';
import { getDB } from '../../../../../lib/db';
import { logActivity } from '../../../../../lib/cms';
import { pinterestImageUrl, promptUrl, type PinSource } from '../../../../../lib/pinterestFeed';

// Admin "Export Pinterest CSV" — a DELTA export for Pinterest's Bulk create
// Pins (Business hub → Bulk create Pins → upload spreadsheet).
//
//   GET  → CSV of LIVE prompts not yet exported, then stamps them as exported
//          (one shared batch timestamp) so the next click only emits new ones.
//   POST {action:'reset'} → un-stamps the most recent export batch (safety net
//          if a download failed after the rows were marked).
//
// Both require an admin session (middleware guards /api/admin/*; re-checked here).

const DEFAULT_BOARD = 'AI Prompts';
const TITLE_MAX = 100; // Pinterest hard limit
const DESC_MAX = 500; // Pinterest hard limit

interface ExportRow {
	slug: string;
	title: string;
	description: string;
	tags: string;
	cover_image: string | null;
	images: string | null;
}

// Live = approved AND not scheduled into the future (mirrors the public gate).
const LIVE = "status = 'approved' AND (publish_at IS NULL OR publish_at <= datetime('now'))";

/** RFC-4180 CSV cell: wrap in quotes, double any embedded quotes. */
function csvCell(value: string): string {
	return `"${value.replace(/"/g, '""')}"`;
}

function clip(s: string, max: number): string {
	const t = s.replace(/\s+/g, ' ').trim();
	return t.length <= max ? t : t.slice(0, max - 1).trimEnd() + '…';
}

function toPinSource(r: ExportRow): PinSource {
	let images: string[] = [];
	try {
		const parsed = JSON.parse(r.images || '[]');
		if (Array.isArray(parsed)) images = parsed.filter((s) => typeof s === 'string');
	} catch {
		/* malformed JSON → no carousel images */
	}
	return { slug: r.slug, coverImage: r.cover_image ?? undefined, images };
}

/** Pinterest bulk-upload column order (image pins; Thumbnail left blank). */
const HEADERS = [
	'Title',
	'Media URL',
	'Pinterest board',
	'Thumbnail',
	'Description',
	'Link',
	'Publish date',
	'Keywords',
];

export const GET: APIRoute = async ({ locals, url }) => {
	if (!locals.user || locals.user.role !== 'admin') {
		return new Response('Forbidden', { status: 403 });
	}
	const db = getDB(locals);
	const board = (url.searchParams.get('board') || DEFAULT_BOARD).trim() || DEFAULT_BOARD;

	const { results } = await db
		.prepare(
			`SELECT slug, title, description, tags, cover_image, images
			   FROM prompts
			  WHERE ${LIVE} AND pinterest_exported_at IS NULL
			  ORDER BY date ASC, created_at ASC`,
		)
		.all<ExportRow>();

	// Only prompts with a usable image can become a Pin; skip the rest so the
	// CSV never produces a silently-rejected row. Skipped rows stay un-stamped
	// so they reappear once they get a cover image.
	const exportable = (results || [])
		.map((r) => ({ row: r, image: pinterestImageUrl(toPinSource(r)) }))
		.filter((x): x is { row: ExportRow; image: string } => x.image !== null);

	const lines = [HEADERS.map(csvCell).join(',')];
	for (const { row, image } of exportable) {
		let keywords = '';
		try {
			const tags = JSON.parse(row.tags || '[]');
			if (Array.isArray(tags)) keywords = tags.filter((t) => typeof t === 'string').join(', ');
		} catch {
			/* ignore malformed tags */
		}
		lines.push(
			[
				clip(row.title, TITLE_MAX),
				image,
				board,
				'', // Thumbnail — image pins only
				clip(row.description, DESC_MAX),
				promptUrl({ slug: row.slug }),
				'', // Publish date — blank = publish immediately on upload
				clip(keywords, DESC_MAX),
			]
				.map(csvCell)
				.join(','),
		);
	}

	// Stamp every exported row with ONE shared batch timestamp so POST reset can
	// un-mark exactly this batch. Done after building the CSV; if zero rows are
	// exportable we stamp nothing and return a headers-only CSV.
	let batch = '';
	if (exportable.length > 0) {
		const slugs = exportable.map((x) => x.row.slug);
		const stamped = await db.prepare("SELECT datetime('now') AS now").first<{ now: string }>();
		batch = stamped?.now ?? '';
		const placeholders = slugs.map(() => '?').join(',');
		await db
			.prepare(`UPDATE prompts SET pinterest_exported_at = ? WHERE slug IN (${placeholders})`)
			.bind(batch, ...slugs)
			.run();
		await logActivity(db, {
			userId: locals.user.id,
			userName: locals.user.name,
			action: 'export',
			entityType: 'pinterest',
			entityTitle: `${exportable.length} prompts`,
			details: `Pinterest CSV export · board "${board}" · batch ${batch}`,
		});
	}

	const stamp = batch.replace(/[: ]/g, '-') || 'empty';
	return new Response(lines.join('\r\n') + '\r\n', {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename="pinterest-prompts-${stamp}.csv"`,
			'X-Export-Count': String(exportable.length),
			'X-Export-Batch': batch,
			'Cache-Control': 'no-store',
		},
	});
};

export const POST: APIRoute = async ({ locals, request }) => {
	if (!locals.user || locals.user.role !== 'admin') {
		return new Response('Forbidden', { status: 403 });
	}
	const db = getDB(locals);
	let action = '';
	try {
		const body = (await request.json()) as { action?: string };
		action = body.action ?? '';
	} catch {
		/* no body */
	}
	if (action !== 'reset') {
		return new Response(JSON.stringify({ error: 'Unknown action' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	// Un-stamp the most recent batch (all rows sharing MAX(pinterest_exported_at)).
	const latest = await db
		.prepare('SELECT MAX(pinterest_exported_at) AS m FROM prompts WHERE pinterest_exported_at IS NOT NULL')
		.first<{ m: string | null }>();
	const batch = latest?.m ?? null;
	if (!batch) {
		return new Response(JSON.stringify({ reset: 0 }), {
			headers: { 'Content-Type': 'application/json' },
		});
	}
	const res = await db
		.prepare('UPDATE prompts SET pinterest_exported_at = NULL WHERE pinterest_exported_at = ?')
		.bind(batch)
		.run();
	const reset = res.meta?.changes ?? 0;
	await logActivity(db, {
		userId: locals.user.id,
		userName: locals.user.name,
		action: 'export',
		entityType: 'pinterest',
		entityTitle: `${reset} prompts`,
		details: `Reset Pinterest export batch ${batch}`,
	});
	return new Response(JSON.stringify({ reset, batch }), {
		headers: { 'Content-Type': 'application/json' },
	});
};
