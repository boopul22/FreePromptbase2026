// ---------------------------------------------------------------------------
// Prompt seed data. Source of truth for `npm run db:gen-seed` — the prompts
// here get emitted into db/seed.sql, which is then applied to D1 by wrangler.
// IMPORTANT: nothing imports this file directly except src/lib/prompts.ts
// (which reads from D1 at runtime) and scripts/gen-seed.ts.
//
// Cover + gallery images live on R2 at /prompts/<slug>-<index>.jpg
// (bucket: freepromptbase-media-2026, served via the R2 dev URL).
// ---------------------------------------------------------------------------

export interface Prompt {
	slug: string;
	title: string;
	/** Short excerpt shown on cards and as the intro on the detail page. */
	description: string;
	/** The copyable prompt text. */
	promptText: string;
	/** Category slug (see src/data/categories.ts). */
	category: string;
	tags: string[];
	author: string;
	/** ISO date — drives the "Newest" sort. */
	date: string;
	/** Optional cover image; a gradient fallback is shown when absent. */
	coverImage?: string;
	featured?: boolean;
	/** Whether the current user has saved/liked this prompt. */
	liked?: boolean;
	/** Legacy seed counter — kept for backfill. New code reads saveCount instead. */
	popularity: number;
	/** Number of saves (denormalized from prompt_saves). */
	saveCount?: number;
	/** Number of likes (denormalized from prompt_likes). */
	likeCount?: number;
	/** Number of shares (denormalized from prompt_events kind='share'). */
	shareCount?: number;
	/** Number of views (denormalized from prompt_events kind='view', deduped per actor/day). */
	viewCount?: number;
	/** Scheduled publish time (UTC). Future = scheduled (hidden); null/past = live. */
	publishAt?: string;
	/** Last create/edit/publish time (UTC). Drives the "Updated" date + dateModified. */
	updatedAt?: string;
	/** Intrinsic cover image pixel dimensions — emitted as width/height to prevent CLS. */
	coverW?: number;
	coverH?: number;
	/** Optional extra guidance rendered on the detail page. */
	howToUse?: string;
	/** Original publication URL, shown as a clear external attribution link. */
	sourceUrl?: string;
	/** Image gallery rendered as a carousel on the detail page. cover_image is used for cards. */
	images?: string[];
	/** users.id of the admin who added this prompt (null for seed entries). */
	createdBy?: string;
	/**
	 * Lifecycle status. Public lists only show 'approved'.
	 * - 'draft'    — admin work-in-progress; private, not in the review queue.
	 * - 'pending'  — user submission awaiting admin review.
	 * - 'approved' — live / published.
	 * - 'rejected' — reviewed submission that was declined.
	 */
	status?: 'draft' | 'pending' | 'approved' | 'rejected';
	/** users.id of the submitter (user-submitted only; NULL for admin-created). */
	submittedBy?: string;
	submittedAt?: string;
	/** users.id of the admin who approved/rejected. */
	reviewedBy?: string;
	reviewedAt?: string;
	rejectionReason?: string;
}

const R2 = 'https://freepromptbase.com/cdn/prompts';

