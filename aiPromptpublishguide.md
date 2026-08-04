# AI Prompt Publishing Guide

Last updated: 2026-08-04

This is the primary handoff guide for AI agents publishing prompts to
Free Prompt Base. Follow it for every prompt-publishing request in this
repository.

The goal is simple: publish a useful, copyable prompt with a strong cover and a
verified four-image gallery, without exposing private identity references or
bypassing the site's publishing services.

## 1. Read these files before acting

Read the current versions in this order:

1. `AGENTS.md`
2. `PRODUCT.md`
3. `docs/agent-prompt-publishing.md`
4. `seo/keyword-research.md`
5. `seo/tracklist.md`
6. `scripts/agent-publish.mjs`
7. `src/lib/promptPublishing.ts`
8. The complete `imagegen` skill and its required prompting references when
   generating or editing gallery images

Repository instructions and current user instructions override this guide if
they conflict. Inspect the CLI and publishing implementation once per publishing
session instead of assuming this guide is newer than the API contract.

## 2. Non-negotiable publishing principles

- Use the agent publishing CLI/API. Never publish a prompt by writing directly
  to D1 or bypassing the shared prompt/media publishing services.
- Run the initial dry validation before uploading any media.
- Upload only finished public gallery assets to Free Prompt Base, its CDN, R2,
  D1, or another public/storage destination. An explicitly authorized private
  reference may be transmitted transiently to the approved image generator for
  the current task; it must not become site media. Never publish raw identity
  photos, masks, private references, drafts, or rejected generations.
- Run the final validation after CDN URLs are attached. Image prompts must have
  no final warnings. A text prompt with no gallery may retain only the documented
  no-gallery warning described in Section 9.
- Verify the public page and every CDN image after publishing.
- Preserve unrelated user changes in a dirty worktree. Do not commit, stage,
  revert, or delete unrelated files unless the user explicitly asks.
- A request to publish a prompt authorizes the prompt, required gallery media,
  and normal production verification. It does not authorize unrelated site or
  SEO-page changes.

## 3. Preserve the user's prompt

The public `promptText` is the user's copyable content.

- Trim surrounding whitespace. Remove only conversational wrappers such as a
  leading `Prompt:`, `Prompt:-`, Markdown bold markers around that label, one
  Markdown code fence enclosing the whole prompt, or one pair of outer quotation
  marks that clearly belongs to the chat wrapper.
- Preserve the actual prompt wording, punctuation, ordering, line breaks,
  placeholders, spelling, brand language, negative prompts, and aspect-ratio
  instruction unless the user asks for editing.
- Do not silently humanize, correct typos, remove profanity, replace named
  styles, or rewrite the prompt for safety or SEO.
- SEO metadata and sample-generation prompts may be cleaned and structured, but
  the published `promptText` stays faithful to the user's supplied text.
- When a placeholder is unspecified, such as `brand name`, choose a clearly
  fictional value for gallery samples only. Do not insert it into the public
  prompt unless requested.
- If the user supplies multiple prompts, preserve their separation and publish
  them as separate entries unless they clearly request a collection.

Examples:

```text
Prompt:- "Create a cinematic portrait..."
```

becomes:

```text
Create a cinematic portrait...
```

Do not remove quotes used inside the prompt for required typography, dialogue,
JSON values, or literal output. When it is unclear whether a wrapper is part of
the prompt, preserve it.

## 4. SEO and metadata rules

Use the SEO files as the source of truth. Prompt audiences are primarily India
and Southeast Asia; favor relevant existing discovery terms without forcing
unrelated keywords.

For each prompt manifest:

- `title`: descriptive, unique, includes `Prompt`, and ideally 45–65 characters.
  The API hard limit is 120 characters.
- `slug`: concise kebab-case derived from the title and intent. Use a stable,
  descriptive slug; do not add random suffixes preemptively.
- `description`: benefit-led and specific, ideally 110–170 characters. The API
  hard limit is 320 characters.
- `category`: use `images` for visual-generation and photo-editing prompts; use
  `text` only for writing, coding, analysis, or other text prompts.
