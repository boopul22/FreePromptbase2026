# Instagram Prompt Carousel Publishing Guide

Last updated: 2026-08-05

Use this guide when a user asks to publish a Free Prompt Base prompt URL to
Instagram. It converts the prompt page's gallery into an Instagram carousel,
adds two branded slides, publishes through the local Instagram Automator, and
verifies the live post.

The normal user request can be as short as:

```text
Post this prompt on Instagram: https://freepromptbase.com/<prompt-slug>
```

A direct request to **post** or **publish** authorizes immediate Instagram
publishing to the configured Free Prompt Base account. A request to **prepare**,
**draft**, or **show a preview** does not authorize publishing. Scheduling is
used only when the user supplies a date or time.

Within a task whose established purpose is publishing these Instagram
carousels, a bare Free Prompt Base prompt URL is enough to select the next prompt
and run this standard workflow. Outside that established context, a bare URL is
not by itself authorization for an external post; ask whether the user wants it
published.

When authorization and all checks are healthy, run the complete workflow
autonomously: extract → validate → create two slides → upload → publish → verify.
Do not pause for routine caption or design approval unless the user requested a
preview or a stop condition in this guide is reached.

## 1. Read and inspect before acting

Read these current files before starting:

1. `AGENTS.md`
2. `PRODUCT.md`
3. `aiPromptpublishguide.md`
4. This guide
5. `/Volumes/Mac_ssd1/Instagram Automate/README.md`
6. The current Instagram Automator CLI implementation when its contract is
   unclear (`src/ig_agent/model.py`, `cli.py`, `service.py`, and `meta.py`)

Inspect the repository and CLI instead of assuming paths, API versions, account
IDs, or job fields have remained unchanged.

### Prerequisites

- `uv` and Python 3.10+ are available.
- `/Volumes/Mac_ssd1/Instagram Automate/.env` contains a valid Instagram user
  access token with `instagram_business_basic` and
  `instagram_business_content_publish`, plus the expected account ID.
- The target is the allowlisted professional account `freepromptbase`, Instagram
  user ID `28022656494035186`.
- The Automator SQLite database is initialized with `uv run ig-agent init`.
- `.agent-publish-token` is available in the Free Prompt Base project for the
  two-slide media upload.
- Wrangler authentication is available when performing the recommended D1
  cross-check.
- A browser/image renderer and an image inspection tool are available.

Do not request, echo, log, or place either access token in a prompt, graphic,
job JSON, or completion report.

## 2. Required carousel result

The Instagram carousel mirrors the prompt page and appends two slides:

1. The existing cover image containing the title/text.
2. Every remaining image from the prompt page, in the same order.
3. A new full-prompt slide using one non-cover gallery image as a blurred
   background.
4. A new Free Prompt Base website-promotion slide.

For the site's standard four-image gallery, the finished Instagram carousel has
exactly six slides. Do not regenerate, redesign, replace, or reorder the first
four images. Downloading, validating, and reusing them is sufficient.

The direct post request authorizes reuse of this already-public gallery on the
allowlisted Instagram account, including recognizable people already present in
the public images. It never authorizes publishing raw/private identity
references or using them to generate new people.

Instagram accepts at most ten carousel items. If the source page has more than
eight images, stop and ask which images to include. If it has fewer than two
usable images, stop and report the problem.

## 3. Extract the live prompt page

Treat the live page and production prompt record as the source of truth for the
post. Given `PROMPT_URL`:

1. Confirm the URL uses `https://freepromptbase.com/` and resolves successfully.
2. Resolve its canonical URL and slug.
3. Validate the resolved slug against `^[a-z0-9-]+$` before using it in a path,
   SQL command, CDN folder, filename, or idempotency key.
4. Extract the title, description, exact copyable prompt, tags, cover image, and
   gallery image order.
5. Prefer the page's `CreativeWork` JSON-LD `image` array for gallery order and
   the element marked `data-copy-text` for the public prompt text.
