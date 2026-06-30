-- SEO pass for the 10 new approved prompts added after the 2026-06-24 batch (2026-06-30).
-- Touches ONLY SEO fields: title, description (meta-only), how_to_use (rendered body), tags.
-- prompt_text is NEVER modified — the copy-paste prompt stays exactly as the author wrote it.
-- Keyword targeting per seo/keyword-research.md + seo/tracklist.md: Gemini AI photo prompt
-- (copy paste), Nano Banana, India/SE-Asia audience. Descriptions are structurally unique.
-- Backup of prior values: seo/new-prompts-backup-2026-06-30.json
-- Apply: wrangler d1 execute freepromptbase-com --remote --command "$(grep '^UPDATE' seo/optimize-new-prompts-2026-06-30.sql)"

-- ===== Aesthetic photography =====
UPDATE prompts SET title='Aesthetic Photography – Gemini AI Photo Prompt', description='Aesthetic Gemini AI photo prompt — place yourself in a London sunflower field with golden-hour light and giant bees. Copy, paste your photo in Nano Banana (Gemini) & ChatGPT.', how_to_use='Copy the prompt, upload a clear full-body photo, and run this aesthetic gemini ai photo prompt (copy paste) in Gemini''s Nano Banana or ChatGPT. A vertical 4:5 frame keeps the sunflower field and London landmarks in shot — re-run once if the golden light looks flat.', tags='["ai photo prompt","gemini prompt","aesthetic prompt","portrait prompt","cinematic prompt"]' WHERE slug='aesthetic-photography-prompt';

-- ===== Anime style couple =====
UPDATE prompts SET title='Anime Style Couple – Gemini AI Photo Prompt', description='Gemini AI couple photo prompt — turn two photos into a romantic anime-realism illustration in traditional Indian outfits. Copy, paste in Nano Banana (Gemini) & ChatGPT.', how_to_use='Upload two clear face photos (one for each person), then copy-paste this gemini couple photo prompt into Nano Banana (Gemini) or ChatGPT. Keep both faces sharp and well-lit so the anime-style likeness stays accurate, and re-run if a face drifts.', tags='["ai photo prompt","gemini prompt","couple prompt","anime prompt","aesthetic prompt"]' WHERE slug='anime-style-couple-prompt';

-- ===== Black & white couple (was empty description) =====
UPDATE prompts SET title='Black & White Couple Portrait – Gemini AI Photo Prompt', description='Gemini AI couple photo prompt — turn your photo into a black-and-white fine-art portrait of a man embracing a woman from behind in elegant black outfits. Copy, paste in Nano Banana (Gemini).', how_to_use='Use one clear couple photo where both faces show, then copy-paste this black-and-white gemini couple photo prompt into Nano Banana (Gemini) or ChatGPT. A 4:5 vertical frame suits the studio embrace — re-run once if the faces drift.', tags='["ai photo prompt","gemini prompt","couple prompt","portrait prompt","cinematic prompt"]' WHERE slug='black-and-white-couple-prompt';

-- ===== Couple prompt (was empty description) — targets "couple prompt" =====
UPDATE prompts SET title='Couple Prompt (Wildflower Meadow) – Gemini AI Photo', description='Free couple prompt for Gemini AI — turn your photo into a couple running through a wildflower meadow in cottagecore style. Copy, paste in Nano Banana (Gemini) & ChatGPT.', how_to_use='Upload one clear couple photo, then copy-paste this couple prompt into Nano Banana (Gemini) or ChatGPT. Keep both faces visible; a vertical 4:5 or 9:16 frame captures the meadow and the candid motion best.', tags='["ai photo prompt","gemini prompt","couple prompt","aesthetic prompt","nature prompt"]' WHERE slug='couple-prompt';

