-- Last-updated timestamp for prompts (powers the "Updated" display + the
-- dateModified signal in structured data for Google).
-- Apply ONCE:
--   wrangler d1 execute freepromptbase-com --remote --file=db/migrations/0004-prompt-updated-at.sql
-- (use --local for the local dev database)
--
-- Additive. Backfills existing rows from created_at (or date) so dateModified is
-- never empty. Bumped to datetime('now') on every create / edit / publish.

ALTER TABLE prompts ADD COLUMN updated_at TEXT;
UPDATE prompts SET updated_at = COALESCE(created_at, date) WHERE updated_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_prompts_updated_at ON prompts(updated_at);
