CREATE TABLE IF NOT EXISTS social_campaigns (
	id TEXT PRIMARY KEY,
	idempotency_key TEXT NOT NULL UNIQUE,
	payload_hash TEXT NOT NULL,
	prompt_slug TEXT NOT NULL,
	canonical_url TEXT NOT NULL,
	media_json TEXT NOT NULL,
	scheduled_at TEXT NOT NULL,
	status TEXT NOT NULL DEFAULT 'scheduled',
	lease_expires_at TEXT,
	created_by TEXT NOT NULL,
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_social_campaigns_due
	ON social_campaigns(status, scheduled_at, lease_expires_at);
CREATE INDEX IF NOT EXISTS idx_social_campaigns_slug
	ON social_campaigns(prompt_slug, scheduled_at);

CREATE TABLE IF NOT EXISTS social_deliveries (
	campaign_id TEXT NOT NULL REFERENCES social_campaigns(id) ON DELETE CASCADE,
	platform TEXT NOT NULL,
	content TEXT NOT NULL,
	status TEXT NOT NULL DEFAULT 'scheduled',
	attempts INTEGER NOT NULL DEFAULT 0,
	next_attempt_at TEXT,
	state_json TEXT NOT NULL DEFAULT '{}',
	remote_id TEXT,
	permalink TEXT,
	last_error TEXT,
	published_at TEXT,
	updated_at TEXT NOT NULL DEFAULT (datetime('now')),
	PRIMARY KEY (campaign_id, platform),
	CHECK (platform IN ('instagram', 'facebook'))
);
CREATE INDEX IF NOT EXISTS idx_social_deliveries_status
	ON social_deliveries(status, next_attempt_at);