- `tags`: use 3–12 specific tags. Include relevant existing hubs such as
  `ai image prompt`, `photo editing prompt`, or
  `gemini ai photo prompt copy paste` when genuinely applicable. Do not stuff
  unrelated Nano Banana or Gemini terms.
- `author`: use `Bipul Kumar` unless the user specifies another author. Let the
  API resolve the active agent actor; do not hard-code an unverified `createdBy`
  ID.
- `howToUse`: give short practical instructions about uploads, placeholders,
  aspect ratio, typography checks, or regeneration risks.
- `status`: default to `approved` for a direct publish request. Use `draft` or a
  schedule only when the user requests it.
- `featured`: default to `false` unless explicitly requested.

Publishing an individual prompt does not automatically create a new keyword or
tag landing page. Update `seo/tracklist.md`, `src/data/tags.ts`, and a tag article
only when the task explicitly includes a new keyword/page.

## 5. Four-image gallery standard

Every agent-published image prompt should have exactly four finished gallery
images unless the current user explicitly requests a different count.

Text prompts follow a different default:

- Publish the text prompt through the same agent CLI with no `imagePaths`, no
  gallery, and no AI-generated identity imagery.
- The public card may use fallback artwork until the separate template-cover
  maintenance workflow runs.
- Do not run the bulk text-cover workflow as part of an individual publish. It
  affects every approved text prompt without a cover and requires separate user
  authorization for that broader maintenance operation.
- When bulk text-cover maintenance is explicitly requested, use the repository's
  official sequence:

  ```bash
  npm run assets:generate-text-covers
  npm run assets:upload-text-covers
  npm run db:backfill-text-covers
  ```

  This generates deterministic 1200×630 WebP title cards under
  `tmp/text-prompt-covers`, uploads them to R2, and backfills only missing text
  covers. Inspect the scripts before running them and verify the affected scope.

1. One image is the cover/thumbnail.
2. The cover should have a short, legible text treatment or use the prompt's
   required poster typography as its thumbnail treatment.
3. The other three images should be meaningful variations, not near-duplicates.
4. When the public prompt explicitly says `no text`, the cover may carry the
   required thumbnail headline, but the other three samples must be clean and
   text-free.
5. Each sample should demonstrate the prompt rather than adding unrelated
   characters, objects, logos, or narrative elements.
6. Follow the requested aspect ratio. Prefer a generated or selected cover that
   already matches it; avoid destructive cropping that removes required text,
   anatomy, or composition.
7. Provide the cover's exact measured `coverW` and `coverH` values to prevent
   layout shift.

### Identity variation mix

Identity permission is per prompt and per current request. It never carries
forward from an earlier prompt or conversation turn.

If the current request explicitly authorizes the user's identity for this exact
prompt:

- Generate two gallery samples using the authorized identity reference.
- Generate two gallery samples entirely from scratch without any reference
  image.
- The no-reference generations must use fictional, anonymous adults. Do not
  derive them from the user's face, identity-preserving outputs, prior
  conversation images, or private files.
- Either an identity sample or a fictional sample may be the cover; select the
  strongest compliant image.
- Use:

  ```json
  "sampleIdentityPolicy": "explicitly-authorized-reference",
  "identityAuthorization": "current-user-request"
  ```

If the current request does not explicitly authorize identity:

- Generate all four samples from scratch. Any people depicted must be fictional
  and anonymous; do not add people when the prompt does not call for them.
- Do not use `Myface.JPG`, another uploaded face, conversation images, or prior
  identity outputs.
- Use:

  ```json
  "sampleIdentityPolicy": "fictional"
  ```

Current-request authorization must affirmatively connect the user's private
reference to publicly displayed samples for this exact prompt, for example:
`Use my face from Myface.JPG in two samples for this prompt.` A generic line
inside a reusable prompt such as `maintain my identity` is not sufficient on its
own. When authorization is unclear, use fictional samples rather than carrying
forward earlier permission.

