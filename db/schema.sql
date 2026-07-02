-- Free Prompt Base — D1 schema
-- Apply:  wrangler d1 execute freepromptbase-com --remote --file=db/schema.sql
--   (use --local for the local dev database)

-- Disable FK enforcement during teardown so DROPs in any order succeed.
-- (SQLite checks FKs on DROP TABLE when foreign_keys=ON.)
PRAGMA foreign_keys = OFF;

DROP TABLE IF EXISTS subscribers;
DROP TABLE IF EXISTS activity_log;
DROP TABLE IF EXISTS pages;
DROP TABLE IF EXISTS media;
DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS prompt_events;
DROP TABLE IF EXISTS prompt_likes;
DROP TABLE IF EXISTS prompt_saves;
DROP TABLE IF EXISTS prompts;
DROP TABLE IF EXISTS prompt_categories;

PRAGMA foreign_keys = ON;

-- ===========================================================================
-- Prompt library (the original site feature)
-- ===========================================================================

CREATE TABLE prompt_categories (
	slug         TEXT PRIMARY KEY,
	name         TEXT NOT NULL,
	description  TEXT NOT NULL,
	emoji        TEXT NOT NULL,
	sort_order   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE prompts (
	slug             TEXT PRIMARY KEY,
	title            TEXT NOT NULL,
	description      TEXT NOT NULL,
	prompt_text      TEXT NOT NULL,
	category         TEXT NOT NULL REFERENCES prompt_categories(slug),
	tags             TEXT NOT NULL DEFAULT '[]',
	author           TEXT NOT NULL DEFAULT 'Admin',
	date             TEXT NOT NULL,
	cover_image      TEXT,
	images           TEXT NOT NULL DEFAULT '[]',  -- JSON array of image URLs for the carousel
	featured         INTEGER NOT NULL DEFAULT 0,
	liked            INTEGER NOT NULL DEFAULT 0,
	popularity       INTEGER NOT NULL DEFAULT 0,
	save_count       INTEGER NOT NULL DEFAULT 0,    -- denormalized count of prompt_saves rows for this slug
	like_count       INTEGER NOT NULL DEFAULT 0,    -- denormalized count of prompt_likes rows for this slug
	share_count      INTEGER NOT NULL DEFAULT 0,    -- denormalized count of 'share' rows in prompt_events
	view_count       INTEGER NOT NULL DEFAULT 0,    -- denormalized count of 'view' rows in prompt_events (deduped per actor/day)
	copy_count       INTEGER NOT NULL DEFAULT 0,    -- denormalized count of 'copy' rows in prompt_events (deduped per actor/minute)
	how_to_use       TEXT,
	created_by       TEXT,                           -- FK to users.id of admin who created via CMS (nullable)
	-- Lifecycle status (free-text; no CHECK so new values need no migration):
	--   'draft'    — admin work-in-progress; private, NOT in the review queue.
	--   'pending'  — user submission awaiting admin review.
	--   'approved' — live / published (the only status public lists show).
	--   'rejected' — reviewed submission that was declined.
	-- Admin-created prompts are saved as 'draft' or published straight to 'approved'.
	-- User submissions start 'pending'. Existing seed rows default to 'approved'.
	status           TEXT NOT NULL DEFAULT 'approved',  -- 'draft' | 'pending' | 'approved' | 'rejected'
	-- Scheduled publish time (UTC 'YYYY-MM-DD HH:MM:SS'). NULL = live as soon as
	-- approved. A future value = "scheduled": approved but hidden from the public
	-- until publish_at <= now (gate evaluated per request; no cron).
	publish_at       TEXT,
	submitted_by     TEXT,                           -- FK to users.id of submitter; NULL for admin-created
	submitted_at     TEXT,
	reviewed_by      TEXT,                           -- FK to users.id of admin who approved/rejected
	reviewed_at      TEXT,
	rejection_reason TEXT,
	created_at       TEXT NOT NULL DEFAULT (datetime('now')),
	-- Last time the prompt was created/edited/published (UTC). Surfaced as the
	-- "Updated" date + dateModified in structured data. Bumped on every write.
	updated_at       TEXT,
	-- Intrinsic pixel size of cover_image, used to render width/height on the
	-- card/detail <img> so the browser reserves the box (no layout shift).
	cover_w          INTEGER,
	cover_h          INTEGER,
	-- UTC timestamp of the Pinterest CSV export batch that included this prompt
	-- (NULL = never exported). Powers the admin delta-export button: each click
	-- emits only rows where this is NULL, then stamps them. See migration 0007.
	pinterest_exported_at TEXT
);

CREATE INDEX idx_prompts_category     ON prompts(category);
CREATE INDEX idx_prompts_date         ON prompts(date);
CREATE INDEX idx_prompts_popularity   ON prompts(popularity);
CREATE INDEX idx_prompts_save_count   ON prompts(save_count);
CREATE INDEX idx_prompts_view_count   ON prompts(view_count);
CREATE INDEX idx_prompts_copy_count   ON prompts(copy_count);
CREATE INDEX idx_prompts_publish_at    ON prompts(publish_at);
CREATE INDEX idx_prompts_updated_at    ON prompts(updated_at);
CREATE INDEX idx_prompts_status_date  ON prompts(status, date);
CREATE INDEX idx_prompts_submitted_by ON prompts(submitted_by);
CREATE INDEX idx_prompts_pinterest_exported ON prompts(pinterest_exported_at);

-- Per-actor save list. actor_id is "user:<id>" for signed-in users and
-- "anon:<uuid>" for anonymous visitors (migrated to user form on login).
CREATE TABLE prompt_saves (
	actor_id    TEXT NOT NULL,
	prompt_slug TEXT NOT NULL REFERENCES prompts(slug) ON DELETE CASCADE,
	created_at  TEXT NOT NULL DEFAULT (datetime('now')),
	PRIMARY KEY (actor_id, prompt_slug)
);
CREATE INDEX idx_saves_actor  ON prompt_saves(actor_id);
CREATE INDEX idx_saves_prompt ON prompt_saves(prompt_slug);

-- Per-actor like list — same shape as prompt_saves but a different concept
-- (likes = public approval signal, saves = personal bookmark).
CREATE TABLE prompt_likes (
	actor_id    TEXT NOT NULL,
	prompt_slug TEXT NOT NULL REFERENCES prompts(slug) ON DELETE CASCADE,
	created_at  TEXT NOT NULL DEFAULT (datetime('now')),
	PRIMARY KEY (actor_id, prompt_slug)
);
CREATE INDEX idx_likes_actor  ON prompt_likes(actor_id);
CREATE INDEX idx_likes_prompt ON prompt_likes(prompt_slug);

-- Append-only event log; powers the 7-day Trending query.
CREATE TABLE prompt_events (
	id          INTEGER PRIMARY KEY AUTOINCREMENT,
	prompt_slug TEXT NOT NULL REFERENCES prompts(slug) ON DELETE CASCADE,
	actor_id    TEXT NOT NULL,
	kind        TEXT NOT NULL,            -- 'save' | 'unsave' | 'share' | 'view' | 'copy'
	created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_events_prompt_created ON prompt_events(prompt_slug, created_at);
CREATE INDEX idx_events_kind_created   ON prompt_events(kind, created_at);

-- ===========================================================================
-- Auth (from astro-cloudflare-cms skill — db-schema.sql, trimmed to essentials)
-- ===========================================================================

CREATE TABLE users (
	id TEXT PRIMARY KEY,
	google_id TEXT NOT NULL UNIQUE,
	email TEXT NOT NULL UNIQUE,
	name TEXT NOT NULL,
	avatar_url TEXT,
	role TEXT NOT NULL DEFAULT 'user',
	is_banned INTEGER NOT NULL DEFAULT 0,
	username TEXT UNIQUE,        -- profile slug used at /author/<username>; auto-assigned on first login
	bio TEXT,                    -- short author bio (~280 chars)
	twitter TEXT,                -- handle only, no '@' and no URL
	instagram TEXT,              -- handle only, no '@' and no URL
	website TEXT,                -- absolute http(s) URL
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);

CREATE TABLE sessions (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL,
	expires_at TEXT NOT NULL,
	created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);

-- ===========================================================================
-- CMS (from astro-cloudflare-cms skill — cms-schema.sql, with faq_items baked in)
-- ===========================================================================

CREATE TABLE categories (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL UNIQUE,
	slug TEXT NOT NULL UNIQUE,
	color TEXT NOT NULL DEFAULT 'primary',
	description TEXT,
	sort_order INTEGER NOT NULL DEFAULT 0,
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE posts (
	id TEXT PRIMARY KEY,
	slug TEXT NOT NULL UNIQUE,
	title TEXT NOT NULL,
	excerpt TEXT NOT NULL DEFAULT '',
	content TEXT NOT NULL DEFAULT '{}',
	category_id TEXT,
	author_name TEXT NOT NULL DEFAULT '',
	author_role TEXT NOT NULL DEFAULT '',
	author_avatar TEXT NOT NULL DEFAULT '',
	featured INTEGER NOT NULL DEFAULT 0,
	status TEXT NOT NULL DEFAULT 'draft',
	cover_image TEXT,
	icon_fallback TEXT,
	icon_bg TEXT,
	read_time TEXT NOT NULL DEFAULT '',
	meta_title TEXT,
	meta_description TEXT,
	related_slugs TEXT NOT NULL DEFAULT '[]',
	faq_items TEXT NOT NULL DEFAULT '[]',
	published_at TEXT,
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_posts_slug ON posts(slug);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_category_id ON posts(category_id);

CREATE TABLE media (
	id TEXT PRIMARY KEY,
	r2_key TEXT NOT NULL,
	url TEXT NOT NULL,
	filename TEXT NOT NULL,
	alt_text TEXT NOT NULL DEFAULT '',
	size_bytes INTEGER NOT NULL,
	mime_type TEXT NOT NULL,
	folder TEXT NOT NULL DEFAULT 'general',
	uploaded_by TEXT,
	created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_media_folder ON media(folder);

CREATE TABLE pages (
	id TEXT PRIMARY KEY,
	slug TEXT NOT NULL UNIQUE,
	title TEXT NOT NULL,
	content TEXT NOT NULL DEFAULT '{}',
	status TEXT NOT NULL DEFAULT 'draft',
	meta_title TEXT,
	meta_description TEXT,
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_pages_slug ON pages(slug);

CREATE TABLE activity_log (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL,
	user_name TEXT NOT NULL,
	action TEXT NOT NULL,
	entity_type TEXT NOT NULL,
	entity_id TEXT,
	entity_title TEXT,
	details TEXT,
	created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at);

-- ===========================================================================
-- Newsletter subscribers (double opt-in; synced to Brevo on confirm)
-- ===========================================================================
-- Self-managed double opt-in: a signup inserts a 'pending' row + sends a
-- confirmation email (Brevo transactional). Clicking the link flips the row to
-- 'confirmed' and pushes the contact to Brevo as a native, consented contact
-- (so there's no cold "import" to do when you later start sending campaigns).
-- 'unsubscribed' rows are kept for suppression + audit, never deleted on opt-out.
CREATE TABLE subscribers (
	id                TEXT PRIMARY KEY,
	email             TEXT NOT NULL UNIQUE,             -- stored lowercased + trimmed
	source_site       TEXT NOT NULL DEFAULT 'freepromptbase',  -- which site captured it
	status            TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'confirmed' | 'unsubscribed'
	confirm_token     TEXT,                             -- single-use; cleared once confirmed
	unsubscribe_token TEXT NOT NULL,                    -- long-lived; in every email footer
	synced_to_brevo   INTEGER NOT NULL DEFAULT 0,       -- 1 once the contact is upserted to Brevo
	ip                TEXT,                             -- captured at signup for consent audit
	user_agent        TEXT,
	created_at        TEXT NOT NULL DEFAULT (datetime('now')),
	confirmed_at      TEXT,
	unsubscribed_at   TEXT
);
CREATE INDEX idx_subscribers_status        ON subscribers(status);
CREATE INDEX idx_subscribers_confirm_token ON subscribers(confirm_token);
CREATE INDEX idx_subscribers_unsub_token   ON subscribers(unsubscribe_token);
CREATE INDEX idx_subscribers_created_at    ON subscribers(created_at);
