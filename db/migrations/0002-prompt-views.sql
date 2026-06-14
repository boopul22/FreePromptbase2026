-- View tracking + view-driven "Prompt of the Day".
-- Apply ONCE:
--   wrangler d1 execute freepromptbase-com --remote --file=db/migrations/0002-prompt-views.sql
-- (use --local for the local dev database)
--
-- Adds a denormalized total view counter to prompts. Individual view events are
-- recorded in the existing prompt_events table with kind='view' (deduped to one
-- per actor per prompt per 24h by the /api/prompts/[slug]/view endpoint), which
-- powers the trailing-window ranking behind Prompt of the Day. The existing
-- idx_events_kind_created index already serves that windowed query.

ALTER TABLE prompts ADD COLUMN view_count INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_prompts_view_count ON prompts(view_count);
