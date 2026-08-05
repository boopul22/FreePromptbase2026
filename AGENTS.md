# AGENTS.md — freepromptbase.com

Free Prompt Base — a free, browsable directory of ready-to-use AI prompts.
"Copy, paste, create." See [PRODUCT.md](PRODUCT.md) for brand/product context.

## Prompt publishing — mandatory guide

Before publishing or updating any prompt, read and follow
[`aiPromptpublishguide.md`](aiPromptpublishguide.md). It contains the required
four-image gallery workflow, per-request identity authorization rules, 2+2
identity/fictional variation mix, SEO metadata standards, agent API sequence,
and production verification checklist.

## Instagram + Facebook prompt posts — mandatory guide

When a user asks to publish a Free Prompt Base prompt URL on Instagram, read and
follow [`instagramPostGuide.md`](instagramPostGuide.md). An Instagram publish
request authorizes a paired post to the allowlisted Facebook Page by default
unless the user explicitly says Instagram only. The guide defines the reusable
source-gallery + two-slide media set, platform-specific SEO captions, CDN
upload, a custom Facebook creative adaptation using the verified images,
Instagram Automator job contract, Facebook Page API sequence, idempotent
recovery, and live verification on both platforms.

## SEO — keywords we are targeting (read before SEO/content work)

The site's keyword strategy lives in [`seo/`](seo/). **Treat these as the source of truth**
for what each page should rank for:

- [`seo/keyword-research.md`](seo/keyword-research.md) — seed keywords, clusters,
  volumes, difficulty, trends, and strategy.
- [`seo/tracklist.md`](seo/tracklist.md) — the keyword → page (`/tag/<slug>`) mapping.
  One primary keyword per page.

**The short version:**
1. **Nano Banana** cluster — our breakout growth topic (`nano banana prompt`, `nano banana ai`).
   High volume, high difficulty. Flagship page: `/tag/nano-banana-prompt`.
2. **Gemini AI photo prompt (copy-paste)** cluster — low difficulty, on-brand, India-led.
   Highest ROI. Best target: `gemini ai photo prompt copy paste` (KD 26).
3. **`free ai prompts`** — evergreen brand anchor for the homepage.

Audience for the *prompt* terms is **India / SE Asia** — when researching them in
SE Ranking, use the `in` database (use `us` for the broad "nano banana" head terms).

## Where things live
- Tag landing pages: data in `src/data/tags.ts`, articles in `src/data/tag-articles/<slug>.json`, rendered via `src/components/KeywordLanding.astro`.
- Categories: `src/data/categories.ts` (`images`).
- Prompts/content consumed through `src/lib/prompts.ts` (D1 swap kept isolated).

## When adding a new keyword/page
1. Add the keyword + page to `seo/tracklist.md` with its primary keyword and cluster.
2. Add the tag to `src/data/tags.ts` and an article JSON under `src/data/tag-articles/`.
3. Put the primary keyword in the H1, first paragraph, and meta description.