If the user requests a gallery count other than four and identity is authorized,
split the samples as evenly as possible and assign any extra sample to the
fictional/no-reference side. For example, five images means two authorized
identity samples and three fictional samples.

### Private reference handling

- The repository may contain `Myface.JPG`. Treat it as private input, never as a
  public asset.
- The file may be MPO-encoded despite its extension. If the image generator
  rejects it, make a private PNG working copy under `tmp/prompt-publishing/`.
- Never put the original or converted reference in `imagePaths`, `public/`, R2,
  D1, a manifest gallery, or a public response.
- A final generated image may contain an authorized identity. Do not reproduce
  the raw source photo verbatim as a public comparison inset unless the current
  user separately and explicitly authorizes publishing that exact source photo.
  A generated or stylized comparison inset is still subject to the ordinary
  current-request identity authorization.
- Delete only the agent-created private derivative after publishing or aborting
  the task. Use its explicit path under `tmp/prompt-publishing/`; never delete or
  modify the original identity source.

## 6. Image generation and QA

Use the built-in image-generation workflow by default and follow the complete
`imagegen` skill. Generate one finished asset per call so each variation can be
controlled and inspected.

### Sample-generation prompt rules

- Convert the user's prompt into a structured production brief for generation,
  but do not alter the public `promptText`.
- State that ambiguous `young` subjects are fictional adults and include an age
  of at least 21 when smoking, alcohol, explicit gestures, or mature styling is
  present.
- For identity samples, state exactly which file is the authorized identity
  reference and repeat the identity-preservation constraints.
- For no-reference samples, omit all reference-image arguments. Do not use a
  previous generated identity image as a shortcut.
- Use fictional brand names for missing brand placeholders. Avoid third-party
  logos in samples unless the user explicitly needs them and generation is
  permitted.
- Preserve exact requested in-image text. Quote the text, specify placement, and
  prohibit additional readable copy.
- Named visual styles may remain in the public prompt. When a generator requires
  it, express sample artwork through the requested high-level visual qualities
  rather than silently changing the public prompt.

### Inspect every generated sample

Check all of the following before saving it:

- requested subject, pose, framing, camera angle, and aspect ratio
- face consistency for authorized identity samples
- fictional independence for no-reference samples
- hands, fingers, limbs, gaze, and body mechanics
- outfit, props, environment, lighting, and palette
- exact spelling and placement of required typography
- no extra people when prohibited
- no unintended logos, watermark, border, or stray text
- natural skin, hair, fabric, smoke, reflections, and shadows when photorealism
  is requested
- all required collage panels, poster labels, insets, or decorative elements

Discard or regenerate failed samples. Do not publish a visibly broken image just
to reach four assets.

### Handling generator blocks or failures

- Do not quietly replace an explicitly requested character, identity, costume,
  or concept with a generic substitute.
- Try one or two scoped, policy-compliant generation approaches when useful,
  such as separating scene generation from an authorized edit.
- If the built-in generator continues to block the required result, stop that
  prompt's publication and tell the user what failed.
- Offer to use user-supplied finished samples, or offer the documented CLI
  fallback only after the user explicitly authorizes it. The fallback requires
  `OPENAI_API_KEY` and may enforce the same restrictions.
- For the fallback procedure, read the selected `imagegen` skill's
  `Fallback CLI mode only` section and `references/cli.md`. Never invent a
  one-off SDK runner or silently switch models.
- Do not publish a fallback-art version as if it satisfied the request.

### User-supplied finished samples

User-supplied samples may replace generated samples only when the user intends
them to be public and they satisfy the gallery brief.

- Treat recognizable people as identity-bearing media and require current
  authorization for public use.
- Do not confuse a face reference with a finished public sample.
- Convert accepted raster samples to optimized WebP and run the same visual,
  dimensions, count, identity-policy, and CDN verification checks.
- Keep the authorized/fictional split unless the current user explicitly
  requests a different gallery composition and represents that they have public
  publishing rights for every supplied image.
- For supplied media containing a recognizable third party, require an
  affirmative current-request statement such as: `I have permission to publish
  this image and each recognizable person's identity on Free Prompt Base.` Do
  not infer consent from possession of a file or a prior request.
