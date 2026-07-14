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

## Optimized — batch 2026-07-03 (7 renamed duplicate slugs; all approved + scheduled)

Slugs first made descriptive (keyword-first + a **descriptive word** from the content, never
numbers or random codes — see `rename-descriptive-slugs-2026-07-03.sql`, supersedes the numeric
rename of 2026-06-30), then given a full SEO pass: keyword title + unique description +
how_to_use + tags (`optimize-new-prompts-2026-07-03.sql`). `prompt_text` untouched. All 7 had
EMPTY description/how_to_use/tags before this pass.

### Couple prompts (target "couple prompt" / "gemini couple photo prompt")
- [x] couple-prompt-golden-hour *(golden-hour back-hug)*
- [x] couple-prompt-wheat-field *(South Asian couple, golden wheat field)*
- [x] couple-prompt-daisy-meadow *(embrace in golden-hour meadow, daisy braid)*
- [x] couple-prompt-antique-door *(antique European doorway, bougainvillea)*
- [x] couple-prompt-old-town-dance *(dance on cobblestone street, old-town mosque)*

### Pixels-in-motion / surreal (target "gemini ai photo prompt")
- [x] pixels-in-motion-prompt-tropical-shore *(tropical shoreline, palm trees)*
- [x] pixels-in-motion-prompt-sky-vortex *(mossy mountain cliff, glowing sky vortex)*

## Optimized — batch 2026-07-05 (5 newly-scheduled couple prompts)

Same as the 2026-07-03 batch: random-code slugs first made descriptive (keyword-first +
descriptive word — see `rename-descriptive-slugs-2026-07-05.sql`), then a full SEO pass
(keyword title + unique description + how_to_use + tags — `optimize-new-prompts-2026-07-05.sql`).
`prompt_text` untouched. All 5 were approved + scheduled (future dates 2026-07-03..05) with
EMPTY description/how_to_use and empty tags (`[]`) before this pass.

### Couple prompts (target "couple prompt" / "gemini couple photo prompt")
- [x] couple-prompt-meadow-lift *(golden-hour lift in a wildflower/daisy meadow)* — was `couple-prompt-fytqnn`
- [x] couple-prompt-double-exposure *(formal black attire, ghosted double-exposure overlay)* — was `couple-prompt-jkbbuq`
- [x] couple-prompt-tall-grass *(lying face-to-face in tall golden grass, engagement)* — was `couple-prompt-pmqefn`
- [x] couple-prompt-park-bench *(vintage cottagecore portrait on a lakeside bench)* — was `couple-prompt-uagtso`
- [x] couple-prompt-saree-veil *(painterly billowing veil, bindi, amber/terracotta)* — was `couple-prompt-ulsvee`

## Optimized — batch 2026-07-07 (6 newly-approved couple prompts)

Same as the 2026-07-03/05 batches: random-code slugs first made descriptive (keyword-first +
descriptive word — see `rename-descriptive-slugs-2026-07-07.sql`), then a full SEO pass
(keyword title + unique description + how_to_use + tags — `optimize-new-prompts-2026-07-07.sql`).
`prompt_text` untouched. All 6 were approved (dates 2026-07-06..07) with EMPTY
description/how_to_use and empty tags (`[]`) before this pass. The 6th (`vintage-truck`) was
added by a submitter later the same day and folded into the same two SQL files.

### Couple prompts (target "couple prompt" / "gemini couple photo prompt")
- [x] couple-prompt-beach-dip *(golden-hour beach backward dip kiss, 35mm film)* — was `couple-prompt-87gdtu`
- [x] couple-prompt-mountain-piggyback *(shoulder-sit in a grassy mountain valley, cream knit)* — was `couple-prompt-dd0sig`
- [x] couple-prompt-beach-hair-kiss *(backlit sunset silhouette, kiss to top of her head)* — was `couple-prompt-gzhh3d`
- [x] couple-prompt-overhead-grass *(top-down flat-lay V-pose on grass, red tulip, gingham)* — was `couple-prompt-sfy4ue`
- [x] couple-prompt-tennis-court *(athleisure-luxury sit on a tennis court, rackets, sunglasses)* — was `couple-prompt-w3ybic`
- [x] couple-prompt-vintage-truck *(Americana dusk portrait leaning on a vintage pickup)* — was `couple-prompt-xzsbsw`

