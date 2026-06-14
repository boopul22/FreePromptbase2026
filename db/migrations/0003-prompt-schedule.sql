-- Scheduled publishing for prompts.
-- Apply ONCE:
--   wrangler d1 execute freepromptbase-com --remote --file=db/migrations/0003-prompt-schedule.sql
-- (use --local for the local dev database)
--
-- Additive + nullable: existing rows get publish_at = NULL, which means "live
-- now" (unchanged behavior). A prompt is publicly visible only when
--   status = 'approved' AND (publish_at IS NULL OR publish_at <= datetime('now'))
-- so a "scheduled" prompt is simply approved with a future publish_at. Stored as
-- canonical UTC 'YYYY-MM-DD HH:MM:SS' so the <= datetime('now') comparison is
-- lexically correct. No cron needed — the gate is evaluated per request.

ALTER TABLE prompts ADD COLUMN publish_at TEXT;
CREATE INDEX IF NOT EXISTS idx_prompts_publish_at ON prompts(publish_at);
