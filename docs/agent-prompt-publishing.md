# Agent prompt publishing API

This is the machine-facing equivalent of the admin prompt form. The browser UI
and agent API both call the same prompt/media publishing services, so validation,
author resolution, slug generation, scheduling, R2 keys, D1 writes, and activity
logging stay consistent.

## Authentication

Production uses `Authorization: Bearer <AGENT_PUBLISH_TOKEN>`. Machine clients
also send `Origin: https://freepromptbase.com` so Astro's form-origin protection
can verify multipart uploads. The token is a
Cloudflare Worker secret. The local `.agent-publish-token` file is ignored by Git
and is read automatically by the CLI. The API attributes actions to the active
admin configured by `AGENT_PUBLISH_USER_ID`.

## Recommended agent flow

1. Write a JSON manifest with an SEO-focused title, description, exact prompt,
   tags, author, a required sample-identity policy, and optional local `imagePaths`.
2. Run a dry validation. This checks the category, author, slug collision,
   trusted CDN URLs, gallery limits, dimensions, and SEO warnings without writing.
3. Upload all local images in one authenticated media request. Uploads use the
   same content-addressed R2/media-table path as the admin UI and dedupe by bytes.
4. Validate the final payload again after CDN URLs have been attached.
5. Publish once. Repeating the same slug/title/prompt/category is idempotent;
   using that slug for different content returns HTTP 409.
6. Public prompt/listing caches are invalidated automatically in the serving
   edge location. Verify the returned `publicUrl` and CDN image responses.

The included CLI performs all six steps:

```bash
npm run prompt:publish -- tmp/my-prompt.json --dry-run
npm run prompt:publish -- tmp/my-prompt.json
npm run prompt:publish -- tmp/my-prompt.json --update
```

## Image prompt gallery standard

Agent-published image prompts should include four finished gallery samples unless
the current request explicitly asks for a different count. Use one sample as the
cover/thumbnail with a short, legible text treatment, and use the other three to
show useful visual variations of the same prompt. Declare the cover with
`coverIndex` and provide its exact dimensions with `coverW` and `coverH`.

This four-image standard does not override the sample identity rule below. A
recognisable face may appear in the cover or gallery only when the current user
explicitly authorizes that exact identity for that exact prompt. Identity
permission never carries forward to later publishing requests.

### Identity variation mix

When the current request explicitly authorizes the user's identity, split the
four gallery samples evenly: generate two samples with the authorized identity
reference and two samples entirely from scratch without any identity reference.
The no-reference samples must use fictional, anonymous people and must not derive
their faces from prior outputs or private files.

When the current request does not explicitly authorize the user's identity, all
four samples remain fictional. This variation mix never makes identity permission
persistent; authorization is still required again for every exact prompt.

## Manifest shape

```json
{
  "title": "Gemini AI Couple Mirror Selfie Photo Editing Prompt",
  "slug": "gemini-ai-couple-mirror-selfie-photo-editing-prompt",
  "description": "Create an ultra-realistic luxury elevator couple selfie while preserving both uploaded facial identities and natural skin texture.",
  "promptText": "Full copyable prompt...",
  "category": "images",
  "tags": ["gemini ai", "couple prompt", "mirror selfie", "photo editing"],
  "createdBy": "oRrwF0SWVY3NqH6iQ8LPf",
  "howToUse": "Upload two clear identity photos, then paste the prompt.",
  "status": "approved",
  "featured": false,
  "sampleIdentityPolicy": "fictional",
  "imagePaths": ["public/prompts/example/example-1.webp"],
  "coverIndex": 0,
  "coverW": 1024,
  "coverH": 1792
}
```

`imagePaths` and `coverIndex` are CLI-only fields and are removed before the API
request. Direct API callers use the returned media URLs in `images` and
`coverImage`.

## Mandatory sample identity rule

Gallery samples default to entirely fictional, anonymous people. Agents must not
reuse `Myface.JPG`, uploaded user photos, private identity references, earlier
conversation faces, or any recognisable real person unless the current user
explicitly authorizes that exact identity for that exact prompt in the current
request. Previous permission does not carry forward.

Every agent request containing gallery images must declare one of:

- `"sampleIdentityPolicy": "fictional"` — default and recommended. Generate
  all sample people from scratch without identity references.
- `"sampleIdentityPolicy": "explicitly-authorized-reference"` together with
  `"identityAuthorization": "current-user-request"` — only when the current
  request explicitly authorizes using a supplied identity.

The API rejects gallery publishes and updates without this declaration. Raw
identity-reference files are never uploaded as public media.

## Direct endpoints

- `POST /api/agent/cms/prompts?dryRun=1` — validate and normalize without writes.
- `POST /api/agent/cms/media` — multipart batch upload (`files`, maximum 8).
- `POST /api/agent/cms/prompts` — create an approved, draft, or scheduled prompt.
- `PATCH /api/agent/cms/prompts?dryRun=1` — validate a full replacement update.
- `PATCH /api/agent/cms/prompts` — replace an existing prompt from a complete manifest.
- `POST /api/agent/cms/cache` — invalidate explicit public paths after a direct
  content update (`{"paths":["/some-prompt","/"]}`).

Only same-origin `https://freepromptbase.com/cdn/` media URLs are accepted. This
prevents an agent from accidentally publishing hotlinked or untrusted images.