6. When repository access and Wrangler credentials are available, compare the
   prompt with the production D1 record:

   ```bash
   npx wrangler d1 execute freepromptbase-com --remote \
     --command "SELECT slug, title, prompt_text, cover_image, images FROM prompts WHERE slug='<slug>';" \
     --json
   ```

7. Use original same-origin URLs under `https://freepromptbase.com/cdn/`.
   Meta must be able to download every item over public HTTPS.

The production `cover_image` must be the first carousel item. The remaining
items follow the stored `images`/JSON-LD order without duplication. If the live
page, JSON-LD, and D1 record disagree about the cover or order, stop instead of
guessing.

Extract the prompt through the DOM element's decoded `textContent`, normalize
line endings from CRLF/CR to LF, and trim surrounding whitespace only. Apply the
same line-ending and surrounding-whitespace normalization to D1 before comparing
the strings. Any other character, punctuation, placeholder, word, or internal
line-break difference is material and must not be ignored.

Do not silently repair, complete, shorten, summarize, or rewrite the prompt. If
the public prompt ends mid-word, appears truncated, contains an obvious private
reference, or differs materially between the page and D1, stop before creating
the Instagram post and ask whether the site prompt should be corrected first.

Download the source images to a task-specific directory such as:

```text
tmp/instagram/<slug>/01-cover.webp
tmp/instagram/<slug>/02-photo.webp
tmp/instagram/<slug>/03-photo.webp
tmp/instagram/<slug>/04-photo.webp
```

Verify each file's dimensions, MIME type, and visual contents. The normal source
format is 1120×1400 (4:5), which is already suitable for Instagram. Do not crop
or re-encode valid originals merely for consistency.

Meta's official publishing limitations document JPEG as the supported image
format. Keep the source assets unchanged, but use Instagram-only JPEG delivery
derivatives for the post. For an existing CDN image, request a same-size
Cloudflare derivative such as:

```text
https://freepromptbase.com/cdn-cgi/image/width=1120,quality=92,format=jpeg/cdn/<existing-key>
```

