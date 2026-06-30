# Optimized Prompts Tracker

Which prompt pages have had their SEO pass (keyword-targeted **title** + unique **meta
description** + **how_to_use**). Update this whenever a prompt is optimized or a new one
is added. See [keyword-research.md](keyword-research.md) and [tracklist.md](tracklist.md).

Legend: ✅ title · ✅ description (unique) · ✅ how_to_use

## Optimized — batch 2026-06-24 (all 48 then-approved prompts)

Title + description + how_to_use done for every prompt below.

### Gemini photo prompts (40)
- [x] blue-hour-portrait-prompt
- [x] european-city-portrait-prompt
- [x] cinematic-football-world-cup-poster
- [x] valentines-day-couple-prompt
- [x] father-son-portrait-prompt
- [x] back-flash-night-portrait
- [x] black-and-white-suit-portrait
- [x] beach-couple-portrait-prompt
- [x] green-field-portrait-prompt
- [x] fisheye-floating-photo-prompt
- [x] movie-poster-portrait-prompt
- [x] black-and-white-horse-portrait
- [x] black-and-white-headshot-prompt
- [x] mirror-portrait-prompt
- [x] aesthetic-portrait-prompt
- [x] photographer-portrait-prompt
- [x] indian-couple-portrait-prompt
- [x] vintage-gentleman-portrait-prompt
- [x] autumn-fashion-portrait-prompt
- [x] color-gel-portrait-prompt
- [x] turquoise-fashion-portrait-prompt
- [x] footballer-portrait-prompt
- [x] winter-horse-portrait-prompt
- [x] man-with-flowers-portrait-prompt
- [x] bike-lifestyle-portrait-prompt
- [x] smoky-studio-portrait-prompt
- [x] urban-motion-portrait-prompt
- [x] film-noir-portrait-prompt
- [x] light-beam-portrait-prompt
- [x] monochrome-male-portrait-prompt
- [x] old-man-neon-portrait-prompt
- [x] yellow-saree-portrait-prompt
- [x] selective-color-portrait-prompt
- [x] chiaroscuro-portrait-prompt
- [x] floral-shirt-portrait-prompt
- [x] city-crosswalk-portrait-prompt
- [x] gothic-hall-portrait-prompt
- [x] snowy-night-portrait-prompt
- [x] hand-drawn-doodle-overlay
- [x] pixar-chibi-scrapbook-collage

### Style / ChatGPT generation prompts (8)
- [x] glassmorphism-prompt
- [x] lego-viral-prompt
- [x] minecraft-prompt
- [x] black-and-white-studio-prompt
- [x] pixel-style-prompt
- [x] motion-blur-prompt
- [x] dark-aesthetic-prompt
- [x] gta-vi-prompt

## Optimized — batch 2026-06-30 (10 new prompts approved after the first batch)

Title + unique description + how_to_use + tags. `prompt_text` left untouched.

### Gemini photo prompts
- [x] aesthetic-photography-prompt
- [x] anime-style-couple-prompt
- [x] black-and-white-couple-prompt — *(had empty description)*
- [x] couple-prompt — *(had empty description; targets "couple prompt")*
- [x] fashion-photography-prompt
- [x] fisheye-lens-prompt
- [x] graffiti-mural-portrait-prompt — *(title/desc/tags already done; added how_to_use)*
- [x] neon-ring-portrait-prompt — *(title/desc/tags already done; replaced misplaced how_to_use)*
- [x] pixel-stretch-prompt
- [x] pixels-in-motion-prompt

## Not yet optimized
- (none of the genuine prompts as of 2026-06-30)

### Deferred — likely duplicate/spam submissions (random suffixes, need dedup decision)
- [ ] couple-prompt-bacer6
- [ ] couple-prompt-bgmswx
- [ ] couple-prompt-fsvoel
- [ ] couple-prompt-vac1w6
- [ ] pixels-in-motion-prompt-hq9xiu
- [ ] pixels-in-motion-prompt-p410z5

> These 6 look like duplicate submissions of `couple-prompt` / `pixels-in-motion-prompt`
> with random slug suffixes. Cannibalization risk — decide keep vs delete before SEO work.

New prompts (submissions/drafts approved after 2026-06-24) land here un-optimized until
their SEO pass. To list approved prompts and eyeball new ones, run:

```
export CLOUDFLARE_ACCOUNT_ID=ab54ca2d01df4886aa0c3f240ace806d
npx wrangler d1 execute freepromptbase-com --remote \
  --command "SELECT slug, date FROM prompts WHERE status='approved' ORDER BY date DESC;"
```

Any slug here that isn't checked above still needs: keyword-targeted title, a unique
keyword-targeted meta description, and a how_to_use block.

## Applied via
- `seo/optimize-prompts-2026-06-24.sql` — initial titles + descriptions
- `seo/optimize-descriptions-v2-2026-06-24.sql` — unique-description rewrite (supersedes desc above)
- `seo/optimize-howto-2026-06-24.sql` — how_to_use sections
- `seo/optimize-new-prompts-2026-06-30.sql` — 2026-06-30 batch (title + desc + how_to_use + tags for 10 new prompts)
- Backups: `seo/prompts-title-desc-backup-2026-06-24.json`, `seo/prompts-howto-backup-2026-06-24.json`, `seo/new-prompts-backup-2026-06-30.json`
