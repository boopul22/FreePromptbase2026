-- Newsletter subscribers with self-managed double opt-in (synced to Brevo).
-- Apply ONCE:
--   wrangler d1 execute freepromptbase-com --remote --file=db/migrations/0006-newsletter-subscribers.sql
-- (use --local for the local dev database)
--
-- A signup inserts a 'pending' row + a confirmation email is sent (Brevo
-- transactional). Clicking the link flips the row to 'confirmed' and pushes the
-- contact to Brevo as a native, consented contact — so there is no cold list to
-- "import" later when you start sending campaigns. 'unsubscribed' rows are kept
-- for suppression + audit; they are never deleted on opt-out.

CREATE TABLE IF NOT EXISTS subscribers (
	id                TEXT PRIMARY KEY,
	email             TEXT NOT NULL UNIQUE,
	source_site       TEXT NOT NULL DEFAULT 'freepromptbase',
	status            TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'confirmed' | 'unsubscribed'
	confirm_token     TEXT,
	unsubscribe_token TEXT NOT NULL,
	synced_to_brevo   INTEGER NOT NULL DEFAULT 0,
	ip                TEXT,
	user_agent        TEXT,
	created_at        TEXT NOT NULL DEFAULT (datetime('now')),
	confirmed_at      TEXT,
	unsubscribed_at   TEXT
);
CREATE INDEX IF NOT EXISTS idx_subscribers_status        ON subscribers(status);
CREATE INDEX IF NOT EXISTS idx_subscribers_confirm_token ON subscribers(confirm_token);
CREATE INDEX IF NOT EXISTS idx_subscribers_unsub_token   ON subscribers(unsubscribe_token);
CREATE INDEX IF NOT EXISTS idx_subscribers_created_at    ON subscribers(created_at);
