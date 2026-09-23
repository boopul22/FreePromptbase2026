-- Independent cloud queue for the external Raga whisper Facebook Page.
-- Do not merge this with social_campaigns: those rows always represent the
-- Free Prompt Base Instagram + Facebook image workflow.
CREATE TABLE IF NOT EXISTS raga_reel_jobs (
	id TEXT PRIMARY KEY,
	idempotency_key TEXT NOT NULL UNIQUE,
	title TEXT NOT NULL,
	caption TEXT NOT NULL,
	video_r2_key TEXT NOT NULL UNIQUE,
	scheduled_at TEXT NOT NULL,
	status TEXT NOT NULL DEFAULT 'scheduled',
	attempts INTEGER NOT NULL DEFAULT 0,
	failure_count INTEGER NOT NULL DEFAULT 0,
	next_attempt_at TEXT,
	lease_expires_at TEXT,
	state_json TEXT NOT NULL DEFAULT '{}',
	remote_id TEXT,
	permalink TEXT,
	last_error TEXT,
	published_at TEXT,
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	updated_at TEXT NOT NULL DEFAULT (datetime('now')),
	CHECK (status IN ('scheduled', 'running', 'processing', 'retrying', 'published', 'failed', 'canceled'))
);

CREATE INDEX IF NOT EXISTS idx_raga_reel_jobs_due
	ON raga_reel_jobs(status, scheduled_at, next_attempt_at, lease_expires_at);
