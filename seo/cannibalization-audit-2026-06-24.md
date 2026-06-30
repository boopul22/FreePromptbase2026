# Keyword Cannibalization Audit — freepromptbase.com (2026-06-24)

Scope: 50 keyword tag pages (`src/data/tags.ts`, served at `/<slug>`) + 48 prompt pages
(also at `/<slug>`). Both types are indexable and in `sitemap.xml`.

## Root cause
1. **Shared URL namespace.** Tags and prompts both live at `/<slug>`. A prompt silently
   wins a slug collision, so a tag could vanish without warning. No live collision today,
   but it's a structural trap.
2. **Variant sprawl in tags.ts.** ~25 of 50 tags are word-order / synonym / modifier
   variants of one intent: *"gemini ai photo prompt."* They have near-identical titles,
   the same H1 template, and (because `matchTerms` rarely match real prompt tags) the
   **same fallback prompt grid**. The only differentiator is the per-slug article.
3. **Prompt-title homogenization (new, 2026-06-24).** All 40 Gemini photo prompts now end
   in "– Gemini AI Photo Prompt," so they also compete with each other and with the
   `/gemini-ai-photo-prompt` tag for the head term.

---

## Cannibalization groups

### GROUP 1 — "gemini ai photo prompt" core — SEVERITY: HIGH
Pages competing for one intent:
`gemini-ai-photo-prompt` · `ai-gemini-photo-prompt` · `gemini-ai-photo` ·
`gemini-photo-prompt` · `google-gemini-ai-photo-prompt` · `google-gemini-ai-photo` ·
`gemini-prompt-for-image-generation`
- **Overlap:** identical search intent, same fallback grid, same title pattern.
- **Impact:** Google splits link equity and impressions across 7 thin near-dupes, picks one
  semi-randomly per query, and may treat the set as doorway/thin content (sitewide quality drag).
- **Verdict:** Keep **`gemini-ai-photo-prompt`** as canonical hub (exact target phrase).
  Differentiate `gemini-ai-photo-editor` (tool intent) and the locale `gemini-ai-foto`.
  **Merge → 301** the pure reorders/subsets (`ai-gemini-photo-prompt`, `gemini-ai-photo`,
  `gemini-photo-prompt`, `google-gemini-ai-photo`, `google-gemini-ai-photo-prompt`) into the
  canonical, unless each gets a genuinely distinct article + matched grid.

### GROUP 2 — "copy paste / trending" modifiers — SEVERITY: HIGH
`gemini-ai-photo-prompt-copy-paste` (★ best target, 920 vol / KD 26) ·
`gemini-ai-prompt-copy-paste` · `gemini-ai-photo-prompt-copy-paste-trending` ·
`gemini-ai-photo-prompt-copy-paste-trending-boy` · `...-girl` ·
`trending-gemini-prompt` · `google-gemini-trending-photo-prompt`
- **Overlap:** `-copy-paste` vs `-copy-paste-trending` is the same intent + a filler word.
- **Impact:** dilutes our single most winnable term (KD 26). The trending duplicates steal
  internal links and crawl budget from the page we most want to rank.
- **Verdict:** Protect **`gemini-ai-photo-prompt-copy-paste`** as the priority page.
  `-trending-boy` / `-trending-girl` are real intent splits (gender) → **differentiate**
  (boy-specific vs girl-specific grids + copy). **Merge → 301** `-copy-paste-trending`,
  `gemini-ai-prompt-copy-paste`, `google-gemini-trending-photo-prompt` into the canonical.

### GROUP 3 — generic "gemini prompt" — SEVERITY: MEDIUM
`prompt-for-gemini-ai` (610 vol / KD 42) · `prompt-for-gemini` · `gemini-ai-prompt` ·
`ai-gemini-prompt` · `ai-gemini` · `gimini` (misspelling)
- **Impact:** 6 pages for one head term; equity split, none ranks well.
- **Verdict:** Canonical = **`prompt-for-gemini-ai`**. **Merge → 301** `prompt-for-gemini`,
  `gemini-ai-prompt`, `ai-gemini-prompt`, `ai-gemini`. Keep `gimini` only if it pulls typo
  traffic (else noindex); it's low risk because the SERP differs.

### GROUP 4 — nano banana — SEVERITY: MEDIUM (high stakes — our growth term)
`nano-banana-prompt` (flagship) · `nano-banana` · `nano-banana-ai` · `banana-prompt` ·
`banana-prompts` · `banana-prompt-xyz`
- **Overlap:** `banana-prompt` vs `banana-prompts` = singular/plural **exact duplicate**.
  `banana-prompt-xyz` looks like a junk/branded-competitor query.
