-- Remove the random uniqueness suffixes from the 6 duplicate-submission slugs
-- (2026-06-30). New rule (also enforced in code via uniqueSlug()): when a keyword
-- slug is taken, use the smallest numeric suffix (base, base-2, base-3, …) instead
-- of a random code. Same keyword, clean short slug.
-- defer_foreign_keys lets us update the one referencing prompt_events row in the
-- same batch (only couple-prompt-vac1w6 had an event; all saves/likes are 0).
PRAGMA defer_foreign_keys = true;

UPDATE prompts SET slug='couple-prompt-2' WHERE slug='couple-prompt-bacer6';
UPDATE prompts SET slug='couple-prompt-3' WHERE slug='couple-prompt-bgmswx';
UPDATE prompts SET slug='couple-prompt-4' WHERE slug='couple-prompt-fsvoel';
UPDATE prompts SET slug='couple-prompt-5' WHERE slug='couple-prompt-vac1w6';
UPDATE prompt_events SET prompt_slug='couple-prompt-5' WHERE prompt_slug='couple-prompt-vac1w6';

UPDATE prompts SET slug='pixels-in-motion-prompt-2' WHERE slug='pixels-in-motion-prompt-hq9xiu';
UPDATE prompts SET slug='pixels-in-motion-prompt-3' WHERE slug='pixels-in-motion-prompt-p410z5';
