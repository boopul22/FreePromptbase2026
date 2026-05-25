-- Free Prompt Base — D1 schema
-- Apply:  wrangler d1 execute freepromptbase-com --remote --file=db/schema.sql
--   (use --local for the local dev database)

DROP TABLE IF EXISTS prompts;
DROP TABLE IF EXISTS categories;

CREATE TABLE categories (
	slug         TEXT PRIMARY KEY,
	name         TEXT NOT NULL,
	description  TEXT NOT NULL,
	emoji        TEXT NOT NULL,
	sort_order   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE prompts (
	slug         TEXT PRIMARY KEY,
	title        TEXT NOT NULL,
	description  TEXT NOT NULL,
	prompt_text  TEXT NOT NULL,
	model        TEXT NOT NULL,
	category     TEXT NOT NULL REFERENCES categories(slug),
	tags         TEXT NOT NULL DEFAULT '[]',   -- JSON array of strings
	author       TEXT NOT NULL DEFAULT 'Admin',
	date         TEXT NOT NULL,                 -- ISO date (YYYY-MM-DD)
	cover_image  TEXT,
	featured     INTEGER NOT NULL DEFAULT 0,    -- 0/1
	liked        INTEGER NOT NULL DEFAULT 0,    -- 0/1
	popularity   INTEGER NOT NULL DEFAULT 0,
	how_to_use   TEXT,
	created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_prompts_category   ON prompts(category);
CREATE INDEX idx_prompts_date       ON prompts(date);
CREATE INDEX idx_prompts_popularity ON prompts(popularity);
