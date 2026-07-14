-- Descriptive-unique slug rename (2026-07-13). Same rule as 2026-07-03/05/07/12: keep the MAIN
-- KEYWORD at the START, make it unique with a short DESCRIPTIVE word from the prompt's content —
-- never a number, never a random code. These 6 came in with GENERIC head-term slugs (`prompt`,
-- `women-image`, `fashion-portrait`, `black-and-white-portrait`, `indian-couple-image`,
-- `couple-paradise-prompt`) which are too broad to rank and collide conceptually with our tag
-- pages. 3 of them (women-image, indian-couple-image, fashion-portrait) had already gone live
-- earlier today, but all 6 have view_count=0, copy_count=0 and no Pinterest export, so no
-- inbound links are lost.
-- defer_foreign_keys lets us update referencing prompt_events/saves/likes in the same batch.
PRAGMA defer_foreign_keys = true;

-- B&W editorial woman, sheer mesh turtleneck, split black/white backdrop, medium-format film
UPDATE prompts       SET slug='black-and-white-women-portrait-prompt' WHERE slug='women-image';
UPDATE prompt_events SET prompt_slug='black-and-white-women-portrait-prompt' WHERE prompt_slug='women-image';
UPDATE prompt_saves  SET prompt_slug='black-and-white-women-portrait-prompt' WHERE prompt_slug='women-image';
UPDATE prompt_likes  SET prompt_slug='black-and-white-women-portrait-prompt' WHERE prompt_slug='women-image';

-- Indian couple, red silk saree + gold zari, vine-draped stone wall, golden-hour pre-wedding
UPDATE prompts       SET slug='couple-prompt-red-saree' WHERE slug='indian-couple-image';
UPDATE prompt_events SET prompt_slug='couple-prompt-red-saree' WHERE prompt_slug='indian-couple-image';
UPDATE prompt_saves  SET prompt_slug='couple-prompt-red-saree' WHERE prompt_slug='indian-couple-image';
UPDATE prompt_likes  SET prompt_slug='couple-prompt-red-saree' WHERE prompt_slug='indian-couple-image';

-- Mid-stride walk through a sunlit classical colonnade, camp-collar shirt, pleated trousers
UPDATE prompts       SET slug='colonnade-fashion-portrait-prompt' WHERE slug='fashion-portrait';
UPDATE prompt_events SET prompt_slug='colonnade-fashion-portrait-prompt' WHERE prompt_slug='fashion-portrait';
UPDATE prompt_saves  SET prompt_slug='colonnade-fashion-portrait-prompt' WHERE prompt_slug='fashion-portrait';
UPDATE prompt_likes  SET prompt_slug='colonnade-fashion-portrait-prompt' WHERE prompt_slug='fashion-portrait';

-- Golden-hour blazer portrait, wayfarers, teal-and-amber sunset sky, cinematic rim light
UPDATE prompts       SET slug='golden-hour-blazer-portrait-prompt' WHERE slug='prompt';
UPDATE prompt_events SET prompt_slug='golden-hour-blazer-portrait-prompt' WHERE prompt_slug='prompt';
UPDATE prompt_saves  SET prompt_slug='golden-hour-blazer-portrait-prompt' WHERE prompt_slug='prompt';
UPDATE prompt_likes  SET prompt_slug='golden-hour-blazer-portrait-prompt' WHERE prompt_slug='prompt';

-- Low-key B&W studio portrait, round wire glasses, fist at the jaw, pure black backdrop
UPDATE prompts       SET slug='black-and-white-glasses-portrait-prompt' WHERE slug='black-and-white-portrait';
UPDATE prompt_events SET prompt_slug='black-and-white-glasses-portrait-prompt' WHERE prompt_slug='black-and-white-portrait';
UPDATE prompt_saves  SET prompt_slug='black-and-white-glasses-portrait-prompt' WHERE prompt_slug='black-and-white-portrait';
UPDATE prompt_likes  SET prompt_slug='black-and-white-glasses-portrait-prompt' WHERE prompt_slug='black-and-white-portrait';

-- Clifftop travel selfie over a turquoise ocean (Nusa Penida-style), matching white linen
UPDATE prompts       SET slug='couple-prompt-cliff-selfie' WHERE slug='couple-paradise-prompt';
UPDATE prompt_events SET prompt_slug='couple-prompt-cliff-selfie' WHERE prompt_slug='couple-paradise-prompt';
UPDATE prompt_saves  SET prompt_slug='couple-prompt-cliff-selfie' WHERE prompt_slug='couple-paradise-prompt';
UPDATE prompt_likes  SET prompt_slug='couple-prompt-cliff-selfie' WHERE prompt_slug='couple-paradise-prompt';
