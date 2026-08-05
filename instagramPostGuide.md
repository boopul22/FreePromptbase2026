# Instagram + Facebook Prompt Publishing Guide

Last updated: 2026-08-05

Use this guide when a user asks to publish a Free Prompt Base prompt URL to
Instagram. It converts the prompt page's gallery into an Instagram carousel,
adds two branded slides, publishes through the local Instagram Automator,
uses those exact finished images to create a custom multi-photo post specifically
for the allowlisted Facebook Page, and verifies both live posts.

The normal user request can be as short as:

```text
Post this prompt on Instagram: https://freepromptbase.com/<prompt-slug>
```

A direct request to **post** or **publish** on Instagram authorizes immediate
paired publishing to both configured Free Prompt Base destinations: Instagram
account `freepromptbase` and Facebook Page `Free Prompt Base`. If the user
explicitly says **Instagram only**, do not publish to Facebook. A request to
**prepare**, **draft**, or **show a preview** does not authorize publishing on
either platform. Scheduling is used only when the user supplies a date or time,
and the same requested time applies to both destinations unless the user says
otherwise.

Within a task whose established purpose is publishing these Instagram and
Facebook posts, a bare Free Prompt Base prompt URL is enough to select the next
prompt and run this standard paired workflow. Outside that established context,
a bare URL is not by itself authorization for an external post; ask whether the
user wants it published.

When authorization and all checks are healthy, run the complete workflow
autonomously: extract → validate → create two slides → upload → build the custom
Facebook post package from the finished images → preflight both destinations →
publish Instagram → publish Facebook → verify both. Do not pause for routine
caption or design approval unless the user requested a preview or a stop
condition in this guide is reached.

## 1. Read and inspect before acting

Read these current files before starting:

1. `AGENTS.md`
2. `PRODUCT.md`
3. `aiPromptpublishguide.md`
4. This guide
5. `Instagram Automate/README.md` in this repository
6. The current Instagram Automator CLI implementation when its contract is
   unclear (`src/ig_agent/model.py`, `cli.py`, `service.py`, and `meta.py`)

Inspect the repository and CLI instead of assuming paths, API versions, account
IDs, or job fields have remained unchanged.

### Prerequisites

- `uv` and Python 3.10+ are available.
- `Instagram Automate/.env` in this repository contains a valid Instagram user
  access token with `instagram_business_basic` and
  `instagram_business_content_publish`, plus the expected account ID.
- The target is the allowlisted professional account `freepromptbase`, Instagram
  user ID `28022656494035186`.
- The same `.env` contains `FB_PAGE_ID=1240248679172928` and the configured
  Facebook User access token. The current variable is named
  `FB_PAGE_ACCESS_TOKEN` for compatibility, but the configured value must be
  resolved through `/me/accounts` to obtain the actual Page access token used
  for Page API calls.
- The only allowlisted Facebook destination is Page `Free Prompt Base`, Page ID
  `1240248679172928`. The resolved Page entry must include `CREATE_CONTENT` and
  return a Page access token.
- The Automator SQLite database is initialized with `uv run ig-agent init`.
- `.agent-publish-token` is available in the Free Prompt Base project for the
  two-slide media upload.
- Wrangler authentication is available when performing the recommended D1
  cross-check.
- A browser/image renderer and an image inspection tool are available.

Do not request, echo, log, or place any Instagram, Facebook User, Facebook Page,
or agent upload access token in a prompt, graphic, job JSON, state file, or
completion report.

## 2. Required carousel result

The finished media set mirrors the prompt page and appends two slides:

1. The existing cover image containing the title/text.
2. Every remaining image from the prompt page, in the same order.
3. A new full-prompt slide using one non-cover gallery image as a blurred
   background.
4. A new Free Prompt Base website-promotion slide.

For the site's standard four-image gallery, the finished Instagram carousel and
Facebook multi-photo post each use exactly the same six images in the same
source order. Facebook may render them as a grid or album instead of an
Instagram-style swipe carousel. Do not regenerate, redesign, replace, or reorder
the first four images. Downloading, validating, and reusing them is sufficient.