## Optimized — batch 2026-07-12 (15 newly-approved couple prompts, dates 2026-07-08..12)

Same as the 2026-07-03/05/07 batches: 13 random-code slugs first made descriptive
(keyword-first + descriptive word — see `rename-descriptive-slugs-2026-07-12.sql`; the other
2 already had descriptive slugs), then a full SEO pass (keyword title + unique description +
how_to_use + tags — `optimize-new-prompts-2026-07-12.sql`). `prompt_text` untouched. All 15
were approved (dates 2026-07-08..12) with EMPTY description/how_to_use and empty tags (`[]`)
before this pass. The last 2 (`clear-umbrella`, `carousel`) were added by submitters later
the same day and folded into the same two SQL files.

### Couple prompts (target "couple prompt" / "gemini couple photo prompt")
- [x] couple-prompt-luxury-car *(dusk lakeside, luxury convertible, black-tie editorial)* — was `couple-prompt-nspwe4`
- [x] romantic-couple-prompt *(vintage speakeasy billiards room, pool-table flirtation)* — slug already descriptive
- [x] vintage-editorial-couple-prompt *(1970s Moroccan riad terrace, mosaic wall, sepia film)* — slug already descriptive
- [x] couple-prompt-vintage-mirror *(ivory saree, earring at ornate mirror, admiring glance)* — was `couple-prompt-ixcel3`
- [x] couple-prompt-vespa-street *(old European town, cream Vespa, polka-dot romper)* — was `couple-prompt-nw3acr`
- [x] couple-prompt-yacht-deck *(sailing yacht bow at golden hour, white linen)* — was `couple-prompt-tqwlz3`
- [x] couple-prompt-rain-kiss *(golden-hour kiss in rain, hidden roses, pink scooter)* — was `couple-prompt-55aqxj`
- [x] couple-prompt-jasmine-anklet *(haveli archway, jasmine strand tied at her ankle)* — was `couple-prompt-pfztt2`
- [x] couple-prompt-saree-draping *(getting-ready bedroom, draping the mustard silk saree)* — was `couple-prompt-xeg00u`
- [x] couple-prompt-ferris-wheel *(carnival dip pose at dusk, illuminated ferris wheel)* — was `couple-prompt-7evkgu`
- [x] couple-prompt-kulhad-chai *(night ghat steps, kulhad chai, fairy lights)* — was `couple-prompt-f3ihua`
- [x] couple-prompt-haveli-door *(orange haveli door, fastening her clasp, marigolds)* — was `couple-prompt-hoeehg`
- [x] couple-prompt-sunflower *(backlit close-up, sunflower + carnation, interlaced hands)* — was `couple-prompt-tiyqfn`
- [x] couple-prompt-clear-umbrella *(sharing one clear umbrella in gentle garden rain)* — was `couple-prompt-qghtff`
- [x] couple-prompt-carousel *(vintage carousel at dusk, film-camera candid)* — was `couple-prompt-wxq2cl`

## Optimized — batch 2026-07-13 (6 newly-approved prompts, dates 2026-07-13..14)

Same shape as the 2026-07-03/05/07/12 batches, but the slug problem was different: these 6 came
in with **generic head-term slugs** rather than random codes — `prompt`, `women-image`,
`fashion-portrait`, `black-and-white-portrait`, `indian-couple-image`, `couple-paradise-prompt`.
Too broad to rank, and they collide conceptually with our tag pages. All 6 were renamed
keyword-first + descriptive word (`rename-descriptive-slugs-2026-07-13.sql`), then given a full
SEO pass (keyword title + unique description + how_to_use + tags —
`optimize-new-prompts-2026-07-13.sql`). `prompt_text` untouched. All 6 had EMPTY
description/how_to_use and empty tags (`[]`) before this pass.

