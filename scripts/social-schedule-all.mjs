import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

const root = resolve(import.meta.dirname, '..');
const startDate = process.argv.find((arg) => arg.startsWith('--start='))?.split('=')[1] || '2026-08-14';
const mode = process.argv.includes('--schedule') ? 'schedule' : 'prepare';
const limit = Number(process.argv.find((arg) => arg.startsWith('--limit='))?.split('=')[1] || 0);
const outDir = resolve(root, 'tmp/instagram/social-batch-2026-08-14');
const statePath = resolve(outDir, 'state.json');
const tokenPath = resolve(root, '.agent-publish-token');

const htmlDecode = (value) => value
	.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
	.replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
	.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
	.replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(Number.parseInt(n, 16)));
const normalize = (value) => String(value || '').replace(/\r\n?/g, '\n').trim();
const escapeXml = (value) => String(value).replace(/[<>&"']/g, (char) => ({
	'<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;',
})[char]);
const graphemes = new Intl.Segmenter('en', { granularity: 'grapheme' });
const richText = (value) => [...graphemes.segment(String(value))].map(({ segment }) =>
	/[\p{Extended_Pictographic}\p{Regional_Indicator}\u20e3]/u.test(segment)
		? `<tspan font-family="Apple Symbols" font-weight="normal">${escapeXml(segment.replaceAll('\ufe0f', ''))}</tspan>`
		: escapeXml(segment)).join('');

function d1(query) {
	const raw = execFileSync('npx', ['wrangler', 'd1', 'execute', 'freepromptbase-com', '--remote', '--json', '--command', query], {
		cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
	});
	return JSON.parse(raw)[0].results;
}

function loadLegacyJobs() {
	const raw = execFileSync('uv', ['run', 'ig-agent', 'list', '--limit', '500'], {
		cwd: resolve(root, 'Instagram Automate'), encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
	});
	return JSON.parse(raw).jobs.filter((job) => job.status === 'published');
}

function unwrapCdn(raw) {
	try {
		const url = new URL(raw);
		const index = url.pathname.indexOf('/cdn/');
		return index < 0 ? null : `${url.origin}${url.pathname.slice(index)}`;
	} catch { return null; }
}

function jpegUrl(raw) {
	const source = new URL(raw);
	const index = source.pathname.indexOf('/cdn/');
	if (source.hostname !== 'freepromptbase.com' || index < 0) throw new Error(`Unsupported source URL: ${raw}`);
	return `https://freepromptbase.com/cdn-cgi/image/width=1120,quality=92,format=jpeg${source.pathname.slice(index)}`;
}

function wrap(text, maxUnits) {
	const lines = [];
	for (const paragraph of normalize(text).split('\n')) {
		if (!paragraph) { lines.push(''); continue; }
		let line = '';
		for (const word of paragraph.split(/\s+/)) {
			const parts = word.length > maxUnits ? word.match(new RegExp(`.{1,${maxUnits}}`, 'g')) : [word];
			for (const part of parts) {
				if (!line) line = part;
				else if (`${line} ${part}`.length <= maxUnits) line += ` ${part}`;
				else { lines.push(line); line = part; }
			}
		}
		if (line) lines.push(line);
	}
	return lines;
}

function fittedPrompt(text) {
	for (let size = 27; size >= 8; size--) {
		const maxUnits = Math.floor(960 / (size * 0.49));
		const lines = wrap(text, maxUnits);
		const lineHeight = Math.ceil(size * 1.18);
		if (lines.length * lineHeight <= 920) return { size, lineHeight, lines };
	}
	throw new Error('Prompt cannot fit even at the minimum font size.');
}

function textLines(lines, x, y, size, lineHeight, color = '#21170f', weight = 500) {
	return lines.map((line, index) => `<text x="${x}" y="${y + index * lineHeight}" font-family="Arial Narrow" font-size="${size}" font-weight="${weight}" fill="${color}">${richText(line)}</text>`).join('');
}

function promptOverlay(prompt) {
	const title = wrap(prompt.title.replace(/\s+[–—-]\s+.*$/, ''), 42).slice(0, 2);
	const body = fittedPrompt(prompt.promptText);
	return Buffer.from(`<svg width="1120" height="1400" xmlns="http://www.w3.org/2000/svg">
		<rect width="1120" height="1400" fill="#160f0acc"/>
		<text x="56" y="72" font-family="Arial Narrow" font-size="21" font-weight="800" letter-spacing="3" fill="#f5c451">COPY + PASTE</text>
		${textLines(title, 56, 128, 38, 44, '#fffaf3', 800)}
		<text x="56" y="${title.length > 1 ? 230 : 186}" font-family="Arial Narrow" font-size="19" font-weight="600" fill="#f0d9b5">Upload your photo → paste into your AI tool</text>
		<rect x="44" y="260" width="1032" height="1010" rx="24" fill="#fff8f0f2" stroke="#f5c45166"/>
		${textLines(body.lines, 76, 300 + body.size, body.size, body.lineHeight)}
		<text x="56" y="1342" font-family="Arial Narrow" font-size="20" font-weight="600" fill="#f8e7c8">Save this slide</text>
		<text x="1064" y="1342" text-anchor="end" font-family="Arial Narrow" font-size="20" font-weight="700" fill="#f5c451">freepromptbase.com</text>
	</svg>`);
}