Verify that each derivative returns `Content-Type: image/jpeg` and retains the
expected 4:5 dimensions. This is a delivery conversion, not a redesign or a new
gallery image. See Meta's current
[Content Publishing limitations](https://developers.facebook.com/docs/instagram-platform/content-publishing/#limitations)
before changing the delivery format.

## 4. Create only the two additional slides

Create both slides at the same 4:5 dimensions as the source gallery, preferably
1120×1400. A PNG may be retained as the local design master, but create a
high-quality 1120×1400 JPEG delivery file for Meta. Use the `canvas-design` skill
when available. Follow the brand
direction in `PRODUCT.md`: warm indie utility, restrained gold/amber accents,
imagery first, and no purple-blue AI gradients or generic SaaS styling.

### Slide N+1 — full prompt

- Randomly select one non-cover source image. A deterministic slug-based
  selection is acceptable when reproducibility is required.
- Use that exact image as the full-canvas background.
- Blur and darken it enough to support text while leaving the source image
  perceptible.
- Add a short label such as `COPY + PASTE` and a clear prompt heading.
- Place the complete public prompt on a high-contrast reading surface.
- Keep the prompt wording exact, including punctuation and placeholders.
- Include a compact instruction such as `Upload your photo → paste into Gemini`.
- Keep all text inside safe margins and visually inspect it at full resolution.

The full prompt must be readable on a phone. Do not shrink body text below a
practical reading size simply to force an unusually long prompt onto one slide.
If the complete prompt cannot fit on one slide without clipping or unreadably
small text, stop and ask whether to break the default two-additional-slide
contract by adding another prompt slide. Never abbreviate it or omit the website
slide without permission, and keep the final carousel at ten items or fewer.

### Slide N+2 — website promotion

- Use a source gallery image as the visual foundation.
- Promote `freepromptbase.com` prominently.
- Use the brand line `Copy. Paste. Create.` where it suits the composition.
- A suitable message is `Your next AI photo starts with a better prompt.`
- A suitable CTA is `Explore more prompts — freepromptbase.com`.
- Mention Gemini, ChatGPT, or other tools only when relevant to the source page.
- Do not invent user counts, prompt counts, awards, pricing claims, or “link in
  bio” unless verified for the account.

Render both slides, inspect them with an image viewer, and perform a polish pass.
Check for clipped text, low contrast, bad line breaks, incorrect URLs, distorted
faces, and mismatched dimensions. Retain the final PNGs and remove disposable
rendering files when they are no longer needed. Convert the approved masters to
JPEG at approximately 90–94 quality and inspect the JPEGs again for text ringing,
banding, or color changes.

## 5. Upload the two finished slides

Meta cannot use local filesystem paths. Upload only the two finished additional
slides through the authenticated Free Prompt Base media endpoint:

```text
POST https://freepromptbase.com/api/agent/cms/media
folder=instagram/<slug>
files=<full-prompt.jpg>,<website-promo.jpg>
```

Read the bearer token from `.agent-publish-token` at runtime and send
`Origin: https://freepromptbase.com`. Never print, copy into a job file, or expose
the token. The endpoint returns content-addressed public CDN URLs such as:

```text
https://freepromptbase.com/cdn/cms/instagram/<slug>/<sha256>.jpg
```

The current endpoint accepts at most eight files per request and 10MB per file.
For this workflow, send exactly two `image/jpeg` files. Run the upload from the
Free Prompt Base project root. A tested Node pattern is:

```bash
IG_POST_SLUG='<slug>' \
IG_POST_SLIDE_DIR='tmp/instagram/<slug>' \
node --input-type=module - <<'NODE'
import { readFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

const slug = process.env.IG_POST_SLUG || '';
if (!/^[a-z0-9-]+$/.test(slug)) throw new Error('Invalid IG_POST_SLUG');

const directory = resolve(process.env.IG_POST_SLIDE_DIR || '');
const paths = [
  resolve(directory, 'full-prompt.jpg'),
  resolve(directory, 'website-promo.jpg'),
];
const token = (await readFile(resolve('.agent-publish-token'), 'utf8')).trim();
if (!token) throw new Error('Empty .agent-publish-token');

const form = new FormData();
form.set('folder', `instagram/${slug}`);
for (const path of paths) {
  const bytes = await readFile(path);
  if (bytes.length <= 0 || bytes.length > 10 * 1024 * 1024) {
    throw new Error(`${basename(path)} has an invalid size`);
  }
  form.append('files', new Blob([bytes], { type: 'image/jpeg' }), basename(path));
}

const response = await fetch('https://freepromptbase.com/api/agent/cms/media', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    Origin: 'https://freepromptbase.com',
  },
  body: form,
});
const data = await response.json().catch(() => ({}));
if (!response.ok || !data.success || data.uploads?.length !== 2) {
  throw new Error(`${response.status}: ${data.error || 'Unexpected upload response'}`);
}
console.log(JSON.stringify({
  success: true,
  uploads: data.uploads.map(({ url, mimeType, sizeBytes }) => ({ url, mimeType, sizeBytes })),
}, null, 2));
NODE
```

This is a media-only upload. Do not call the prompt create/update endpoint and do
not change the source prompt record as part of an Instagram post.

The original gallery uses the verified JPEG transform URLs from Section 3; only
the two new slides are uploaded here. Before publishing, request all finished
Instagram delivery URLs. Each must return HTTP 200/206 with
`Content-Type: image/jpeg`, the intended 4:5 dimensions, and visually unchanged
content. Reject redirects to login pages, HTML error documents, private URLs,
local paths, mixed aspect ratios, and non-JPEG responses.

## 6. Write the caption

Use a compact caption with this structure:

1. One-line hook based on the prompt title or result.
2. Tell readers to swipe through the results and save the full-prompt slide.
3. Give the basic action: upload the required photo, paste the prompt into the
   relevant AI tool, and create a version.
4. Direct readers to `freepromptbase.com` for the prompt and more free prompts.
5. End with `Copy. Paste. Create.` and five to eight relevant hashtags.

Example:

```text
Golden-hour seaside couple selfie 🌅❤️

Swipe through the results, then save slide <N+1> for the exact copy-paste prompt.

Upload your couple photo, paste the prompt into Gemini or ChatGPT, and create
your version.

Find this prompt and more free prompts at freepromptbase.com
Copy. Paste. Create.

#GeminiAI #NanoBanana #AIPrompts #AIPhotoEditing #CouplePhotoPrompt
#GoldenHour #FreePromptBase
```

Replace `<N+1>` with the actual full-prompt slide number. Adapt the wording and
hashtags to the actual prompt. Do not claim the full domain URL is clickable in
a feed caption.

## 7. Build the Automator job

The configured Automator normally lives at:

```text
/Volumes/Mac_ssd1/Instagram Automate
```

Confirm the connection before every publish:

```bash
cd "/Volumes/Mac_ssd1/Instagram Automate"
uv run ig-agent doctor
```

The doctor response must have `ok: true`, username `freepromptbase`, and account
ID `28022656494035186`. The short request format in this guide authorizes only
that allowlisted account. Stop without publishing if either identifier differs,
credentials/scopes are missing, `publishing_limit_warning` is present, or the
publishing-limit response is unavailable or invalid.

Store reusable job JSON under `posts/`:

```text
posts/<slug>-carousel-YYYY-MM-DD.json
```

The required shape is:

```json
{
  "scheduled_at": "2026-08-05T18:30:00+05:30",
  "type": "carousel",
  "media": [
    { "type": "image", "url": "<jpeg-cover-derivative-url>" },
    { "type": "image", "url": "<jpeg-image-2-derivative-url>" },
    { "type": "image", "url": "<jpeg-image-3-derivative-url>" },
    { "type": "image", "url": "<jpeg-image-4-derivative-url>" },
    { "type": "image", "url": "<uploaded-full-prompt-jpeg-url>" },
    { "type": "image", "url": "<uploaded-website-jpeg-url>" }
  ],
  "caption": "<final caption>",
  "idempotency_key": "freepromptbase-<slug>-carousel-YYYYMMDD-v1"
}
```

Never place the Instagram access token or account ID in this JSON. Use a stable,
unique idempotency key so retries cannot create duplicate posts.

Validate the JSON with `ig_agent.model.normalize_job` or an equivalent read-only
check. Confirm:

- `type` is `carousel`;
- all media items are public HTTPS images;
- source images appear first and in their live-page order;
- the two new slides are last;
- total items are between two and ten;
- the caption is at most 2,200 characters; and
- an idempotency key is present.

The idempotency key is enforced only inside the configured local SQLite
database. Perform the lookup and structural payload comparison **before**
calling `publish-now`; that command can process an existing queued job before it
returns a response.

Run this preflight from the Automator directory:

```bash
IG_POST_JOB_FILE='posts/<job-file>.json' uv run python - <<'PY'
import json
import os
from pathlib import Path
from ig_agent.config import Settings
from ig_agent.model import normalize_job
from ig_agent.store import JobStore

path = Path(os.environ.get("IG_POST_JOB_FILE", ""))
raw = json.loads(path.read_text(encoding="utf-8"))
normalized = normalize_job(raw)
key = normalized.get("idempotency_key")
if not key:
    raise SystemExit("Job has no idempotency key")

settings = Settings.from_env(require_credentials=False)
store = JobStore(settings.db_path)
existing = store.get_by_idempotency_key(key)
if existing and existing["payload"] != normalized["payload"]:
    raise SystemExit("Idempotency key belongs to a different payload; do not publish")

print(json.dumps({
    "ok": True,
    "idempotency_key": key,
    "existing_job_id": existing["id"] if existing else None,
    "existing_status": existing["status"] if existing else None,
    "safe_for_publish_now": existing is None or existing["status"] == "queued",
}, indent=2))
PY
```

Call `publish-now` only when `safe_for_publish_now` is true. When an identical
job already exists:

- `queued`: `publish-now` may process that same job;
- `running`: follow the recovery section and do not call `publish-now`;
- `published`: report/re-verify the existing post and do not publish again;
- `failed`: inspect the error and use the documented retry command if safe; and
- `canceled`: stop and request direction.

If a later CLI response returns `created: false`, repeat the structural check as
defense in depth. Never switch to a new key to bypass an already-published or
ambiguous job, because that can create a duplicate post.

## 8. Publish or schedule

For an immediate post:

```bash
uv run ig-agent publish-now --file "posts/<job-file>.json"
```

`publish-now` overrides the JSON file's `scheduled_at` with the current UTC time.
Keep a valid timezone-aware timestamp in the reusable JSON because the job model
requires one, but do not interpret that value as a delay for `publish-now`.

For a user-requested future time, put the timezone-aware timestamp in
`scheduled_at` and run:

```bash
uv run ig-agent schedule --file "posts/<job-file>.json"
```

Record the returned job ID. For scheduled jobs, confirm `status: queued` and
ensure a worker or recurring `run-due` process will be available at publish time.

For immediate jobs, wait until the status is `published`. A successful response
includes both `container_id` and `media_id`. Do not report success while the job
is merely `queued` or `running`.

## 9. Safe recovery from interrupted publishing

First inspect the existing job:

```bash
uv run ig-agent show <job-id>
```

Always retain and use the job ID returned by the original command. The current
`list` command sorts from oldest to newest, so a small `--limit` is not a reliable
way to discover the latest interrupted job. If the ID was lost, look it up by the
exact idempotency key through `JobStore.get_by_idempotency_key` before doing
anything else.

Follow these rules:

- Never create a new idempotency key merely because a command timed out.
- If the job is already `published`, stop retrying.
- If it is `queued`, let `run-due` or the worker retry it normally.
- If it is `failed`, use `ig-agent retry <job-id>` only after reading the error.
- If the command process ended while the job remains `running` with a recorded
  `container_id`, reuse that existing container. Do not create another carousel.
- If it is `running` without a `container_id`, the state is ambiguous. Do not
  resume or create another job automatically; inspect the original process and
  local logs, then request direction if the container cannot be established.

The current service can resume an orphaned running job without duplicating the
container:

```bash
uv run python - <<'PY'
import json
from ig_agent.cli import make_scheduler
from ig_agent.config import Settings
from ig_agent.store import JobStore

job_id = "<existing-job-id>"
settings = Settings.from_env(require_credentials=True)
store = JobStore(settings.db_path)
job = store.get(job_id)

if not job:
    raise SystemExit("Job not found")
if job["status"] == "published":
    print(json.dumps({"ok": True, "job": job}, indent=2))
elif job["status"] == "running" and job.get("container_id"):
    print(json.dumps(make_scheduler(settings, store).process_claimed(job), indent=2))
else:
    raise SystemExit(f"Do not resume this state directly: {job['status']}")
PY
```

Use this recovery only after confirming the original publishing process is no
longer running, re-reading the job, and confirming its saved payload matches the
intended post. The helper is not safe to run concurrently with a live worker. It
resumes the saved parent container and does not rebuild its children.

## 10. Verify the live Instagram post

After the Automator reports `published`, query the returned `media_id` through
the configured Meta client for:

```text
id, media_type, media_product_type, permalink, timestamp, caption,
children{media_type,media_url}
```

Run this from the Automator directory with the recorded job ID:

```bash
IG_POST_JOB_ID='<job-id>' uv run python - <<'PY'
import json
import os
from ig_agent.config import Settings
from ig_agent.meta import MetaClient
from ig_agent.store import JobStore

job_id = os.environ.get("IG_POST_JOB_ID", "")
settings = Settings.from_env(require_credentials=True)
store = JobStore(settings.db_path)
job = store.get(job_id)
if not job or job["status"] != "published" or not job.get("media_id"):
    raise SystemExit("Job is not published with a media_id")

client = MetaClient(
    settings.access_token,
    settings.user_id,
    settings.api_host,
    settings.api_version,
)
media = client.request("GET", job["media_id"], {
    "fields": "id,media_type,media_product_type,permalink,timestamp,caption,children{media_type,media_url}",
})
children = media.get("children", {}).get("data", [])
if media.get("media_type") != "CAROUSEL_ALBUM":
    raise SystemExit("Published media is not a carousel album")
if media.get("media_product_type") != "FEED":
    raise SystemExit("Published media is not a feed post")
if media.get("caption", "") != job["payload"].get("caption", ""):
    raise SystemExit("Published caption differs from the job")
if len(children) != len(job["payload"].get("media", [])):
    raise SystemExit("Published child count differs from the job")
if any(child.get("media_type") != "IMAGE" for child in children):
    raise SystemExit("A carousel child is not an image")

print(json.dumps({
    "ok": True,
    "job_id": job_id,
    "media_id": job["media_id"],
    "permalink": media.get("permalink"),
    "timestamp": media.get("timestamp"),
    "children": children,
}, indent=2, ensure_ascii=False))
PY
```

The expected result is:

- `media_type: CAROUSEL_ALBUM`;
- `media_product_type: FEED`;
- a public Instagram permalink;
- the intended caption; and
- the exact expected child count, normally six, with every child reported as an
  image.

Open the permalink when possible and visually confirm the cover, order, prompt
slide, and website slide. Verification is not complete merely because Meta
returned a media ID. Meta's returned child URLs are Instagram delivery copies,
so visual swipe-through is the final order check. If the permalink cannot be
opened, report verification as partial rather than claiming the visual order was
confirmed.

## 11. Completion report

Tell the user:

- the account that received the post;
- whether it was published now or scheduled;
- the Instagram permalink;
- the number and order of slides;
- the Automator job ID and Meta media ID when useful; and
- local links to the two generated slides and job JSON.

Explicitly disclose source anomalies, caption compromises, or partial
verification. Do not expose access tokens or private account configuration.

## 12. Stop conditions and prohibitions

Stop before publishing when any of these occurs:

- the prompt URL is not a valid Free Prompt Base prompt page;
- the prompt appears truncated, corrupted, or unexpectedly different in D1;
- the cover/gallery order cannot be established;
- a media item is private, missing, not an image, or visually broken;
- the prompt slide clips or makes the complete prompt unreadable;
- the finished carousel would exceed ten items;
- the Automator doctor fails or targets the wrong Instagram account; or
- publishing would require an unrequested account, prompt, or production-data
  change.

Never:

- regenerate or redesign the prompt page's original carousel images;
- upload drafts, rejected graphics, private identity references, or secrets;
- silently shorten or rewrite the public prompt;
- bypass the official local Automator or Meta API;
- create a duplicate job to work around an in-progress one; or
- delete and repost a live Instagram post without explicit user authorization.

## Final checklist

- [ ] Read the repository, prompt-publishing, brand, and Automator guides.
- [ ] Confirmed the canonical Free Prompt Base URL and slug.
- [ ] Extracted and cross-checked the exact prompt and gallery order.
- [ ] Confirmed the prompt is complete and safe to reproduce publicly.
- [ ] Reused every original source image unchanged and in order.
- [ ] Prepared verified JPEG delivery derivatives without redesigning originals.
- [ ] Created only the full-prompt and website-promotion slides.
- [ ] Inspected both new 4:5 design masters and delivery JPEGs at full resolution.
- [ ] Uploaded only finished slides to `cms/instagram/<slug>/`.
- [ ] Verified every delivery URL returns HTTP 200/206, `image/jpeg`, and 4:5.
- [ ] Wrote a prompt-specific caption and relevant hashtags.
- [ ] Ran `ig-agent doctor` and confirmed the allowlisted username and ID.
- [ ] Validated the job JSON, item count, caption length, and idempotency key.
- [ ] Ran the preflight key lookup and confirmed the normalized payload/status.
- [ ] Published immediately or scheduled exactly as requested.
- [ ] Confirmed `published` status, Meta media ID, permalink, and child count.
- [ ] Opened the permalink and visually confirmed order, or reported partial verification.
- [ ] Reported the live result without exposing credentials.
