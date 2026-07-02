-- Copy tracking for the "Copy prompt" button.
-- Apply ONCE:
--   wrangler d1 execute freepromptbase-com --remote --file=db/migrations/0009-prompt-copy-count.sql
-- (use --local for the local dev database)
--
-- Adds a denormalized total copy counter to prompts. Individual copy events are
-- recorded in the existing prompt_events table with kind='copy' (deduped to one
-- per actor per prompt per minute by the /api/prompts/[slug]/copy endpoint so
-- button mashing can't inflate the numbers). The existing
-- idx_events_kind_created index serves the admin stats windowed queries.

ALTER TABLE prompts ADD COLUMN copy_count INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_prompts_copy_count ON prompts(copy_count);
