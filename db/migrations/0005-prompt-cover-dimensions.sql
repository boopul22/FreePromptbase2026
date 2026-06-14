-- Cover image intrinsic dimensions — eliminates layout shift (CLS) on the home
-- masonry and detail page by letting the browser reserve the exact box before
-- the image loads, while keeping each cover's natural aspect ratio.
-- Apply ONCE:
--   wrangler d1 execute freepromptbase-com --remote --file=db/migrations/0005-prompt-cover-dimensions.sql
-- (use --local for the local dev database)
--
-- Additive + nullable: rows without dimensions just render as before (some CLS)
-- until backfilled / re-saved.

ALTER TABLE prompts ADD COLUMN cover_w INTEGER;
ALTER TABLE prompts ADD COLUMN cover_h INTEGER;