The Facebook result is not a blind duplicate of the Instagram packaging. Its
media assets remain the exact verified six images, but the AI must create a
Facebook-specific creative package from what those images actually show:
Facebook hook, message, canonical-link CTA, keyword focus, and accessible
description for every image.

The direct post request authorizes reuse of this already-public gallery on both
allowlisted destinations, including recognizable people already present in the
public images. It never authorizes publishing raw/private identity references
or using them to generate new people.

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

## 6. Write platform-specific captions

Do not reuse one caption verbatim on both platforms. Write and retain an
Instagram caption and a Facebook message separately.

### Instagram caption

Use a compact Instagram caption with this structure:

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

### Facebook creative adaptation — mandatory

After the Instagram delivery images are final and visually approved, run a
separate AI creative pass specifically for Facebook. Give the AI the canonical
URL, prompt title, description, exact prompt, tags, mapped primary keyword,
supported AI tool, and the ordered finished images. The AI must inspect the
actual images rather than write from filenames or metadata alone.

Ask the AI to create one custom Facebook Page post package with:

- a Facebook-specific opening hook grounded in the visible result;
- a useful short narrative that connects the example images to the copy-paste
  prompt;
- the exact canonical prompt URL and a clear website CTA;
- one naturally used primary SEO keyword selected from the tracklist;
- three to five relevant hashtags;
- all exact verified image URLs in their established order, with the cover
  first, original gallery images next, full-prompt slide after them, and website
  slide last; and
- concise, image-specific accessible alt text for every image, describing only
  visible content and avoiding guesses about identity, ethnicity, relationships,
  disability, or other sensitive traits.

Use a brief equivalent to:

```text
Create a custom Facebook Page post for Free Prompt Base using only the supplied
verified images. Inspect every image. Write an original Facebook hook and message
that fit what the images show, naturally use the mapped primary keyword, include
the exact canonical URL, and end with a clear CTA plus 3–5 relevant hashtags.
Keep all supplied images unchanged and in the supplied order. Write factual alt text
for each image. Do not copy the Instagram caption, invent claims, infer sensitive
personal details, or create any new image.
```

Retain this Facebook package in the companion state JSON. Reject the output and
redo the adaptation if it is generic, contradicts the images, changes the media
order, omits the canonical URL, uses an unsupported tool name, or keyword-stuffs
the message.

### Facebook SEO message

Write a natural, search-aware Facebook message using the current keyword source
of truth in `seo/keyword-research.md` and `seo/tracklist.md`:

1. Select the most specific mapped primary keyword supported by the prompt's
   tags and content. Prefer the relevant long-tail over a broader head term.
2. Put that keyword naturally in the opening sentence, alongside the prompt's
   actual subject or result. Do not force `nano banana` or `Gemini` onto a prompt
   that does not use that tool or topic.
3. Explain that the post contains examples plus a full copy-paste prompt slide.
4. Include the canonical `https://freepromptbase.com/<slug>` URL. Unlike an
   Instagram feed caption, this link is clickable on Facebook.
5. Give one clear action: open the prompt, upload the required photo, paste it
   into the relevant AI tool, and create a version.
6. End with `Copy. Paste. Create.` and three to five closely relevant hashtags.

Use the current priority clusters when relevant: `nano banana prompt`,
`gemini ai photo prompt copy paste`, the prompt's mapped Gemini/photo-editing
long-tail, or the evergreen `free ai prompts`. Use one primary phrase naturally
and supporting terms only where they improve clarity. Never keyword-stuff,
repeat near-identical phrases, invent search-volume claims, or add unrelated
trending terms.

Example:

```text
Golden-hour Gemini couple photo prompt for a warm seaside selfie 🌅

Explore all six examples, then save the full copy-paste prompt slide. Upload
your couple photo, paste the prompt into Gemini, and create your version.

Get the exact free prompt:
https://freepromptbase.com/<slug>

Copy. Paste. Create.

#GeminiAIPhotoPrompt #CouplePhotoPrompt #AIPhotoEditing #FreePromptBase
```

Confirm that the Facebook message contains the exact canonical URL, accurately
names the supported AI tool, and describes the actual media. It should read like
useful social copy first and search-targeted copy second.