function websiteOverlay(prompt) {
	const title = wrap(prompt.title.replace(/\s+[–—-]\s+.*$/, ''), 28).slice(0, 3);
	return Buffer.from(`<svg width="1120" height="1400" xmlns="http://www.w3.org/2000/svg">
		<defs><linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#120b0644"/><stop offset=".55" stop-color="#120b06aa"/><stop offset="1" stop-color="#0c0805f5"/></linearGradient></defs>
		<rect width="1120" height="1400" fill="url(#shade)"/>
		<text x="58" y="842" font-family="Arial Narrow" font-size="20" font-weight="800" letter-spacing="3" fill="#f5c451">FREE PROMPT BASE</text>
		${textLines(title, 58, 920, 58, 66, '#fffaf3', 800)}
		<text x="58" y="${950 + title.length * 66}" font-family="Arial Narrow" font-size="30" font-weight="700" fill="#f5c451">Copy. Paste. Create.</text>
		<text x="58" y="${1004 + title.length * 66}" font-family="Arial Narrow" font-size="25" font-weight="500" fill="#f3e6d4">Your next AI photo starts with a better prompt.</text>
		<rect x="58" y="${1045 + title.length * 66}" width="340" height="70" rx="35" fill="#f5c451"/>
		<text x="228" y="${1090 + title.length * 66}" text-anchor="middle" font-family="Arial Narrow" font-size="22" font-weight="800" fill="#1a120a">EXPLORE FREE PROMPTS</text>
		<text x="58" y="1328" font-family="Arial Narrow" font-size="24" font-weight="700" fill="#ffe8c2">freepromptbase.com</text>
	</svg>`);
}

async function renderSlides(prompt, images) {
	const dir = resolve(outDir, prompt.slug);
	await mkdir(dir, { recursive: true });
	const backgrounds = await Promise.all([images[1] || images[0], images[2] || images[0]].map(async (url) => {
		const response = await fetch(url);
		if (!response.ok) throw new Error(`${url}: ${response.status}`);
		return Buffer.from(await response.arrayBuffer());
	}));
	const promptBase = await sharp(backgrounds[0]).resize(1120, 1400, { fit: 'cover' }).blur(12).modulate({ brightness: 0.55, saturation: 0.8 }).png().toBuffer();
	const websiteBase = await sharp(backgrounds[1]).resize(1120, 1400, { fit: 'cover' }).png().toBuffer();
	const fullPng = await sharp(promptBase).composite([{ input: promptOverlay(prompt) }]).png().toBuffer();
	const websitePng = await sharp(websiteBase).composite([{ input: websiteOverlay(prompt) }]).png().toBuffer();
	await Promise.all([
		writeFile(resolve(dir, 'full-prompt.png'), fullPng),
		writeFile(resolve(dir, 'website-promo.png'), websitePng),
		sharp(fullPng).jpeg({ quality: 92 }).toFile(resolve(dir, 'full-prompt.jpg')),
		sharp(websitePng).jpeg({ quality: 92 }).toFile(resolve(dir, 'website-promo.jpg')),
	]);
	return { dir, fullPrompt: resolve(dir, 'full-prompt.jpg'), website: resolve(dir, 'website-promo.jpg') };
}

function captions(prompt, slideNumber) {
	const tags = prompt.tags.filter(Boolean);
	const tool = /gemini|nano banana/i.test(`${prompt.title} ${prompt.promptText}`) ? 'Gemini' : /chatgpt/i.test(`${prompt.title} ${prompt.promptText}`) ? 'ChatGPT' : 'your AI image tool';
	const keyword = /nano banana/i.test(`${prompt.title} ${tags.join(' ')}`) ? 'nano banana prompt' : /gemini/i.test(`${prompt.title} ${tags.join(' ')}`) ? 'gemini ai photo prompt copy paste' : 'free AI prompts';
	const hashtags = [...new Set(tags.slice(0, 4).map((tag) => `#${tag.replace(/[^a-z0-9]/gi, '')}`)), '#AIPrompts', '#FreePromptBase'].filter((tag) => tag.length > 1).slice(0, 7);
	const subject = prompt.title.replace(/\s+[–—-]\s+.*$/, '').replace(/\s+Prompt$/i, '');
	const canonical = `https://freepromptbase.com/${prompt.slug}`;
	return {
		instagram: `${subject} ✨\n\nSwipe through the results, then save slide ${slideNumber} for the complete copy-paste prompt.\n\nUpload your photo, paste the prompt into ${tool}, and create your version.\n\nFind this prompt and more free prompts at freepromptbase.com\nCopy. Paste. Create.\n\n${hashtags.join(' ')}`,
		facebook: `${subject}: a ${keyword} with example results and the complete copy-paste prompt.\n\nOpen the prompt, upload your photo, paste it into ${tool}, and create your version:\n${canonical}\n\nCopy. Paste. Create.\n\n${hashtags.slice(0, 5).join(' ')}`,
	};
}

