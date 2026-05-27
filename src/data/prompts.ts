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
	/** Optional extra guidance rendered on the detail page. */
	howToUse?: string;
	/** Image gallery rendered as a carousel on the detail page. cover_image is used for cards. */
	images?: string[];
	/** users.id of the admin who added this prompt (null for seed entries). */
	createdBy?: string;
	/** Submission workflow status. Public lists only show 'approved'. */
	status?: 'pending' | 'approved' | 'rejected';
	/** users.id of the submitter (user-submitted only; NULL for admin-created). */
	submittedBy?: string;
	submittedAt?: string;
	/** users.id of the admin who approved/rejected. */
	reviewedBy?: string;
	reviewedAt?: string;
	rejectionReason?: string;
}

const R2 = 'https://pub-a8f43320b2794bc5ad6fbb36a3523130.r2.dev/prompts';

export const prompts: Prompt[] = [
	{
		slug: 'hand-drawn-doodle-overlay',
		title: 'Hand-Drawn Doodle Photo Overlay',
		description:
			'Turn any photo into a scroll-stopping social post — playful hand-drawn doodles, motion lines and whimsical captions that react to the subject in the frame.',
		promptText:
			"Analyze the uploaded image and preserve the original subject, composition, and lighting. Do not alter the identity or structure of the main subject. Add playful, hand-drawn doodles that interact directly with the subject in the image. The doodles should mimic, follow, or exaggerate the shapes, gestures, or motion present — such as outlining poses, extending limbs, adding motion lines, or creating imaginative elements that 'respond' to the subject.\n\nEnsure the doodles feel naturally integrated into the scene, as if they were drawn on top of the photo with intention. Use a sketchy, imperfect, hand-drawn style with organic lines, slightly uneven strokes, and a casual illustrated feel. Include whimsical handwritten text elements placed around the image. The text should match the mood or implied context of the scene, with a playful and spontaneous tone.\n\nAvoid fixed phrases — generate context-aware, creative, and humorous text that fits each unique image. Maintain a balanced composition so the doodles enhance the image without overwhelming the original subject. Keep the overall aesthetic fun, expressive, and social-media-ready. High resolution, clean overlay, vibrant yet natural color harmony.",
		category: 'image-generation',
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
		category: 'image-generation',
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
		category: 'image-generation',
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
		category: 'image-generation',
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
];
