-- 0029: Unpublish the 30 blog posts built from auraprompt.in articles
-- (scripts/build-aura-blog-drafts.py + scripts/publish-aura-blog-batch.py).
--
-- NOT applied automatically. The code guard in src/data/removed-posts.ts already
-- returns 410 for these slugs and hides them from every listing once deployed;
-- this makes the database agree. Rows are kept as drafts, nothing is deleted.
--
-- Run by hand AFTER deploying the code:
--   npx wrangler d1 execute freepromptbase-com --remote --file=db/migrations/0029-unpublish-aura-posts.sql

UPDATE posts
SET status = 'draft',
    featured = 0,
    publish_at = NULL,
    updated_at = datetime('now')
WHERE id LIKE 'blog-aura-%'
   OR slug IN (
  'viral-gemini-prompts-for-men-instagram-editorial',
  'instagram-boy-photo-editing-prompts-copy-paste',
  'couple-chatgpt-photo-editing-prompts-instagram-2026',
  'viral-ai-photo-editing-prompts-for-girls-bardot',
  'girls-gemini-ai-college-photo-prompts',
  'college-boy-stylish-gemini-photo-editing-prompts',
  'gemini-romantic-couple-ai-photo-prompts',
  'gemini-luxury-yacht-ai-photo-prompts-for-boys',
  'retro-girl-in-saree-gemini-ai-photo-prompts',
  'indian-couple-gemini-ai-photo-prompt-saree-look',
  'south-indian-girl-ai-photo-prompt-saree',
  'mahadev-shivling-ai-photo-editing-prompts',
  'viral-photo-editing-prompt-for-boys-gemini-2026',
  'gemini-horse-lover-ai-photo-editing-prompts',
  'gemini-boys-car-ai-photo-prompts',
  'luxury-lehenga-gemini-ai-prompts',
  'foggy-forest-ai-photo-editing-prompts',
  'gemini-2x2-grid-collage-prompt',
  'kurti-and-denim-jeans-gemini-prompt',
  'best-friend-photo-prompt-gemini-ai-girls',
  'gemini-ai-mirror-selfie-prompt-boys',
  'bullet-bike-ai-photo-editing-prompt-for-boys',
  'gemini-ai-airport-look-prompts-for-boys',
  'gemini-ai-dandiya-garba-looks-prompts',
  'eid-mubarak-ai-photo-prompts-for-boys',
  'gemini-ai-gym-girl-prompt',
  'kashmir-ice-mountains-ai-photo-editing-prompts',
  'wedding-ai-photo-prompt-indian-couple-gemini',
  'gemini-cinematic-studio-portrait-prompt-boys',
  'chatgpt-prompts-for-night-photos-indian-boy'
   );

-- Check afterwards (should return no rows):
-- SELECT slug, status FROM posts WHERE id LIKE 'blog-aura-%' AND status = 'published';