- **Impact:** `nano-banana` (110K US) is too valuable to split. The duplicates leak equity
  from the flagship.
- **Verdict:** Keep `nano-banana-prompt`, `nano-banana`, `nano-banana-ai` (head vs prompt vs
  ai are distinct enough — differentiate clearly). **Merge → 301** `banana-prompts` into
  `banana-prompt`. **Noindex/remove** `banana-prompt-xyz` unless it has a real query behind it.

### GROUP 5 — couple — SEVERITY: LOW
`couple-prompt` · `couple-prompt-for-gemini-ai` · `gemini-couple-photo-prompt`
- **Verdict:** Mostly distinct (generic vs Gemini couple). Light overlap between the latter
  two → **differentiate** copy/grid; no merge needed.

### GROUP 6 — locale variants — SEVERITY: NONE (keep)
`gemini-ai-foto` (ID/PT) · `prompt-gemini` (Thai) · `prompt-gemini-ai-foto-sendiri` (ID)
- Different-language SERPs = not cannibalization. **Keep as-is.**

### GROUP 7 — thin / off-topic / junk — SEVERITY: quality drag, not cannibalization
- `add-2` ("add_2"): junk slug, no keyword → **remove / noindex now.**
- `openai-news`, `technology-news-today`: off-brand news intent, no matching prompts (pure
  fallback grid = doorway risk) → **noindex or build real content, or drop.**
- Creator/navigational (`mk-edit`, `prompt-wala`, `ai-prompt-razz-suman`,
  `ai-prompt-ghaus-editz`, `anup-sagar-prompt`, `prompt-by-vikas-editing`,
  `gemini-prompt-vercel-app`): each distinct (low cannibalization) but thin. Keep only if
  they convert; otherwise noindex to lift overall site quality.

### CROSS-TYPE — prompt pages vs the Gemini tag hub — SEVERITY: MEDIUM
- 40 prompt pages share the "– Gemini AI Photo Prompt" title tail and compete with the
  `/gemini-ai-photo-prompt` hub for the head term.
- **Impact:** mild dilution of the head term; but each prompt has unique scene content, so
  Google should map them to long-tail queries ("blue hour beach portrait gemini prompt").
- **Verdict:** **No merge.** Tag hub owns the head term; prompt pages own their long-tail.
  Keep the unique modifier front-loaded (already done). Optionally internal-link every photo
  prompt back to the `/gemini-ai-photo-prompt` hub to concentrate authority.

---

## Why this matters (ranking impact, general)
- **Equity split:** inbound links + internal links scatter across near-dupes, so no single
  URL reaches the authority threshold to rank.
- **Wrong-page selection:** Google picks one URL per query, often not your strongest; rankings
  flip between URLs (unstable positions, lower CTR).
- **Thin/doorway risk:** many tag pages render the same fallback grid; clusters of thin,
  templated pages targeting tiny query variants can trigger sitewide quality suppression.
- **Crawl budget:** ~25 redundant URLs dilute crawl/index focus away from money pages.

---

## Prioritized action plan
**P0 — stop the bleeding (this week)**
1. Pick one canonical per group (above) and **301-redirect** the merge-list slugs to it.
   Implement in the `[slug]` route (return a 301 for retired slugs → canonical) so old URLs
   keep their equity. Remove redirected slugs from `tags.ts`.
2. **Noindex/remove** junk: `add-2`, `banana-prompt-xyz`, and the off-brand news tags.
3. Add a slug-collision guard/log in the `[slug]` route so a future prompt slug can't silently
   bury a tag page.

**P1 — protect the money terms (this month)**
4. Make `gemini-ai-photo-prompt-copy-paste` (KD 26) and `gemini-ai-photo-prompt` genuinely
   distinct: unique articles, and **fix matched grids** so each shows different, relevant
   prompts (add real `matchTerms`/tags to prompts so the grid isn't the same fallback).
5. Differentiate the legit intent splits: `-trending-boy` vs `-trending-girl` (gendered grids),
   couple variants.
6. Internal-link the 40 photo prompt pages → the `/gemini-ai-photo-prompt` hub.

**P2 — consolidate the rest (ongoing)**
7. Collapse Group 3 generics into `prompt-for-gemini-ai`.
8. Merge `banana-prompts` → `banana-prompt`.
9. Audit thin creator/navigational tags; keep only those that earn clicks, noindex the rest.

**Validation:** after changes, confirm with Search Console (or SE Ranking's GSC import) that
each canonical owns its query and impressions consolidate rather than flip between URLs.
