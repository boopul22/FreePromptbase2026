-- Humanizer polish pass on the 2026-07-14 blog drop (two phrase tightenings).
UPDATE posts SET content = REPLACE(content, 'keep the face line in every message, not just the first one.', 'keep the face line in every message rather than only the first.'), updated_at = datetime('now') WHERE slug = 'chatgpt-photo-editing-prompts';
UPDATE posts SET faq_items = REPLACE(faq_items, 'raise the limits and unlock the Pro model', 'raise the limits and add the Pro model'), updated_at = datetime('now') WHERE slug = 'how-to-use-nano-banana-ai-free';
