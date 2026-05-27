-- Non-destructive migration for author profiles + prompt submission workflow.
-- Apply ONCE:
--   wrangler d1 execute freepromptbase-com --remote --file=db/migrations/0001-author-profiles-and-submissions.sql
-- (use --local for the local dev database)
--
-- All adds are nullable or have a default, so existing rows keep working.
-- A separate UNIQUE INDEX is created for username because SQLite ALTER TABLE
-- doesn't allow adding a UNIQUE column to an existing table.

ALTER TABLE users ADD COLUMN username TEXT;
ALTER TABLE users ADD COLUMN bio TEXT;
ALTER TABLE users ADD COLUMN twitter TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);

ALTER TABLE prompts ADD COLUMN status TEXT NOT NULL DEFAULT 'approved';
ALTER TABLE prompts ADD COLUMN submitted_by TEXT;
ALTER TABLE prompts ADD COLUMN submitted_at TEXT;
ALTER TABLE prompts ADD COLUMN reviewed_by TEXT;
ALTER TABLE prompts ADD COLUMN reviewed_at TEXT;
ALTER TABLE prompts ADD COLUMN rejection_reason TEXT;
CREATE INDEX IF NOT EXISTS idx_prompts_status_date ON prompts(status, date);
CREATE INDEX IF NOT EXISTS idx_prompts_submitted_by ON prompts(submitted_by);