## 7. Build the Automator job

The configured Automator lives inside this repository at:

```text
Instagram Automate/
```

Confirm the connection before every publish:

```bash
cd "Instagram Automate"
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
  "caption": "<final Instagram caption>",
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

Before creating a post on either platform, complete both the Instagram doctor
check in Section 7 and the Facebook identity/token/duplicate preflight in
Section 11. If either destination fails preflight, stop before publishing to
either one and report the failing prerequisite. This avoids preventable
one-platform-only results.

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

After Instagram reports `published`, publish the paired Facebook post using
Section 11. If a failure occurs after either platform is already live, do not
delete the successful post or create a replacement idempotency key. Preserve the
recorded IDs, recover the incomplete platform safely, and report the result as
partial until both are verified.

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

## 11. Publish and verify the paired Facebook Page post

Use the custom Facebook post package created from the finished JPEG delivery
images in Section 6. Do not fall back to copying the Instagram caption if the
package is missing or invalid. The target is exclusively Facebook Page
`Free Prompt Base`, Page ID `1240248679172928`.

### Resolve and preflight the Page credential

Read `FB_PAGE_ID`, `FB_PAGE_ACCESS_TOKEN`, `FB_API_HOST`, and `FB_API_VERSION`
from `Instagram Automate/.env`. Never print any token. The current configured
`FB_PAGE_ACCESS_TOKEN` value is a Facebook User access token even though the
legacy variable name says Page. Resolve the actual Page token at runtime:

```text
GET https://graph.facebook.com/<version>/me/accounts
fields=id,name,access_token,tasks
Authorization: Bearer <configured-facebook-user-token>
```

Select the entry whose ID is exactly `1240248679172928`. Stop unless its name is
`Free Prompt Base`, its tasks include `CREATE_CONTENT`, and it returns a Page
access token. Keep that resolved Page token in memory only.

With the resolved Page token, confirm that this succeeds before either platform
is published:

```text
GET /1240248679172928?fields=id,name,link
```

Also inspect recent Page feed posts for the intended canonical URL, exact
Facebook message, and saved idempotency state. If the paired post already exists,
reuse and verify it instead of publishing a duplicate.

### Create durable local Facebook state

Create a companion state file inside the same Automator project:

```text
Instagram Automate/posts/<slug>-facebook-YYYY-MM-DD.json
```

It must contain the Page ID, canonical URL, custom Facebook message, ordered
delivery URLs, per-image role and alt text, a deterministic key such as
`freepromptbase-facebook-<slug>-YYYYMMDD-v1`, status, uploaded photo IDs, final
post ID, and permalink. Never store an access token in this file. Write each
returned photo ID to the state before starting the next remote mutation.

The Facebook Graph API does not accept the Instagram Automator's local
idempotency key. The companion state plus recent-feed reconciliation is the
duplicate-prevention mechanism for Facebook.

### Publish the multi-photo post

For each finished media URL, in the same order as the Instagram carousel, call:

```text
POST /1240248679172928/photos
url=<public-jpeg-url>
alt_text_custom=<factual-image-specific-alt-text>
published=false
Authorization: Bearer <resolved-page-token>
```

Record every returned photo ID immediately. After all uploads succeed, create
one Page feed post:

```text
POST /1240248679172928/feed
message=<facebook-seo-message>
attached_media[0]={"media_fbid":"<photo-id-1>"}
attached_media[1]={"media_fbid":"<photo-id-2>"}
...
Authorization: Bearer <resolved-page-token>
```

Use all finished images once and preserve their order. Submit the custom alt text
paired with the correct image URL. Do not create separate visible photo posts,
replace the source images, omit the two branded slides, or reuse the Instagram
caption as the Facebook message.

For a future time requested by the user, schedule the Facebook parent post for
the same instant using `published=false`, `scheduled_publish_time=<unix-time>`,
and `unpublished_content_type=SCHEDULED`. Confirm the current Meta scheduling
window before use; it is presently 10 minutes to 75 days. If the requested time
cannot be represented safely on both platforms, stop rather than silently
changing the time or publishing one platform immediately.

### Safe Facebook recovery

- If the state says `published`, fetch and verify the saved post ID; do not post
  again.
- If some unpublished photos have IDs, reuse those IDs and upload only the
  missing items.
- If the final `/feed` request times out, query recent Page feed posts for the
  exact message, canonical URL, expected time window, and attachment count
  before retrying.
- If the matching parent post exists, save its ID and continue verification.
- If the outcome remains ambiguous, stop and request direction. Do not create a
  new state file or idempotency key to bypass it.
- Never delete a live Page post or remote photo as part of automatic recovery.

### Verify Facebook

Fetch the returned Page post ID with fields equivalent to:

```text
id,message,created_time,permalink_url,is_published,scheduled_publish_time,
attachments{media_type,url,subattachments{media_type,url,target}}
```

For an immediate post, require `is_published: true`, the exact Facebook message,
a public permalink, and the expected attachment count. For a scheduled post,
require the intended `scheduled_publish_time` and an unpublished/scheduled state
until it goes live; verify it again after publication.

Open the Facebook permalink and visually confirm the cover, media set, and
ordering as rendered. Facebook may display multiple photos as a grid or album,
so do not claim Instagram-identical presentation. If the permalink cannot be
opened, report visual verification as partial.

## 12. Completion report

Tell the user:

- both destinations that received the posts;
- whether it was published now or scheduled;
- the Instagram permalink;
- the Facebook permalink;
- the number and order of slides;
- the Instagram Automator job ID and Meta media ID when useful;
- the Facebook Page post ID when useful; and
- local links to the two generated slides, Instagram job JSON, and Facebook
  state JSON.

Explicitly disclose source anomalies, caption compromises, or partial
verification. Do not expose access tokens or private account configuration.

## 13. Stop conditions and prohibitions

Stop before publishing when any of these occurs:

- the prompt URL is not a valid Free Prompt Base prompt page;
- the prompt appears truncated, corrupted, or unexpectedly different in D1;
- the cover/gallery order cannot be established;
- a media item is private, missing, not an image, or visually broken;
- the prompt slide clips or makes the complete prompt unreadable;
- the finished carousel would exceed ten items;
- the Automator doctor fails or targets the wrong Instagram account; or
- the Facebook token cannot resolve the exact allowlisted Page with
  `CREATE_CONTENT`, the Facebook identity preflight fails, or an earlier
  Facebook attempt has an ambiguous outcome; or
- publishing would require an unrequested account, prompt, or production-data
  change.

Never:

- regenerate or redesign the prompt page's original carousel images;
- upload drafts, rejected graphics, private identity references, or secrets;
- silently shorten or rewrite the public prompt;
- bypass the official local Automator or Meta API;
- create a duplicate job to work around an in-progress one; or
- delete and repost a live Instagram or Facebook post without explicit user
  authorization.

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
- [ ] Ran the mandatory Facebook creative adaptation against the actual finished
      images and rejected generic or image-inaccurate output.
- [ ] Wrote separate prompt-specific Instagram and Facebook captions.
- [ ] Used the prompt's mapped primary keyword naturally in the Facebook opening
      and included the exact canonical prompt URL.
- [ ] Wrote factual, image-specific Facebook alt text for every finished image.
- [ ] Ran `ig-agent doctor` and confirmed the allowlisted username and ID.
- [ ] Resolved the Facebook Page token in memory and confirmed Page
      `1240248679172928`, name `Free Prompt Base`, and `CREATE_CONTENT`.
- [ ] Validated the job JSON, item count, caption length, and idempotency key.
- [ ] Ran the preflight key lookup and confirmed the normalized payload/status.
- [ ] Created and maintained a token-free Facebook state JSON with every remote
      photo ID and the deterministic Facebook idempotency key.
- [ ] Published or scheduled both platforms for the requested time.
- [ ] Confirmed Instagram `published` status, Meta media ID, permalink, and child
      count.
- [ ] Confirmed Facebook Page post ID, exact message, published/scheduled state,
      permalink, and attachment count.
- [ ] Opened both permalinks and visually confirmed media/order, or reported
      partial verification.
- [ ] Reported the live result without exposing credentials.
