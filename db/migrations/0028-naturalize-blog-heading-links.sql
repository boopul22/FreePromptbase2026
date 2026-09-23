-- Move the four keyword-stuffed heading links from migration 0027 into the
-- sentence that follows each heading, where the same phrase reads naturally.
-- Generated 2026-09-23.

UPDATE posts SET content = REPLACE(content, '<h2>Burgundy Oversized Hoodie Sitting on Car Bonnet <a href="/gemini-ai-photo-prompt">Google Gemini AI Photo Prompts</a></h2>
<p>After running this prompt', '<h2>Burgundy Oversized Hoodie Sitting on Car Bonnet Google Gemini AI Photo Prompts</h2>
<p>After running this <a href="/gemini-ai-photo-prompt">Gemini AI photo prompt</a>'), updated_at = datetime('now') WHERE id = 'blog-aura-15-gemini-boys-car-ai-photo-prompts';
UPDATE posts SET content = REPLACE(content, '<h2>Peach Lehenga Staircase Portrait <a href="/gemini-ai-photo-prompt">Gemini AI Photo Prompt</a></h2>
<p>After running this prompt', '<h2>Peach Lehenga Staircase Portrait Gemini AI Photo Prompt</h2>
<p>After running this <a href="/gemini-ai-photo-prompt">Gemini AI photo prompt</a>'), updated_at = datetime('now') WHERE id = 'blog-aura-16-luxury-lehenga-gemini-ai-prompts';
UPDATE posts SET content = REPLACE(content, '<h2>Warm Cafe Window Best <a href="/gemini-couple-photo-prompt">Gemini Couple Photo Prompts</a> Scene</h2>
<p>After running this prompt', '<h2>Warm Cafe Window Best Gemini Couple Photo Prompts Scene</h2>
<p>After running this <a href="/gemini-couple-photo-prompt">Gemini couple photo prompt</a>'), updated_at = datetime('now') WHERE id = 'blog-aura-07-gemini-romantic-couple-ai-photo-prompts';
UPDATE posts SET content = REPLACE(content, '<h2>Sage Garden Couple Portrait Viral Couple <a href="/chatgpt-photo-editing-prompt">ChatGPT Photo Editing Prompt</a></h2>
<p>After running this prompt', '<h2>Sage Garden Couple Portrait Viral Couple ChatGPT Photo Editing Prompt</h2>
<p>After running this <a href="/chatgpt-photo-editing-prompt">ChatGPT photo editing prompt</a>'), updated_at = datetime('now') WHERE id = 'blog-aura-03-couple-chatgpt-photo-editing-prompts-ins';