- Any gallery containing one or more authorized recognizable identities uses
  `sampleIdentityPolicy: explicitly-authorized-reference` and
  `identityAuthorization: current-user-request`, regardless of the ratio.
- If the user explicitly overrides the 2+2 split, record and report the actual
  composition, for example `four user-supplied authorized identity images`.
  Never describe a nonstandard composition as 2+2.

## 7. Save and optimize gallery assets

Store only final public assets under:

```text
public/prompts/<slug>/
```

Recommended names:

```text
<short-name>-cover.webp
<short-name>-1.webp
<short-name>-2.webp
<short-name>-3.webp
```

Use WebP for generated raster samples. Quality around 88 is a practical default:

```bash
cwebp -quiet -q 88 -m 6 input.png -o public/prompts/<slug>/<name>.webp
```

Measure final dimensions after conversion with `sharp`, `sips`, or equivalent.
Use the actual cover dimensions in the manifest. Do not assume all generated
variants have the same dimensions.

Keep manifests and private working files under:

```text
tmp/prompt-publishing/<short-task-name>/
```

## 8. Manifest template

Create a complete JSON manifest. `imagePaths` and `coverIndex` are CLI-only and
are removed before the API request.

```json
{
  "title": "Descriptive SEO Title Including Prompt",
  "slug": "descriptive-seo-title-including-prompt",
  "description": "Specific 110–170 character description of the result and value.",
  "promptText": "The user's exact copyable prompt...",
  "category": "images",
  "tags": [
    "ai image prompt",
    "photo editing prompt",
    "specific visual style"
  ],
  "author": "Bipul Kumar",
  "howToUse": "Upload or replace placeholders, then paste the prompt into your preferred image generator.",
  "status": "approved",
  "featured": false,
  "sampleIdentityPolicy": "fictional",
  "imagePaths": [
    "public/prompts/example/example-cover.webp",
    "public/prompts/example/example-1.webp",
    "public/prompts/example/example-2.webp",
    "public/prompts/example/example-3.webp"
  ],
  "coverIndex": 0,
  "coverW": 1080,
  "coverH": 1440
}
```

For an explicitly authorized mixed gallery, replace the identity fields with:

```json
"sampleIdentityPolicy": "explicitly-authorized-reference",
"identityAuthorization": "current-user-request"
```

Do not include private reference paths in the manifest.

For a text prompt, set `category` to `text`, omit `imagePaths`, `coverIndex`,
`coverW`, and `coverH`, and do not generate a gallery. The identity-policy fields
may be omitted because no gallery identity is being published.

## 9. Required production sequence

### Step 1: Initial dry validation

```bash
npm run prompt:publish -- tmp/prompt-publishing/<task>/manifest.json --dry-run
```

The CLI strips local `imagePaths` before this first request. Therefore the
warning below is expected during the initial validation of an image prompt:

```text
No gallery images supplied; the public card will use its fallback artwork.
```

All other warnings or errors must be resolved before continuing.

For a text prompt with no gallery, this same no-gallery warning is expected in
both initial and final validation and is the only permitted final warning. Do
not add a fake image gallery merely to silence it.

This dry-run is also the authoritative pre-upload slug-ownership check. A
collision or HTTP 409 must be resolved before media upload; no separate database
query is required.

### Step 2: Upload, final validation, and publish

```bash
npm run prompt:publish -- tmp/prompt-publishing/<task>/manifest.json
```

The CLI performs the following:

1. repeats the text/category/author/slug validation
2. uploads every local image in one authenticated media request
3. attaches trusted `https://freepromptbase.com/cdn/` URLs
4. validates the complete gallery payload again
5. publishes once

For image prompts, require:

- final `validation.warnings` to be empty
- `published.success` to be `true`
- `published.dryRun` to be `false`
- the expected slug and `approved` status

For text prompts, require the same success/status fields while allowing only the
documented no-gallery warning.

Publishing is idempotent only when slug, title, prompt, category, metadata, and
media match. A reused slug with different content returns HTTP 409. Do not work
around a collision by overwriting unrelated content.

