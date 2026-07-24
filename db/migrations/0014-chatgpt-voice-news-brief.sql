-- First independently written AI news brief. It is based on OpenAI's own
-- release notes; the source URL is retained for reader verification.
INSERT INTO posts (
  id, slug, title, excerpt, content, category_id,
  author_name, author_role, author_avatar,
  featured, status, content_type, source_url, cover_image,
  read_time, meta_title, meta_description, related_slugs, faq_items,
  published_at, created_at, updated_at
) VALUES (
  'nws-voice-work-codex-20260724',
  'chatgpt-voice-work-codex-desktop',
  'ChatGPT Voice Comes to Work and Codex on Desktop',
  'OpenAI has added voice control to ChatGPT Work and Codex on desktop, letting users start tasks, check progress, and redirect agents hands-free.',
  '<p><strong>You can now talk to a ChatGPT agent while it works on your desktop.</strong></p><p>OpenAI has added ChatGPT Voice to Work and Codex in its desktop app. The update lets people start tasks, ask what agents are doing, interrupt or redirect work, and coordinate multiple agents through a spoken conversation.</p><h2>What changed</h2><p>Voice in Work and Codex is available in the ChatGPT desktop app for macOS and Windows. It is designed for task control rather than a conventional voice chat: you can describe an outcome, ask for a progress update, or change direction while work continues.</p><h2>Why it matters</h2><p>Voice is becoming a control layer for agentic work. Instead of stopping to type every instruction, a person can keep a task moving while reviewing work on screen. That could make multi-step research, coding, and desktop workflows feel more direct, but the result still depends on the tools and permissions available to the selected workspace.</p><h2>Who gets it</h2><p>OpenAI says availability depends on plan and workspace settings. The company’s Business, Enterprise, and Education release notes describe Voice in Work and Codex as a desktop feature, with access on macOS and Windows.</p><h2>Source and editorial note</h2><p>This report was independently written from <a href="https://help.openai.com/en/articles/11391654-chatgpt-business-laidiena-piez%C4%ABmes" rel="noopener noreferrer">OpenAI’s July 23 release notes</a>. The cover image is an original illustration created for Free Prompt Base; it is not a product screenshot.</p>',
  'ASYDB3thDh46Z3r6kTiOH',
  'Free Prompt Base News Desk', 'AI News Desk', '',
  1, 'published', 'news',
  'https://help.openai.com/en/articles/11391654-chatgpt-business-laidiena-piez%C4%ABmes',
  'https://freepromptbase.com/cdn/cms/news/chatgpt-voice-work-codex-july-2026.webp',
  '2 min read',
  'ChatGPT Voice Comes to Work and Codex on Desktop',
  'OpenAI has added ChatGPT Voice to Work and Codex on desktop, letting users start tasks, check progress, and redirect agents hands-free.',
  '[]', '[]',
  '2026-07-24T13:16:00.000Z', '2026-07-24 13:16:00', '2026-07-24 13:16:00'
);