async function verifyPage(prompt, images) {
	const canonical = `https://freepromptbase.com/${prompt.slug}`;
	const response = await fetch(canonical);
	if (!response.ok || response.url.replace(/\/$/, '') !== canonical) throw new Error(`${prompt.slug}: canonical page failed (${response.status})`);
	const html = await response.text();
	const copy = html.match(/<pre[^>]*data-copy-text[^>]*>([\s\S]*?)<\/pre>/i)?.[1];
	if (!copy || normalize(htmlDecode(copy.replace(/<[^>]+>/g, ''))) !== normalize(prompt.promptText)) throw new Error(`${prompt.slug}: live prompt differs from D1`);
	const creative = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
		.map((match) => { try { return JSON.parse(match[1]); } catch { return null; } })
		.find((item) => item?.['@type'] === 'CreativeWork');
	const liveImages = (Array.isArray(creative?.image) ? creative.image : []).map((item) => typeof item === 'string' ? item : item?.url).filter(Boolean);
	if (JSON.stringify(liveImages) !== JSON.stringify(images)) throw new Error(`${prompt.slug}: live gallery differs from D1`);
}

async function mapLimit(items, concurrency, fn) {
	const results = new Array(items.length);
	let cursor = 0;
	await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
		while (cursor < items.length) { const index = cursor++; results[index] = await fn(items[index], index); }
	}));
	return results;
}

async function makeContactSheets(campaigns) {
	for (let offset = 0; offset < campaigns.length; offset += 8) {
		const group = campaigns.slice(offset, offset + 8);
		const rows = await Promise.all(group.map(async (campaign) => {
			const items = [...campaign.images.map(jpegUrl), campaign.slides.fullPrompt, campaign.slides.website].slice(0, 9);
			const thumbs = await Promise.all(items.map(async (source) => {
				const input = source.startsWith('http') ? Buffer.from(await (await fetch(source)).arrayBuffer()) : source;
				return sharp(input).resize(118, 148, { fit: 'cover' }).jpeg().toBuffer();
			}));
			const canvas = sharp({ create: { width: 1120, height: 178, channels: 3, background: '#1b1612' } });
			return canvas.composite(thumbs.map((input, index) => ({ input, left: 12 + index * 122, top: 24 }))).jpeg({ quality: 88 }).toBuffer();
		}));
		await sharp({ create: { width: 1120, height: rows.length * 178, channels: 3, background: '#1b1612' } })
			.composite(rows.map((input, index) => ({ input, left: 0, top: index * 178 })))
			.jpeg({ quality: 88 }).toFile(resolve(outDir, `contact-${String(offset / 8 + 1).padStart(2, '0')}.jpg`));
	}
}

