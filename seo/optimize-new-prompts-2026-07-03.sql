-- SEO pass for the 7 renamed duplicate prompts (2026-07-03) — all approved + scheduled,
-- all had EMPTY description/how_to_use/tags. Touches ONLY SEO fields: title, description
-- (meta), how_to_use (rendered body), tags. prompt_text is NEVER modified.
-- Keyword targeting per seo/keyword-research.md + seo/tracklist.md: couple prompt / gemini
-- couple photo prompt / gemini ai photo prompt (copy paste), Nano Banana, India/SE-Asia.
-- Descriptions are structurally unique (no shared boilerplate). Backup of prior (empty)
-- values: seo/new-prompts-backup-2026-07-03.json. Slugs renamed in rename-descriptive-slugs-2026-07-03.sql.

-- ===== Couple: golden hour back-hug (title already set on 2026-06-30) =====
UPDATE prompts SET description='Gemini AI couple photo prompt — a golden-hour portrait with the woman hugging the man from behind in cozy knit and suede, warm film grade. Copy, paste in Nano Banana (Gemini) & ChatGPT.', how_to_use='Upload one clear couple photo where both faces show, then copy-paste this golden hour couple prompt into Nano Banana (Gemini) or ChatGPT. A 4:5 vertical frame suits the back-hug pose — re-run once if the warm amber grade washes out the faces.', tags='["ai photo prompt","gemini prompt","couple prompt","cinematic prompt","aesthetic prompt"]' WHERE slug='couple-prompt-golden-hour';

-- ===== Couple: South Asian wheat field =====
UPDATE prompts SET title='Wheat Field Couple – Gemini AI Photo Prompt', description='Gemini AI couple photo prompt — a South Asian couple in a golden wheat field at sunset, the woman in a red embroidered anarkali. Copy, paste in Nano Banana (Gemini) & ChatGPT.', how_to_use='Upload one clear couple photo, then copy-paste this wheat-field couple prompt into Nano Banana (Gemini) or ChatGPT. Keep both faces visible; a vertical 4:5 or 9:16 frame captures the tall wheat and golden sunset best.', tags='["ai photo prompt","gemini prompt","couple prompt","indian aesthetic prompt","nature prompt"]' WHERE slug='couple-prompt-wheat-field';

-- ===== Couple: daisy meadow embrace =====
UPDATE prompts SET title='Daisy Meadow Couple – Gemini AI Photo Prompt', description='Gemini AI couple photo prompt — a dreamy cottagecore embrace in a golden-hour wildflower meadow with a daisy-braided crown. Copy, paste in Nano Banana (Gemini) & ChatGPT.', how_to_use='Upload one clear couple photo, then copy-paste this couple prompt into Nano Banana (Gemini) or ChatGPT. Keep both faces visible; a vertical 4:5 frame captures the meadow, distant mountains, and soft golden light best.', tags='["ai photo prompt","gemini prompt","couple prompt","aesthetic prompt","nature prompt"]' WHERE slug='couple-prompt-daisy-meadow';

-- ===== Couple: antique doorway =====
UPDATE prompts SET title='Antique Door Couple – Gemini AI Photo Prompt', description='Gemini AI couple photo prompt — a candid engagement portrait at an antique European doorway draped in bougainvillea, fingertips touching. Copy, paste in Nano Banana (Gemini) & ChatGPT.', how_to_use='Upload one clear couple photo where both faces show, then copy-paste this couple prompt into Nano Banana (Gemini) or ChatGPT. A full-body vertical frame keeps the doorway and cascading flowers in shot — re-run if a face drifts.', tags='["ai photo prompt","gemini prompt","couple prompt","aesthetic prompt","editorial prompt"]' WHERE slug='couple-prompt-antique-door';

-- ===== Couple: old-town cobblestone dance =====
UPDATE prompts SET title='Old Town Dance Couple – Gemini AI Photo Prompt', description='Gemini AI couple photo prompt — a joyful golden-hour dance on a rain-wet cobblestone street with a glowing mosque behind. Copy, paste in Nano Banana (Gemini) & ChatGPT.', how_to_use='Upload one clear couple photo, then copy-paste this couple prompt into Nano Banana (Gemini) or ChatGPT. A full-body vertical 2:3 frame captures the twirl and the old-town street — re-run once if motion blur softens the faces.', tags='["ai photo prompt","gemini prompt","couple prompt","cinematic prompt","travel prompt"]' WHERE slug='couple-prompt-old-town-dance';

-- ===== Pixels in motion: sky vortex (cliff) =====
UPDATE prompts SET title='Sky Vortex Portrait – Gemini AI Photo Prompt', description='Surreal Gemini AI photo prompt — stand on a mossy cliff facing an enormous glowing sky vortex of long-exposure clouds. Copy, paste your photo in Nano Banana (Gemini) & ChatGPT.', how_to_use='Copy-paste your photo into this sky-vortex gemini ai photo prompt in Nano Banana (Gemini) or ChatGPT. A back-view full-body photo blends best into the scene; keep a 3:4 vertical frame and re-run for a stronger spiral.', tags='["ai photo prompt","gemini prompt","cinematic prompt","surreal photo prompt","nature prompt"]' WHERE slug='pixels-in-motion-prompt-sky-vortex';

-- ===== Pixels in motion: tropical shore silhouette =====
UPDATE prompts SET title='Tropical Shore Silhouette – Gemini AI Photo Prompt', description='Cinematic Gemini AI photo prompt — a back-view silhouette on a tropical shoreline under swirling long-exposure sunset clouds. Copy, paste your photo in Nano Banana (Gemini) & ChatGPT.', how_to_use='Copy-paste your photo into this tropical-shore gemini ai photo prompt in Nano Banana (Gemini) or ChatGPT. A back-view or silhouette photo blends best into the sunset; keep a 3:4 vertical frame.', tags='["ai photo prompt","gemini prompt","cinematic prompt","surreal photo prompt","nature prompt"]' WHERE slug='pixels-in-motion-prompt-tropical-shore';
