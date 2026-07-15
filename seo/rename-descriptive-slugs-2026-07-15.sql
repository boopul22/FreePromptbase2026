-- Descriptive-unique slug rename (2026-07-15). Same rule as 2026-07-03/05/07/12/13: keep the
-- MAIN KEYWORD at the START, make it unique with a short DESCRIPTIVE word from the prompt's
-- content — never a number, never a random code. These 9 scheduled prompts (publish_at
-- 2026-07-15..17) came in with random codes (couple-prompt-l26mob, couple-prompt-bwsgjr) or
-- generic head-term slugs (men-in-red-shirt, girl-with-flowers, ...). All 9 have view_count=0,
-- copy_count=0, so no inbound links are lost. couple-prompt-double-exposure was taken by an
-- earlier prompt, hence the -beach suffix. Backup: seo/new-prompts-backup-2026-07-15.json.
-- defer_foreign_keys lets us update referencing prompt_events/saves/likes in the same batch.
PRAGMA defer_foreign_keys = true;
-- night selfie, lipstick kiss marks on his cheek, cozy bedroom light
UPDATE prompts       SET slug='couple-prompt-kiss-marks' WHERE slug='couple-prompt-l26mob';
UPDATE prompt_events SET prompt_slug='couple-prompt-kiss-marks' WHERE prompt_slug='couple-prompt-l26mob';
UPDATE prompt_saves  SET prompt_slug='couple-prompt-kiss-marks' WHERE prompt_slug='couple-prompt-l26mob';
UPDATE prompt_likes  SET prompt_slug='couple-prompt-kiss-marks' WHERE prompt_slug='couple-prompt-l26mob';
-- sunflower bouquet in kraft paper, cobblestone European street, green knit sweater
UPDATE prompts       SET slug='sunflower-bouquet-portrait-prompt' WHERE slug='girl-with-flowers';
UPDATE prompt_events SET prompt_slug='sunflower-bouquet-portrait-prompt' WHERE prompt_slug='girl-with-flowers';
UPDATE prompt_saves  SET prompt_slug='sunflower-bouquet-portrait-prompt' WHERE prompt_slug='girl-with-flowers';
UPDATE prompt_likes  SET prompt_slug='sunflower-bouquet-portrait-prompt' WHERE prompt_slug='girl-with-flowers';
-- red shirt, ornate black baroque armchair, gold chain
UPDATE prompts       SET slug='red-shirt-baroque-portrait-prompt' WHERE slug='men-in-red-shirt';
UPDATE prompt_events SET prompt_slug='red-shirt-baroque-portrait-prompt' WHERE prompt_slug='men-in-red-shirt';
UPDATE prompt_saves  SET prompt_slug='red-shirt-baroque-portrait-prompt' WHERE prompt_slug='men-in-red-shirt';
UPDATE prompt_likes  SET prompt_slug='red-shirt-baroque-portrait-prompt' WHERE prompt_slug='men-in-red-shirt';
-- outdoor metal staircase, rose garden, sunglasses adjust
UPDATE prompts       SET slug='garden-staircase-portrait-prompt' WHERE slug='men-in-mint-t-shirt';
UPDATE prompt_events SET prompt_slug='garden-staircase-portrait-prompt' WHERE prompt_slug='men-in-mint-t-shirt';
UPDATE prompt_saves  SET prompt_slug='garden-staircase-portrait-prompt' WHERE prompt_slug='men-in-mint-t-shirt';
UPDATE prompt_likes  SET prompt_slug='garden-staircase-portrait-prompt' WHERE prompt_slug='men-in-mint-t-shirt';
-- black blazer over white shirt, warm genuine smile, studio
UPDATE prompts       SET slug='black-blazer-studio-portrait-prompt' WHERE slug='men-studio-portrait';
UPDATE prompt_events SET prompt_slug='black-blazer-studio-portrait-prompt' WHERE prompt_slug='men-studio-portrait';
UPDATE prompt_saves  SET prompt_slug='black-blazer-studio-portrait-prompt' WHERE prompt_slug='men-studio-portrait';
UPDATE prompt_likes  SET prompt_slug='black-blazer-studio-portrait-prompt' WHERE prompt_slug='men-studio-portrait';
-- laughing on wooden floor, giant B&W duotone portrait of herself on the wall behind
UPDATE prompts       SET slug='duotone-wall-portrait-prompt' WHERE slug='girl-with-shadow';
UPDATE prompt_events SET prompt_slug='duotone-wall-portrait-prompt' WHERE prompt_slug='girl-with-shadow';
UPDATE prompt_saves  SET prompt_slug='duotone-wall-portrait-prompt' WHERE prompt_slug='girl-with-shadow';
UPDATE prompt_likes  SET prompt_slug='duotone-wall-portrait-prompt' WHERE prompt_slug='girl-with-shadow';
-- golden-hour seaside cliff, hand on chest, warm smiles
UPDATE prompts       SET slug='couple-prompt-seaside-cliff' WHERE slug='couple-prompt-bwsgjr';
UPDATE prompt_events SET prompt_slug='couple-prompt-seaside-cliff' WHERE prompt_slug='couple-prompt-bwsgjr';
UPDATE prompt_saves  SET prompt_slug='couple-prompt-seaside-cliff' WHERE prompt_slug='couple-prompt-bwsgjr';
UPDATE prompt_likes  SET prompt_slug='couple-prompt-seaside-cliff' WHERE prompt_slug='couple-prompt-bwsgjr';
-- black three-piece suit, luxury sedan, parking garage, bouquet near hip
UPDATE prompts       SET slug='black-suit-bouquet-portrait-prompt' WHERE slug='men-with-flower';
UPDATE prompt_events SET prompt_slug='black-suit-bouquet-portrait-prompt' WHERE prompt_slug='men-with-flower';
UPDATE prompt_saves  SET prompt_slug='black-suit-bouquet-portrait-prompt' WHERE prompt_slug='men-with-flower';
UPDATE prompt_likes  SET prompt_slug='black-suit-bouquet-portrait-prompt' WHERE prompt_slug='men-with-flower';
-- forehead-to-forehead close-up blending into a golden-hour beach scene
UPDATE prompts       SET slug='couple-prompt-double-exposure-beach' WHERE slug='double-exposure-couple-image';
UPDATE prompt_events SET prompt_slug='couple-prompt-double-exposure-beach' WHERE prompt_slug='double-exposure-couple-image';
UPDATE prompt_saves  SET prompt_slug='couple-prompt-double-exposure-beach' WHERE prompt_slug='double-exposure-couple-image';
UPDATE prompt_likes  SET prompt_slug='couple-prompt-double-exposure-beach' WHERE prompt_slug='double-exposure-couple-image';