The first 3 had **already gone live** earlier that day (publish_at 04:30–06:30 on 2026-07-13) —
renamed anyway, since all 6 had `view_count=0`, `copy_count=0` and no Pinterest export, so no
inbound links or impressions were lost. Nothing else in this repo maps old slugs → new, so
avoid renaming a prompt that has picked up traffic.

### Solo portraits (target "gemini ai photo prompt" / "portrait prompt")
- [x] black-and-white-women-portrait-prompt *(B&W editorial woman, sheer mesh turtleneck, split black/white backdrop)* — was `women-image`
- [x] colonnade-fashion-portrait-prompt *(mid-stride walk through a sunlit classical colonnade, street-style editorial)* — was `fashion-portrait`
- [x] golden-hour-blazer-portrait-prompt *(brown blazer + wayfarers, teal-and-amber sunset sky, cinematic rim light)* — was `prompt`
- [x] black-and-white-glasses-portrait-prompt *(low-key studio, round wire glasses, fist at the jaw, pure black backdrop)* — was `black-and-white-portrait`

### Couple prompts (target "couple prompt" / "gemini couple photo prompt")
- [x] couple-prompt-red-saree *(red silk saree + gold zari, vine-draped stone wall, golden-hour pre-wedding)* — was `indian-couple-image`
- [x] couple-prompt-cliff-selfie *(Nusa Penida-style clifftop travel selfie, turquoise ocean, matching white linen)* — was `couple-paradise-prompt`

## Not yet optimized
- (none of the approved/scheduled prompts as of 2026-07-13 — 0 approved prompts have an empty description or how_to_use)
- Minor: 8 style/ChatGPT prompts from the 2026-06-24 batch have empty `tags` (`[]`) but full title+desc+how_to_use — tags predate the 2026-06-30 tags workflow; low-priority backfill (still 8 as of 2026-07-13). They are: `lego-viral-prompt`, `pixel-style-prompt`, `minecraft-prompt`, `motion-blur-prompt`, `glassmorphism-prompt`, `black-and-white-studio-prompt`, `dark-aesthetic-prompt`, `gta-vi-prompt`.
- ~87 `draft` prompts (all dated 2026-06-05) remain un-optimized but are **not published/scheduled**; separate backlog.

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
- `seo/rename-descriptive-slugs-2026-07-03.sql` — renamed 7 duplicate slugs to keyword-first + descriptive word (no numbers/codes)
- `seo/optimize-new-prompts-2026-07-03.sql` — full SEO pass (title + desc + how_to_use + tags) for those 7; backup `seo/new-prompts-backup-2026-07-03.json`
- `seo/rename-descriptive-slugs-2026-07-05.sql` — renamed 5 random-code couple slugs to keyword-first + descriptive word
- `seo/optimize-new-prompts-2026-07-05.sql` — full SEO pass (title + desc + how_to_use + tags) for those 5; backup `seo/new-prompts-backup-2026-07-05.json`
- `seo/rename-descriptive-slugs-2026-07-07.sql` — renamed 6 random-code couple slugs to keyword-first + descriptive word
- `seo/optimize-new-prompts-2026-07-07.sql` — full SEO pass (title + desc + how_to_use + tags) for those 6; backup `seo/new-prompts-backup-2026-07-07.json`
- `seo/rename-descriptive-slugs-2026-07-12.sql` — renamed 13 random-code couple slugs to keyword-first + descriptive word
- `seo/optimize-new-prompts-2026-07-12.sql` — full SEO pass (title + desc + how_to_use + tags) for 15 new couple prompts; backup `seo/new-prompts-backup-2026-07-12.json`
- `seo/rename-descriptive-slugs-2026-07-13.sql` — renamed 6 generic head-term slugs (`prompt`, `women-image`, …) to keyword-first + descriptive word
- `seo/optimize-new-prompts-2026-07-13.sql` — full SEO pass (title + desc + how_to_use + tags) for those 6; backup `seo/new-prompts-backup-2026-07-13.json`
- Backups: `seo/prompts-title-desc-backup-2026-06-24.json`, `seo/prompts-howto-backup-2026-06-24.json`, `seo/new-prompts-backup-2026-06-30.json`