Use `--update` only for an intentional full-replacement update of an existing
prompt:

```bash
npm run prompt:publish -- tmp/prompt-publishing/<task>/manifest.json --update
```

## 10. Public verification

After a successful publish, verify all of the following:

1. `publicUrl` returns HTTP 200.
2. The HTML title and meta description match the manifest.
3. The copyable prompt contains a distinctive exact phrase from `promptText`.
4. For an image prompt, CreativeWork JSON-LD exists and reports exactly four
   gallery image URLs, or the explicitly requested alternate count.
5. For an image prompt, every gallery URL returns HTTP 200 with
   `Content-Type: image/webp`.
6. For an image prompt, the first gallery image is the intended cover.
7. For a text prompt without a cover, confirm no gallery was unintentionally
   attached and that the page's fallback artwork/card behavior renders.
8. The public page displays the `howToUse` text and tags.

Start by saving the response for inspection:

```bash
curl -sS -D tmp/prompt-publishing/<task>/page-headers.txt \
  -o tmp/prompt-publishing/<task>/page.html \
  https://freepromptbase.com/<slug>
```

Then parse the CreativeWork JSON-LD from `page.html`, assert the gallery count,
and issue `HEAD` requests to every image URL. Do not rely on a visual browser
load alone.

Do not declare success before these checks pass. The publishing service already
invalidates prompt and listing caches in the serving edge location; still fetch
the public page directly to confirm the result.

If public verification fails, wait 5–10 seconds and retry once to rule out short
edge propagation. If it still fails:

- do not claim successful verification
- preserve the publish response and failing URL/status as evidence
- do not unpublish, overwrite, or roll back content without explicit authority
- report whether the prompt exists but its page/media verification failed
- use the documented cache endpoint only when the failure is clearly stale cache
  and the affected paths are known

## 11. Final user handoff

Lead with the live prompt link. Then report only the important facts:

- publication succeeded
- number of gallery images, or `no gallery` for a text prompt
- actual identity composition, normally `two authorized + two fictional` or
  `four fictional`; report any explicitly authorized override exactly
- whether the supplied prompt was preserved
- final validation warning count
- public page and CDN verification status
- project-local asset directory
- any guide or rule that changed during the task

Never imply that a blocked or substituted image fully satisfied the user's
request. State clearly when another prompt remains unpublished.

## 12. Quick checklist

Before generation:

- [ ] Read repository, publishing, SEO, and image-generation instructions.
- [ ] Determine whether this exact request authorizes identity.
- [ ] Preserve the user's copyable prompt.
- [ ] Draft SEO title, slug, description, tags, and how-to text.

Before dry-run:

- [ ] For an image prompt, four finished samples exist unless another count was
      explicitly requested.
- [ ] For an image prompt, the cover is selected and has a legible thumbnail
      treatment.
- [ ] For an image prompt, the identity mix is correct: 2+2 when authorized,
      otherwise four fictional, unless an authorized override is documented.
- [ ] For an image prompt, no private reference is under `public/` or in
      `imagePaths`.
- [ ] For an image prompt, images pass visual and typography QA.
- [ ] For an image prompt, WebPs and exact cover dimensions are ready.
- [ ] For a text prompt, `imagePaths` and gallery/cover fields are omitted.

Before publish:

- [ ] Initial dry-run passed.
- [ ] Only expected warnings remain: pre-upload no-gallery for an image prompt,
      or no-gallery in both stages for a text prompt.
- [ ] Slug is not owned by different content.

After publish:

- [ ] Final validation has zero warnings for an image prompt, or only the
      documented no-gallery warning for a text prompt.
- [ ] Public page returns HTTP 200.
- [ ] Title, description, and prompt are present.
- [ ] For an image prompt, JSON-LD gallery count is correct.
- [ ] For an image prompt, every CDN image returns HTTP 200 as WebP.
- [ ] For a text prompt, no gallery was attached unintentionally.
- [ ] Final response links the live page and local asset directory.
