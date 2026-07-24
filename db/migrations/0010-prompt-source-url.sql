-- Original-source attribution URLs for imported or credited prompts.
-- Apply once:
--   wrangler d1 execute freepromptbase-com --remote --file=db/migrations/0010-prompt-source-url.sql

ALTER TABLE prompts ADD COLUMN source_url TEXT;
