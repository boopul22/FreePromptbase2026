# AGENTS.md — freepromptbase.com

Free Prompt Base — a free, browsable directory of ready-to-use AI prompts.
"Copy, paste, create." See [PRODUCT.md](PRODUCT.md) for brand/product context.

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
- Categories: `src/data/categories.ts` (`images`, `text`).
- Prompts/content consumed through `src/lib/prompts.ts` (D1 swap kept isolated).

## When adding a new keyword/page
1. Add the keyword + page to `seo/tracklist.md` with its primary keyword and cluster.
2. Add the tag to `src/data/tags.ts` and an article JSON under `src/data/tag-articles/`.
3. Put the primary keyword in the H1, first paragraph, and meta description.
