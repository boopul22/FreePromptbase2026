-- Blog/news article comments (logged-in community discussion).
-- Apply ONCE:
--   wrangler d1 execute freepromptbase-com --remote --file=db/migrations/0023-post-comments.sql
-- (use --local for the local dev database)

CREATE TABLE IF NOT EXISTS post_comments (
	id          TEXT PRIMARY KEY,
	post_id     TEXT NOT NULL,
	user_id     TEXT NOT NULL,
	parent_id   TEXT,
	body        TEXT NOT NULL,
	status      TEXT NOT NULL DEFAULT 'visible',  -- 'visible' | 'hidden' | 'deleted'
	created_at  TEXT NOT NULL DEFAULT (datetime('now')),
	updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_post_comments_post_status_created
	ON post_comments(post_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_post_comments_user_id
	ON post_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_parent_id
	ON post_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_created_at
	ON post_comments(created_at);