async function prepare() {
	await mkdir(outDir, { recursive: true });
	const rows = d1("SELECT slug,title,description,prompt_text,tags,how_to_use,cover_image,images,created_at FROM prompts WHERE status='approved' ORDER BY datetime(created_at) DESC;");
	const prompts = rows.map((row) => ({ ...row, promptText: row.prompt_text, tags: JSON.parse(row.tags || '[]'), images: JSON.parse(row.images) }));
	const imageOwner = new Map(prompts.flatMap((prompt) => prompt.images.map((url) => [url, prompt.slug])));
	const legacyJobs = loadLegacyJobs();
	const legacyOwner = (job) => imageOwner.get(unwrapCdn(job.payload?.media?.[0]?.url)) || prompts.find((prompt) => job.idempotency_key.includes(prompt.slug))?.slug;
	const posted = new Set(legacyJobs.map(legacyOwner).filter(Boolean));
	const unmatchedLegacy = legacyJobs.filter((job) => unwrapCdn(job.payload?.media?.[0]?.url) && !legacyOwner(job)).map((job) => job.idempotency_key);
	let remaining = prompts.filter((prompt) => !posted.has(prompt.slug));
	if (limit > 0) remaining = remaining.slice(0, limit);
	console.log(JSON.stringify({ approved: prompts.length, alreadyPosted: posted.size, unmatchedLegacy, checking: remaining.length }, null, 2));
	const checked = await mapLimit(remaining, 8, async (prompt) => {
		try { await verifyPage(prompt, prompt.images); return { prompt }; }
		catch (error) { return { prompt, error: error instanceof Error ? error.message : String(error) }; }
	});
	const skippedInvalid = checked.filter((item) => item.error).map((item) => ({ slug: item.prompt.slug, error: item.error }));
	remaining = checked.filter((item) => !item.error).map((item) => item.prompt);
	console.log(JSON.stringify({ liveVerified: remaining.length, skippedInvalid }, null, 2));

	const campaigns = await mapLimit(remaining, 1, async (prompt, index) => {
		console.log(`render ${index + 1}/${remaining.length}: ${prompt.slug}`);
		const slides = await renderSlides(prompt, prompt.images);
		const day = Math.floor(index / 2);
		const slot = index % 2;
		const date = new Date(`${startDate}T${slot === 0 ? '05:30' : '13:30'}:00Z`);
		date.setUTCDate(date.getUTCDate() + day);
		const copy = captions(prompt, prompt.images.length + 1);
		if ((index + 1) % 10 === 0) console.log(`prepared ${index + 1}/${remaining.length}`);
		return { slug: prompt.slug, title: prompt.title, promptChars: prompt.promptText.length, images: prompt.images, slides, scheduledAt: date.toISOString(), captions: copy };
	});
	await makeContactSheets(campaigns);
	await writeFile(statePath, `${JSON.stringify({ createdAt: new Date().toISOString(), startDate, posted: [...posted], unmatchedLegacy, skippedInvalid, campaigns }, null, 2)}\n`);
	console.log(JSON.stringify({ ok: true, statePath, campaigns: campaigns.length, contactSheets: Math.ceil(campaigns.length / 8) }, null, 2));
}

async function uploadPair(campaign, token) {
	const form = new FormData();
	form.set('folder', `instagram/${campaign.slug}`);
	for (const [path, name] of [[campaign.slides.fullPrompt, 'full-prompt.jpg'], [campaign.slides.website, 'website-promo.jpg']]) {
		form.append('files', new Blob([await readFile(path)], { type: 'image/jpeg' }), name);
	}
	const response = await fetch('https://freepromptbase.com/api/agent/cms/media', { method: 'POST', headers: { Authorization: `Bearer ${token}`, Origin: 'https://freepromptbase.com' }, body: form });
	const body = await response.json();
	if (!response.ok || !body.success || body.uploads?.length !== 2) throw new Error(`${campaign.slug}: media upload failed (${response.status}: ${body.error || 'unknown'})`);
	return body.uploads.map((upload) => upload.url);
}

async function schedule() {
	const state = JSON.parse(await readFile(statePath, 'utf8'));
	const token = (await readFile(tokenPath, 'utf8')).toString().trim();
	if (!token) throw new Error('Empty .agent-publish-token');
	for (let index = 0; index < state.campaigns.length; index++) {
		const campaign = state.campaigns[index];
		if (campaign.campaignId) continue;
		campaign.uploads ||= await uploadPair(campaign, token);
		await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`);
		const media = [
			...campaign.images.map((url, imageIndex) => ({ url: jpegUrl(url), role: imageIndex === 0 ? 'cover' : `gallery-${imageIndex + 1}`, altText: `${campaign.title} — generated ${imageIndex === 0 ? 'cover' : `example ${imageIndex + 1}`} image.` })),
			{ url: campaign.uploads[0], role: 'full-prompt', altText: `Full copy-paste prompt for ${campaign.title} displayed over a darkened source image.` },
			{ url: campaign.uploads[1], role: 'website-promo', altText: `Free Prompt Base promotion for ${campaign.title} with the words Copy. Paste. Create.` },
		];
		const body = { idempotencyKey: `fpb-social-${campaign.slug}-${campaign.scheduledAt.slice(0, 10).replaceAll('-', '')}-v1`, canonicalUrl: `https://freepromptbase.com/${campaign.slug}`, scheduledAt: campaign.scheduledAt, media, instagram: { caption: campaign.captions.instagram }, facebook: { message: campaign.captions.facebook } };
		const response = await fetch('https://freepromptbase.com/api/agent/cms/social-campaigns', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
		const result = await response.json();
		if (!response.ok || !result.campaign?.id) throw new Error(`${campaign.slug}: campaign failed (${response.status}: ${result.error || 'unknown'})`);
		campaign.campaignId = result.campaign.id;
		campaign.created = result.created;
		await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`);
		console.log(`scheduled ${index + 1}/${state.campaigns.length}: ${campaign.slug}`);
	}
	console.log(JSON.stringify({ ok: true, scheduled: state.campaigns.filter((campaign) => campaign.campaignId).length }, null, 2));
}

await (mode === 'schedule' ? schedule() : prepare());