export const prompts: Prompt[] = [
	{
		slug: 'hand-drawn-doodle-overlay',
		title: 'Hand-Drawn Doodle Photo Overlay',
		description:
			'Turn any photo into a scroll-stopping social post — playful hand-drawn doodles, motion lines and whimsical captions that react to the subject in the frame.',
		promptText:
			"Analyze the uploaded image and preserve the original subject, composition, and lighting. Do not alter the identity or structure of the main subject. Add playful, hand-drawn doodles that interact directly with the subject in the image. The doodles should mimic, follow, or exaggerate the shapes, gestures, or motion present — such as outlining poses, extending limbs, adding motion lines, or creating imaginative elements that 'respond' to the subject.\n\nEnsure the doodles feel naturally integrated into the scene, as if they were drawn on top of the photo with intention. Use a sketchy, imperfect, hand-drawn style with organic lines, slightly uneven strokes, and a casual illustrated feel. Include whimsical handwritten text elements placed around the image. The text should match the mood or implied context of the scene, with a playful and spontaneous tone.\n\nAvoid fixed phrases — generate context-aware, creative, and humorous text that fits each unique image. Maintain a balanced composition so the doodles enhance the image without overwhelming the original subject. Keep the overall aesthetic fun, expressive, and social-media-ready. High resolution, clean overlay, vibrant yet natural color harmony.",
		category: 'images',
		tags: ['photo overlay', 'doodle', 'social media', 'chatgpt', 'gemini'],
		author: 'Free Prompt Base',
		date: '2026-05-25',
		coverImage: `${R2}/doodle-overlay-1.jpg`,
		images: [
			`${R2}/doodle-overlay-1.jpg`,
			`${R2}/doodle-overlay-2.jpg`,
			`${R2}/doodle-overlay-3.jpg`,
		],
		featured: true,
		popularity: 980,
		howToUse:
			'Upload any clear photo of a person, car, or object. The model reads what is in the frame and draws context-aware doodles + captions around it. Works best with ChatGPT (GPT-4o image edit) or Gemini. For the cleanest results, give the model a portrait or hero shot with one obvious subject and some negative space around it.',
	},
	{
		slug: 'cinematic-football-world-cup-poster',
		title: 'Cinematic World Cup Football Poster',
		description:
			'Generate a luxury 4K cinematic football poster of any team — two players back-to-back, neon flag accents, smoky stadium haze and official-campaign typography.',
		promptText:
			"Create a super cinematic hyper-realistic football poster in 4K Ultra HD vertical 9:16 aspect ratio with a luxury minimalist sports-poster aesthetic. Use a long-range cinematic camera angle with half-body framing from waist-up for both characters. The overall atmosphere should feel emotional, elite, dark, dramatic, and professionally designed like an official FIFA World Cup advertisement. On the left side place a fashionable athletic young man with fair white skin tone wearing the EXACT [COUNTRY] 2026 World Cup away jersey with accurate real-world kit details researched from official references — authentic fabric texture, sleeve design, logos, stitching, collar structure, and jersey patterns. On the right side place [PLAYER NAME] wearing the exact same [COUNTRY] 2026 away jersey. Both characters should stand back-to-back with folded arms while looking directly toward the camera with calm champion energy and confident facial expressions. [PLAYER NAME] should look highly realistic with natural facial detail and cinematic lighting. Both subjects should have realistic skin tone with premium smooth skin rendering. The background should be mostly black with deep moody contrast and subtle neon edge-glow effects only around the subjects and design accents. Behind them place 3 long vertical glowing stripes inspired by [COUNTRY] flag colors. Add a large faded [COUNTRY] flag with dark transparent blending in the background for a premium cinematic feel. Include realistic stadium haze, smoke textures, floating dust particles, glossy jersey reflections, cinematic shadows, lens flare details, and premium sports-poster lighting. Add small elegant football typography such as '[COUNTRY]', '[PLAYER NAME]', 'WORLD CUP 2026', small futuristic numbers, minimal sports graphics, and luxury poster-style text elements integrated naturally into the composition. Typography should remain subtle and clean. Use black, [FLAG COLORS], silver, and white tones in the color grading. Ultra realistic textures, sharp focus, authentic jersey folds, dramatic lighting, and official football campaign mood. No clutter, no crowd, no extra players, no cartoon effects.",
		category: 'images',
		tags: ['football', 'sports', 'poster', 'cinematic', 'gemini', 'world cup'],
		author: 'Free Prompt Base',
		date: '2026-05-24',
		coverImage: `${R2}/football-poster-1.jpg`,
		images: [
			`${R2}/football-poster-1.jpg`,
			`${R2}/football-poster-2.jpg`,
			`${R2}/football-poster-3.jpg`,
		],
		featured: true,
		popularity: 920,
		howToUse:
			'Replace [COUNTRY], [PLAYER NAME], and [FLAG COLORS] before generating. Examples: Argentina + Lionel Messi (sky blue, white, soft gold), Portugal + Cristiano Ronaldo (deep red, emerald green, gold), Brazil + Neymar (canary yellow, deep green, royal blue). Best results in Gemini 2.5 Pro or ChatGPT image. Stick to 9:16 vertical so the framing reads as a real campaign poster.',
	},
	{
		slug: 'back-flash-night-portrait',
		title: 'Back-Flash Cinematic Night Portrait',
		description:
			'iPhone-flash aesthetic at night — a glowing rim-light halo around the subject, lens flare, soft haze, and that grainy candid mood that goes viral on Instagram reels.',
		promptText:
			'Ultra-realistic cinematic night portrait of a young person shown in the photo. A powerful flash light positioned directly behind their head creates an intense glowing white rim light outline around their entire body and hair, giving a dreamy halo effect. Strong lens flare, slightly overexposed flash bloom, soft haze, high contrast shadows, moody night atmosphere. Dark trees and foliage surrounding the scene, faint stars visible in the sky. Shot on iPhone with flash, realistic skin texture, candid aesthetic, Instagram reel filter vibe, cinematic lighting, grainy night photography, vertical composition, soft glow, ethereal and mysterious mood.\n\nKeywords to add for best results:\n- back flash photography\n- glowing outline effect\n- rim light halo\n- overexposed flash\n- cinematic night shot\n- dreamy lens flare\n- iPhone night flash aesthetic\n- soft grain',
		category: 'images',
		tags: ['portrait', 'night', 'flash', 'iphone aesthetic', 'instagram', 'reel'],
		author: 'Free Prompt Base',
		date: '2026-05-23',
		coverImage: `${R2}/back-flash-portrait-1.jpg`,
		images: [
			`${R2}/back-flash-portrait-1.jpg`,
			`${R2}/back-flash-portrait-2.jpg`,
			`${R2}/back-flash-portrait-3.jpg`,
			`${R2}/back-flash-portrait-4.jpg`,
		],
		featured: false,
		popularity: 870,
		howToUse:
			'Upload a clean photo of the subject (preferably at night or with a dark background). The model paints the rim-light halo and the night atmosphere on top — works equally well on portraits in dresses, casual wear, or jewelry shots. Keep the framing vertical (4:5 or 9:16) for the Instagram-reel feel.',
	},
	{
		slug: 'pixar-chibi-scrapbook-collage',
		title: 'Pixar Chibi Scrapbook Collage',
		description:
			'Drop the real photo of a person and surround them with adorable 3D Pixar-style chibi versions of themselves in different poses — same outfit, scrapbook doodles, sticker outlines.',
		promptText:
			"Use the uploaded photo exactly as the main base image and preserve all original details including the background, environment, lighting, shadows, camera angle, pose, facial features, hairstyle, outfit, accessories, colors, and overall photography aesthetic. The real person must remain fully realistic, untouched, recognizable, and naturally integrated exactly like the original photo. Do not modify the face, body, clothing, or background. Add multiple adorable Pixar-inspired 3D chibi characters around the real person as decorative scrapbook-style elements. The chibi must look like miniature versions of the same person with oversized expressive eyes, fluffy detailed hair, glossy skin, soft white sticker outlines, subtle glow, and premium 3D rendering. Every chibi must wear the exact same outfit and accessories as the real person, including identical jacket, pants, shoes, glasses, ID card, and hairstyle. Place the chibi naturally around the composition in different cute poses such as waving, jumping, peace sign, selfie pose, sitting, walking, shy smile, and playful fashion poses without covering the real subject. Add aesthetic white handwritten doodles, sparkles, hearts, stars, arrows, smiley icons, and handwritten positive phrases in every area of the composition such as 'capture the moment,' 'stay positive,' 'choose happy,' 'good things take time,' and 'make it happen.' Maintain realistic blending, cinematic lighting, natural shadows, cozy warm tones, elegant scrapbook composition, luxury Instagram aesthetic, realistic depth layering, and ultra detailed 8K quality in a 4:5 vertical canvas.\n\nNegative prompt: outfit changes, altered accessories, different hairstyle, background replacement, face alteration, face reshaping, unrealistic anatomy, bad hands, blurry quality, messy composition, excessive doodles, inconsistent lighting, low quality rendering, cropped body, watermark, text artifacts, uncanny valley, cheap cartoon style.",
		category: 'images',
		tags: ['pixar', 'chibi', 'scrapbook', 'collage', 'gpt image', '3d render'],
		author: 'Free Prompt Base',
		date: '2026-05-22',
		coverImage: `${R2}/pixar-chibi-collage-1.jpg`,
		images: [
			`${R2}/pixar-chibi-collage-1.jpg`,
			`${R2}/pixar-chibi-collage-2.jpg`,
			`${R2}/pixar-chibi-collage-3.jpg`,
			`${R2}/pixar-chibi-collage-4.jpg`,
		],
		featured: true,
		popularity: 1100,
		howToUse:
			'Best on GPT Image 2 (the original viral pairing) or Gemini 2.5 Pro. Upload a single full-body photo with one clear pose — the chibi mini-mes will copy the outfit and surround the real subject. Keep the canvas 4:5 vertical. If you get face drift, re-run with the negative-prompt block intact.',
	},
	{
		slug: 'agent-workflow-architect',
		title: 'AI Agent Workflow Design Prompt',
		description:
			'Use this AI agent workflow prompt to turn a real task into clear steps, tool permissions, review points, and a human sign-off.',
		promptText:
			'You are an AI workflow architect. Design a reliable agent workflow for this goal: [GOAL].\n\nFirst, ask only the questions required to define the user, desired outcome, available tools, data sensitivity, time budget, and irreversible actions. Then produce a workflow with these sections:\n1. Outcome and non-goals\n2. Inputs and source-of-truth data\n3. Agent roles, with one sentence on what each role owns\n4. Step-by-step execution with explicit handoffs\n5. Tool permissions for each step: read, draft, execute, or prohibited\n6. Checkpoints where a human must approve, especially before publishing, sending, purchasing, deleting, or changing production data\n7. Failure handling and rollback\n8. A compact test plan with success criteria\n\nKeep every agent scoped to one job. Prefer a small workflow that can be observed and verified over a large autonomous chain. End with a ready-to-use first task prompt for the lead agent.',
		category: 'text',
		tags: ['skill', 'ai agent workflow prompt', 'workflow automation', 'agent planning', 'ai agents'],
		author: 'Free Prompt Base',
		date: '2026-07-24',
		featured: true,
		popularity: 0,
		howToUse:
			'Replace [GOAL] with a real outcome such as "triage inbound support", "research competitor launches", or "prepare a weekly content brief". Start with draft-only tool permissions, then widen them after the workflow passes review.',
	},
	{
		slug: 'mcp-tool-contract-designer',
		title: 'Safe MCP Tool Design Prompt',
		description:
			'Use this MCP tool design prompt to define a small, safe agent tool with input validation, confirmation steps, and clear error handling.',
		promptText:
			'You are designing a Model Context Protocol tool for this capability: [CAPABILITY]. The users are [USER TYPE], and the connected system is [SYSTEM].\n\nCreate a production-ready tool contract. Include:\n- A precise tool name and one-sentence purpose\n- Input schema: each field, type, required/optional state, validation, and a realistic example\n- Output schema: success result, partial result, and no-result state\n- Side effects and the exact confirmation required before any destructive or external action\n- Authentication and least-privilege access requirements\n- Idempotency and retry behavior\n- Error codes with agent-facing recovery instructions\n- Three example calls: routine success, ambiguous input, and safe refusal\n\nDo not create a broad do-everything tool. Break [CAPABILITY] into small composable tools when the operation mixes searching, reading, writing, or publishing. Use plain language that a coding agent can follow without guessing.',
		category: 'text',
		tags: ['skill', 'mcp tool design prompt', 'model context protocol', 'ai agent tools', 'developer'],
		author: 'Free Prompt Base',
		date: '2026-07-24',
		featured: false,
		popularity: 0,
		howToUse:
			'Use this before implementing an MCP server or adding a new agent capability. Good inputs are narrow: "create a draft GitHub issue" is better than "manage GitHub".',
	},
	{
		slug: 'agent-evaluation-and-security-review',
		title: 'AI Agent Security Testing Prompt',
		description:
			'Use this AI agent security testing prompt to write adversarial evals for prompt injection, tool misuse, and unsafe actions before launch.',
		promptText:
			'Act as an AI agent evaluator and security reviewer. Assess this agent: [AGENT DESCRIPTION]. Its tools are: [TOOLS]. Its allowed actions are: [ALLOWED ACTIONS].\n\nCreate a risk-ranked evaluation plan. Include:\n1. The agent\'s intended behavior and explicit boundaries\n2. High-risk failure modes, including prompt injection from external content, wrong-recipient actions, data disclosure, looping, destructive commands, and fabricated completion\n3. A table of test cases with setup, adversarial input, expected safe behavior, pass/fail signal, and severity\n4. Tests for permission escalation, confirmation handling, retries, and partial failures\n5. Observability requirements: logs, trace fields, redaction, alerts, and a human review queue\n6. A release gate with measurable thresholds and rollback triggers\n\nBe concrete. Write tests that a team can run this week. Flag any operation that should remain human-approved rather than automated.',
		category: 'text',
		tags: ['skill', 'ai agent security prompt', 'agent evaluation', 'prompt injection testing', 'ai safety'],
		author: 'Free Prompt Base',
		date: '2026-07-24',
		featured: true,
		popularity: 0,
		howToUse:
			'Paste the real tool list and permissions, not a summary. Use the resulting cases as a test matrix before enabling write access or autonomous runs.',
	},
	{
		slug: 'multi-agent-content-quality-pipeline',
		title: 'Multi-Agent Content Workflow Prompt',
		description:
			'Use this multi-agent content workflow prompt to create drafts with source checks, editor review, and no direct publishing.',
		promptText:
			'You are an editorial operations lead. Design a review-first multi-agent pipeline for this content outcome: [CONTENT GOAL]. Audience: [AUDIENCE]. Available source material: [SOURCES].\n\nAssign focused roles for research, outline, drafting, fact-checking, voice editing, and final approval. For every role define: input, output, quality bar, forbidden behavior, and handoff.\n\nThe workflow must require:\n- A source ledger separating verified facts, assumptions, and original analysis\n- A redundancy check that removes repeated ideas and generic filler\n- A fact-check pass that flags claims needing a primary source\n- A voice pass that preserves a human point of view and avoids templated language\n- A final editor gate before anything is published\n\nReturn a concise runbook, a content brief template, and a final publish checklist. Do not let any agent publish directly.',
		category: 'text',
		tags: ['skill', 'multi-agent content workflow', 'ai content prompt', 'editorial workflow', 'content quality'],
		author: 'Free Prompt Base',
		date: '2026-07-24',
		featured: false,
		popularity: 0,
		howToUse:
			'Use it for newsletters, video scripts, product pages, or blog production. Replace [SOURCES] with the actual links, notes, interviews, or data the team can verify.',
	},
];
