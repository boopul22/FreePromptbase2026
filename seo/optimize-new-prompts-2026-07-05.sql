-- SEO pass for the 5 newly-scheduled couple prompts (2026-07-05) — all approved + scheduled
-- (future dates 2026-07-03..05), all had EMPTY description/how_to_use and empty tags ('[]').
-- Touches ONLY SEO fields: title, description (meta), how_to_use (rendered body), tags.
-- prompt_text is NEVER modified. Keyword targeting per seo/keyword-research.md +
-- seo/tracklist.md: couple prompt / gemini couple photo prompt / gemini ai photo prompt
-- (copy paste), Nano Banana, India/SE-Asia. Descriptions are structurally unique (no shared
-- boilerplate). Backup of prior (empty) values: seo/new-prompts-backup-2026-07-05.json.
-- Slugs renamed in rename-descriptive-slugs-2026-07-05.sql (run that FIRST).

-- ===== Couple: wildflower-meadow lift, golden hour =====
UPDATE prompts SET title='Wildflower Meadow Couple – Gemini AI Photo Prompt', description='Gemini AI couple photo prompt — a joyful golden-hour lift in a wild daisy-and-poppy meadow, her linen dress fluttering in the breeze. Copy, paste in Nano Banana (Gemini) & ChatGPT.', how_to_use='Upload one clear couple photo where both faces show, then copy-paste this couple prompt into Nano Banana (Gemini) or ChatGPT. A full-body vertical frame keeps the lift and the meadow in shot — re-run once if a face softens against the sun flare.', tags='["ai photo prompt","gemini prompt","couple prompt","aesthetic prompt","nature prompt"]' WHERE slug='couple-prompt-meadow-lift';

-- ===== Couple: formal double-exposure, foreheads touching =====
UPDATE prompts SET title='Double Exposure Couple – Gemini AI Photo Prompt', description='Gemini AI couple photo prompt — an editorial double-exposure portrait in formal black attire, foreheads touching with a ghosted overlay behind. Copy, paste in Nano Banana (Gemini) & ChatGPT.', how_to_use='Upload one clear couple photo where both faces show, then copy-paste this couple prompt into Nano Banana (Gemini) or ChatGPT. A vertical 9:16 frame suits the layered pre-kiss pose — re-run if the faded background overlay covers the faces.', tags='["ai photo prompt","gemini prompt","couple prompt","editorial prompt","cinematic prompt"]' WHERE slug='couple-prompt-double-exposure';

-- ===== Couple: lying in tall grass, golden hour engagement =====
UPDATE prompts SET title='Tall Grass Couple – Gemini AI Photo Prompt', description='Gemini AI couple photo prompt — a candid engagement shot lying face-to-face in tall golden grass, warm film tones and soft bokeh. Copy, paste in Nano Banana (Gemini) & ChatGPT.', how_to_use='Upload one clear couple photo, then copy-paste this couple prompt into Nano Banana (Gemini) or ChatGPT. Keep both faces visible; a vertical 4:5 frame captures the tall grass in the foreground and the golden-hour bokeh behind.', tags='["ai photo prompt","gemini prompt","couple prompt","aesthetic prompt","nature prompt"]' WHERE slug='couple-prompt-tall-grass';

-- ===== Couple: vintage park bench beside a lake =====
UPDATE prompts SET title='Park Bench Couple – Gemini AI Photo Prompt', description='Gemini AI couple photo prompt — a vintage period-drama portrait on a lakeside park bench at golden hour, cottagecore linen and lace. Copy, paste in Nano Banana (Gemini) & ChatGPT.', how_to_use='Upload one clear couple photo where both faces show, then copy-paste this couple prompt into Nano Banana (Gemini) or ChatGPT. A waist-up vertical frame keeps the bench, lake, and warm autumn tones in shot — re-run once if the vintage grade dulls the faces.', tags='["ai photo prompt","gemini prompt","couple prompt","aesthetic prompt","editorial prompt"]' WHERE slug='couple-prompt-park-bench';

-- ===== Couple: painterly billowing veil/saree, bindi =====
UPDATE prompts SET title='Saree Veil Couple – Gemini AI Photo Prompt', description='Gemini AI couple photo prompt — a painterly, intimate portrait with a billowing veil and dappled golden light, warm amber and terracotta tones. Copy, paste in Nano Banana (Gemini) & ChatGPT.', how_to_use='Upload one clear couple photo, then copy-paste this couple prompt into Nano Banana (Gemini) or ChatGPT. A vertical portrait frame suits the low upward angle and the draped veil — re-run once if the painterly style softens the likeness.', tags='["ai photo prompt","gemini prompt","couple prompt","indian aesthetic prompt","cinematic prompt"]' WHERE slug='couple-prompt-saree-veil';
