-- News posts share the existing editorial CMS but are marked up as NewsArticle
-- instead of BlogPosting. `source_url` records the primary source used by the
-- newsroom so readers can verify the original announcement.
ALTER TABLE posts ADD COLUMN content_type TEXT NOT NULL DEFAULT 'guide';
ALTER TABLE posts ADD COLUMN source_url TEXT;
CREATE INDEX IF NOT EXISTS idx_posts_content_type ON posts(content_type);
