-- Add Instagram handle + website URL to author profiles.
-- instagram: handle only (no '@', no URL). website: absolute http(s) URL.
ALTER TABLE users ADD COLUMN instagram TEXT;
ALTER TABLE users ADD COLUMN website TEXT;