-- ===== Fashion photography =====
UPDATE prompts SET title='Fashion Photography – Gemini AI Photo Prompt', description='Editorial fashion Gemini AI photo prompt — a top-down shot of a man on grass surrounded by scattered photo prints of himself. Copy, paste your photo in Nano Banana (Gemini) & ChatGPT.', how_to_use='Copy-paste your photo into this fashion gemini ai photo prompt in Nano Banana (Gemini) or ChatGPT. Use a few clear photos of the same person so the scattered prints match the face; a vertical frame suits the overhead composition.', tags='["ai photo prompt","gemini prompt","fashion prompt","men portrait prompt","aesthetic prompt"]' WHERE slug='fashion-photography-prompt';

-- ===== Fisheye lens portrait =====
UPDATE prompts SET title='Fisheye Lens Portrait – Gemini AI Photo Prompt', description='Surreal fisheye Gemini AI photo prompt — place yourself in a brutalist spiral staircase with Escher-style clones and barrel distortion. Copy, paste in Nano Banana (Gemini) & ChatGPT.', how_to_use='Copy-paste your photo into this fisheye gemini ai photo prompt in Nano Banana (Gemini) or ChatGPT. A full-body photo reads best for the wide-angle distortion; keep a vertical frame and re-run if the perspective looks flat.', tags='["ai photo prompt","gemini prompt","fisheye prompt","men portrait prompt","surreal photo prompt"]' WHERE slug='fisheye-lens-prompt';

-- ===== Graffiti mural portrait (title/desc/tags already optimized — add how_to_use only) =====
UPDATE prompts SET how_to_use='Upload one clear photo and copy-paste this graffiti mural gemini ai photo prompt into Nano Banana (Gemini) or ChatGPT. A close-up, well-lit face works best for the street-art mural look; a 4:5 vertical frame keeps the flowers and light rays in shot.' WHERE slug='graffiti-mural-portrait-prompt';

-- ===== Neon ring portrait (title/desc/tags already optimized — replace misplaced how_to_use) =====
UPDATE prompts SET how_to_use='Upload one clear photo and copy-paste this neon ring gemini ai photo prompt into Nano Banana (Gemini) or ChatGPT. A head-and-shoulders shot sits best inside the glowing ring light; keep a 4:5 vertical frame and re-run if the neon color grading washes out the face.' WHERE slug='neon-ring-portrait-prompt';

-- ===== Pixel stretch effect =====
UPDATE prompts SET title='Pixel Stretch Effect – Gemini AI Photo Prompt', description='Viral pixel-stretch Gemini AI photo prompt — surround your subject with swirling vortex light streams and glowing clouds. Copy, paste in Nano Banana (Gemini) & ChatGPT.', how_to_use='Replace [SUBJECT] with your subject, then copy-paste this pixel stretch gemini ai photo prompt into Nano Banana (Gemini) or ChatGPT. A vertical portrait frame suits the vortex effect — re-run for stronger light streaks.', tags='["ai photo prompt","gemini prompt","pixel stretch prompt","cinematic prompt","surreal photo prompt"]' WHERE slug='pixel-stretch-prompt';

-- ===== Pixels in motion =====
UPDATE prompts SET title='Pixels in Motion – Gemini AI Photo Prompt', description='Cinematic Gemini AI photo prompt — a lakeside silhouette under surreal long-exposure cloud streaks at sunset. Copy, paste your photo in Nano Banana (Gemini) & ChatGPT.', how_to_use='Copy-paste your photo into this pixels-in-motion gemini ai photo prompt in Nano Banana (Gemini) or ChatGPT. A back-view or silhouette photo blends best into the sunset; keep a wide or 4:5 vertical frame.', tags='["ai photo prompt","gemini prompt","cinematic prompt","nature prompt","surreal photo prompt"]' WHERE slug='pixels-in-motion-prompt';

-- ===== Follow-up (2026-06-30): improved title on a deferred duplicate slug =====
-- couple-prompt-vac1w6 (golden-hour embrace, woman behind man) had the generic title
-- "couple prompt". Title only — desc/how_to_use/tags still pending a full pass.
UPDATE prompts SET title='Golden Hour Couple Portrait – Gemini AI Photo Prompt' WHERE slug='couple-prompt-vac1w6';
