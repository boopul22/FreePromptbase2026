#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { basename, extname, resolve } from 'node:path';

const args = process.argv.slice(2);
const dryRunOnly = args.includes('--dry-run');
const updateExisting = args.includes('--update');
const manifestArg = args.find((arg) => !arg.startsWith('--'));
if (!manifestArg) {
  console.error('Usage: npm run prompt:publish -- <manifest.json> [--dry-run] [--update]');
  process.exit(1);
}

const projectRoot = process.cwd();
const manifestPath = resolve(projectRoot, manifestArg);
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const imagePaths = Array.isArray(manifest.imagePaths) ? manifest.imagePaths : [];
delete manifest.imagePaths;
const coverIndex = Number.isInteger(manifest.coverIndex) ? manifest.coverIndex : 0;
delete manifest.coverIndex;

const baseUrl = (process.env.AGENT_PUBLISH_BASE_URL || 'https://freepromptbase.com').replace(/\/$/, '');
let token = (process.env.AGENT_PUBLISH_TOKEN || '').trim();
if (!token) {
  token = (await readFile(resolve(projectRoot, '.agent-publish-token'), 'utf8')).trim();
}
if (!token) throw new Error('AGENT_PUBLISH_TOKEN is empty.');

// Astro's origin check protects form POSTs. Machine clients explicitly identify
// the same production origin in addition to presenting the bearer credential.
const headers = { Authorization: `Bearer ${token}`, Origin: baseUrl };

async function sendJson(path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: updateExisting ? 'PATCH' : 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${response.status}: ${data.error || response.statusText}`);
  return data;
}

// Validate text, slug, category and author before uploading any bytes.
const initialValidation = await sendJson('/api/agent/cms/prompts?dryRun=1', manifest);
if (dryRunOnly) {
  console.log(JSON.stringify(initialValidation, null, 2));
  process.exit(0);
}

if (imagePaths.length > 0) {
  const form = new FormData();
  form.set('folder', 'prompts');
  for (const path of imagePaths) {
    const absolutePath = resolve(projectRoot, path);
    const bytes = await readFile(absolutePath);
    const ext = extname(absolutePath).toLowerCase();
    const mime = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
    }[ext];
    if (!mime) throw new Error(`Unsupported local image extension: ${ext}`);
    form.append('files', new Blob([bytes], { type: mime }), basename(absolutePath));
  }

  const response = await fetch(`${baseUrl}/api/agent/cms/media`, {
    method: 'POST',
    headers,
    body: form,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${response.status}: ${data.error || response.statusText}`);
  const uploadedUrls = data.uploads.map((item) => item.url);
  manifest.images = [...new Set([...(Array.isArray(manifest.images) ? manifest.images : []), ...uploadedUrls])];
  if (!manifest.coverImage && uploadedUrls.length > 0) {
    manifest.coverImage = uploadedUrls[Math.min(Math.max(coverIndex, 0), uploadedUrls.length - 1)];
  }
}

// A second dry-run checks the final gallery/cover payload after uploads.
const finalValidation = await sendJson('/api/agent/cms/prompts?dryRun=1', manifest);
const published = await sendJson('/api/agent/cms/prompts', manifest);
console.log(JSON.stringify({ validation: finalValidation, published }, null, 2));
