-- Descriptive-unique slug rename (2026-07-03). NEW rule (supersedes the numeric-suffix
-- rule from rename-suffixed-slugs-2026-06-30.sql): when a keyword slug collides, keep the
-- MAIN KEYWORD at the START and make it unique with a short DESCRIPTIVE word drawn from the
-- prompt's content — never a number and never a random code. Same keyword, unique tail.
-- defer_foreign_keys lets us update the referencing prompt_events/saves/likes rows in the
-- same batch (a few view events exist; saves/likes are 0).
PRAGMA defer_foreign_keys = true;

-- couple prompts (base couple-prompt = Wildflower Meadow, unchanged)
UPDATE prompts       SET slug='couple-prompt-wheat-field'  WHERE slug='couple-prompt-2';
UPDATE prompt_events SET prompt_slug='couple-prompt-wheat-field'  WHERE prompt_slug='couple-prompt-2';
UPDATE prompt_saves  SET prompt_slug='couple-prompt-wheat-field'  WHERE prompt_slug='couple-prompt-2';
UPDATE prompt_likes  SET prompt_slug='couple-prompt-wheat-field'  WHERE prompt_slug='couple-prompt-2';

UPDATE prompts       SET slug='couple-prompt-daisy-meadow' WHERE slug='couple-prompt-3';
UPDATE prompt_events SET prompt_slug='couple-prompt-daisy-meadow' WHERE prompt_slug='couple-prompt-3';
UPDATE prompt_saves  SET prompt_slug='couple-prompt-daisy-meadow' WHERE prompt_slug='couple-prompt-3';
UPDATE prompt_likes  SET prompt_slug='couple-prompt-daisy-meadow' WHERE prompt_slug='couple-prompt-3';

UPDATE prompts       SET slug='couple-prompt-golden-hour'  WHERE slug='couple-prompt-5';
UPDATE prompt_events SET prompt_slug='couple-prompt-golden-hour'  WHERE prompt_slug='couple-prompt-5';
UPDATE prompt_saves  SET prompt_slug='couple-prompt-golden-hour'  WHERE prompt_slug='couple-prompt-5';
UPDATE prompt_likes  SET prompt_slug='couple-prompt-golden-hour'  WHERE prompt_slug='couple-prompt-5';

UPDATE prompts       SET slug='couple-prompt-antique-door'  WHERE slug='couple-prompt-qo0eik';
UPDATE prompt_events SET prompt_slug='couple-prompt-antique-door'  WHERE prompt_slug='couple-prompt-qo0eik';
UPDATE prompt_saves  SET prompt_slug='couple-prompt-antique-door'  WHERE prompt_slug='couple-prompt-qo0eik';
UPDATE prompt_likes  SET prompt_slug='couple-prompt-antique-door'  WHERE prompt_slug='couple-prompt-qo0eik';

UPDATE prompts       SET slug='couple-prompt-old-town-dance' WHERE slug='couple-prompt-zbg1lp';
UPDATE prompt_events SET prompt_slug='couple-prompt-old-town-dance' WHERE prompt_slug='couple-prompt-zbg1lp';
UPDATE prompt_saves  SET prompt_slug='couple-prompt-old-town-dance' WHERE prompt_slug='couple-prompt-zbg1lp';
UPDATE prompt_likes  SET prompt_slug='couple-prompt-old-town-dance' WHERE prompt_slug='couple-prompt-zbg1lp';

-- pixels in motion prompts (base pixels-in-motion-prompt unchanged)
UPDATE prompts       SET slug='pixels-in-motion-prompt-tropical-shore' WHERE slug='pixels-in-motion-prompt-2';
UPDATE prompt_events SET prompt_slug='pixels-in-motion-prompt-tropical-shore' WHERE prompt_slug='pixels-in-motion-prompt-2';
UPDATE prompt_saves  SET prompt_slug='pixels-in-motion-prompt-tropical-shore' WHERE prompt_slug='pixels-in-motion-prompt-2';
UPDATE prompt_likes  SET prompt_slug='pixels-in-motion-prompt-tropical-shore' WHERE prompt_slug='pixels-in-motion-prompt-2';

UPDATE prompts       SET slug='pixels-in-motion-prompt-sky-vortex' WHERE slug='pixels-in-motion-prompt-3';
UPDATE prompt_events SET prompt_slug='pixels-in-motion-prompt-sky-vortex' WHERE prompt_slug='pixels-in-motion-prompt-3';
UPDATE prompt_saves  SET prompt_slug='pixels-in-motion-prompt-sky-vortex' WHERE prompt_slug='pixels-in-motion-prompt-3';
UPDATE prompt_likes  SET prompt_slug='pixels-in-motion-prompt-sky-vortex' WHERE prompt_slug='pixels-in-motion-prompt-3';
