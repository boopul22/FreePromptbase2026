-- Pinterest bulk-upload CSV export tracking.
--
-- The admin "Export Pinterest CSV" button does a DELTA export: each click emits
-- only prompts not yet exported, then stamps them so the next click skips them.
-- pinterest_exported_at holds the UTC timestamp of the export batch that
-- included the row (NULL = never exported). It's a timestamp, not a boolean, so
-- (a) every export batch shares one value (enables "reset last batch"), and
-- (b) we keep a history of when each prompt was sent to Pinterest.
ALTER TABLE prompts ADD COLUMN pinterest_exported_at TEXT;
CREATE INDEX idx_prompts_pinterest_exported ON prompts(pinterest_exported_at);
