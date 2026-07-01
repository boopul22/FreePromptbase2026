-- Descriptive-unique slug rename (2026-07-05). Same rule as 2026-07-03: keep the MAIN
-- KEYWORD (couple prompt) at the START, make it unique with a short DESCRIPTIVE word from
-- the prompt's content — never a number, never a random code. These 5 came in with random
-- code suffixes and are approved + scheduled (future dates 2026-07-03..05).
-- defer_foreign_keys lets us update referencing prompt_events/saves/likes in the same batch.
PRAGMA defer_foreign_keys = true;

-- joyful lift in a wildflower meadow, golden hour
UPDATE prompts       SET slug='couple-prompt-meadow-lift'    WHERE slug='couple-prompt-fytqnn';
UPDATE prompt_events SET prompt_slug='couple-prompt-meadow-lift'    WHERE prompt_slug='couple-prompt-fytqnn';
UPDATE prompt_saves  SET prompt_slug='couple-prompt-meadow-lift'    WHERE prompt_slug='couple-prompt-fytqnn';
UPDATE prompt_likes  SET prompt_slug='couple-prompt-meadow-lift'    WHERE prompt_slug='couple-prompt-fytqnn';

-- formal-attire double-exposure, foreheads touching
UPDATE prompts       SET slug='couple-prompt-double-exposure' WHERE slug='couple-prompt-jkbbuq';
UPDATE prompt_events SET prompt_slug='couple-prompt-double-exposure' WHERE prompt_slug='couple-prompt-jkbbuq';
UPDATE prompt_saves  SET prompt_slug='couple-prompt-double-exposure' WHERE prompt_slug='couple-prompt-jkbbuq';
UPDATE prompt_likes  SET prompt_slug='couple-prompt-double-exposure' WHERE prompt_slug='couple-prompt-jkbbuq';

-- lying on stomachs in tall grass, golden hour engagement
UPDATE prompts       SET slug='couple-prompt-tall-grass'     WHERE slug='couple-prompt-pmqefn';
UPDATE prompt_events SET prompt_slug='couple-prompt-tall-grass'     WHERE prompt_slug='couple-prompt-pmqefn';
UPDATE prompt_saves  SET prompt_slug='couple-prompt-tall-grass'     WHERE prompt_slug='couple-prompt-pmqefn';
UPDATE prompt_likes  SET prompt_slug='couple-prompt-tall-grass'     WHERE prompt_slug='couple-prompt-pmqefn';

-- vintage park bench beside a lake, cottagecore
UPDATE prompts       SET slug='couple-prompt-park-bench'     WHERE slug='couple-prompt-uagtso';
UPDATE prompt_events SET prompt_slug='couple-prompt-park-bench'     WHERE prompt_slug='couple-prompt-uagtso';
UPDATE prompt_saves  SET prompt_slug='couple-prompt-park-bench'     WHERE prompt_slug='couple-prompt-uagtso';
UPDATE prompt_likes  SET prompt_slug='couple-prompt-park-bench'     WHERE prompt_slug='couple-prompt-uagtso';

-- painterly billowing veil/saree, bindi, golden-hour
UPDATE prompts       SET slug='couple-prompt-saree-veil'     WHERE slug='couple-prompt-ulsvee';
UPDATE prompt_events SET prompt_slug='couple-prompt-saree-veil'     WHERE prompt_slug='couple-prompt-ulsvee';
UPDATE prompt_saves  SET prompt_slug='couple-prompt-saree-veil'     WHERE prompt_slug='couple-prompt-ulsvee';
UPDATE prompt_likes  SET prompt_slug='couple-prompt-saree-veil'     WHERE prompt_slug='couple-prompt-ulsvee';
