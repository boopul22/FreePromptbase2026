-- Descriptive-unique slug rename (2026-07-07). Same rule as 2026-07-03/05: keep the MAIN
-- KEYWORD (couple prompt) at the START, make it unique with a short DESCRIPTIVE word from
-- the prompt's content — never a number, never a random code. These 5 came in with random
-- code suffixes and are approved (dates 2026-07-06..07).
-- defer_foreign_keys lets us update referencing prompt_events/saves/likes in the same batch.
PRAGMA defer_foreign_keys = true;

-- golden-hour beach, dramatic backward dip kiss, engagement ring, 35mm film
UPDATE prompts       SET slug='couple-prompt-beach-dip'        WHERE slug='couple-prompt-87gdtu';
UPDATE prompt_events SET prompt_slug='couple-prompt-beach-dip'        WHERE prompt_slug='couple-prompt-87gdtu';
UPDATE prompt_saves  SET prompt_slug='couple-prompt-beach-dip'        WHERE prompt_slug='couple-prompt-87gdtu';
UPDATE prompt_likes  SET prompt_slug='couple-prompt-beach-dip'        WHERE prompt_slug='couple-prompt-87gdtu';

-- mountain valley, woman perched piggyback on his shoulders, cream knit, overcast film
UPDATE prompts       SET slug='couple-prompt-mountain-piggyback' WHERE slug='couple-prompt-dd0sig';
UPDATE prompt_events SET prompt_slug='couple-prompt-mountain-piggyback' WHERE prompt_slug='couple-prompt-dd0sig';
UPDATE prompt_saves  SET prompt_slug='couple-prompt-mountain-piggyback' WHERE prompt_slug='couple-prompt-dd0sig';
UPDATE prompt_likes  SET prompt_slug='couple-prompt-mountain-piggyback' WHERE prompt_slug='couple-prompt-dd0sig';

-- golden-hour beach silhouette, man bent forward kissing top of her head, backlit rim light
UPDATE prompts       SET slug='couple-prompt-beach-hair-kiss'  WHERE slug='couple-prompt-gzhh3d';
UPDATE prompt_events SET prompt_slug='couple-prompt-beach-hair-kiss'  WHERE prompt_slug='couple-prompt-gzhh3d';
UPDATE prompt_saves  SET prompt_slug='couple-prompt-beach-hair-kiss'  WHERE prompt_slug='couple-prompt-gzhh3d';
UPDATE prompt_likes  SET prompt_slug='couple-prompt-beach-hair-kiss'  WHERE prompt_slug='couple-prompt-gzhh3d';

-- overhead top-down flat-lay, lying on grass in a V shape, heads meeting, red tulip, gingham
UPDATE prompts       SET slug='couple-prompt-overhead-grass'   WHERE slug='couple-prompt-sfy4ue';
UPDATE prompt_events SET prompt_slug='couple-prompt-overhead-grass'   WHERE prompt_slug='couple-prompt-sfy4ue';
UPDATE prompt_saves  SET prompt_slug='couple-prompt-overhead-grass'   WHERE prompt_slug='couple-prompt-sfy4ue';
UPDATE prompt_likes  SET prompt_slug='couple-prompt-overhead-grass'   WHERE prompt_slug='couple-prompt-sfy4ue';

-- tennis-court athleisure, sunglasses, rackets, influencer editorial
UPDATE prompts       SET slug='couple-prompt-tennis-court'     WHERE slug='couple-prompt-w3ybic';
UPDATE prompt_events SET prompt_slug='couple-prompt-tennis-court'     WHERE prompt_slug='couple-prompt-w3ybic';
UPDATE prompt_saves  SET prompt_slug='couple-prompt-tennis-court'     WHERE prompt_slug='couple-prompt-w3ybic';
UPDATE prompt_likes  SET prompt_slug='couple-prompt-tennis-court'     WHERE prompt_slug='couple-prompt-w3ybic';

-- vintage pickup truck on a rural road at dusk, Americana golden-hour film (added later same day)
UPDATE prompts       SET slug='couple-prompt-vintage-truck'    WHERE slug='couple-prompt-xzsbsw';
UPDATE prompt_events SET prompt_slug='couple-prompt-vintage-truck'    WHERE prompt_slug='couple-prompt-xzsbsw';
UPDATE prompt_saves  SET prompt_slug='couple-prompt-vintage-truck'    WHERE prompt_slug='couple-prompt-xzsbsw';
UPDATE prompt_likes  SET prompt_slug='couple-prompt-vintage-truck'    WHERE prompt_slug='couple-prompt-xzsbsw';
