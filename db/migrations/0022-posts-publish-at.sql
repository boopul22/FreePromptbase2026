-- Scheduled go-live for editorial posts (guides/news), matching prompts.publish_at.
-- UTC 'YYYY-MM-DD HH:MM:SS'. NULL = live as soon as status='published'.
-- Public lists/detail only show rows where publish_at IS NULL OR publish_at <= now.
ALTER TABLE posts ADD COLUMN publish_at TEXT;
CREATE INDEX IF NOT EXISTS idx_posts_publish_at ON posts(publish_at);
