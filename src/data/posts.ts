// ---------------------------------------------------------------------------
// Blog post seed data. Posts live in D1 (managed via /admin/cms) — this file
// just bootstraps the live site with 3 starter posts. Generated into
// db/seed.sql by scripts/gen-seed.ts. Schema matches src/lib/cms.ts Post type.
// ---------------------------------------------------------------------------

export interface SeedPost {
	id: string;
	slug: string;
	title: string;
	excerpt: string;
	/** HTML content — cms.ts auto-detects HTML vs JSON. */
	content: string;
	authorName: string;
	publishedAt: string;
	coverImage?: string;
	readTime: string;
	metaDescription?: string;
}

export const posts: SeedPost[] = [
	{
		id: 'seed_post_midjourney_cinematic',
		slug: 'how-to-write-midjourney-prompts',
		title: 'How to Write Midjourney Prompts That Actually Look Cinematic',
		excerpt:
			'Six concrete levers — subject, lens, lighting, color, composition and rendering — that turn a generic Midjourney output into something worth printing.',
		authorName: 'Admin',
		publishedAt: '2026-05-22',
		readTime: '4 min read',
		metaDescription:
			'Six concrete levers (subject, lens, lighting, color, composition, rendering) for cinematic Midjourney prompts.',
		content: `
<p>Most Midjourney prompts fail for the same reason: they describe a <em>subject</em> and forget that an image is also a <em>medium</em>. A good prompt directs a virtual film crew, not just the actor. Pull these six levers in order and you'll skip 80% of the trial-and-error.</p>

<h2>1. Lock the subject before anything else</h2>
<p>Start with one clear noun and one descriptor. "A fisherman" is weak. "An elderly Portuguese fisherman, weathered hands, salt-stained jacket" gives Midjourney something to commit to. Specificity collapses the search space.</p>

<h2>2. Pick a lens</h2>
<p>The lens word matters more than any "8k masterpiece" tag. A few that produce reliably different results:</p>
<ul>
	<li><strong>35mm</strong> — environmental, documentary feel.</li>
	<li><strong>85mm</strong> — flattering portrait compression, shallow depth of field.</li>
	<li><strong>24mm wide</strong> — dramatic, slightly distorted, great for landscapes and rooms.</li>
	<li><strong>macro</strong> — extreme close-up texture.</li>
</ul>

<h2>3. Name the lighting</h2>
<p>Lighting is what separates a snapshot from a frame. Try <em>"soft golden hour rim light"</em>, <em>"hard north-facing window light"</em>, <em>"single practical lamp, deep shadows"</em>. If you say nothing, Midjourney defaults to flat, even fill — the worst possible look.</p>

<h2>4. Choose a color grade</h2>
<p>Cinema lives on color grades. "Teal and orange" is the obvious one but try "muted earth tones", "warm sodium-vapor", "desaturated, high-contrast monochrome with a single red accent". The grade tells the renderer what mood you want.</p>

<h2>5. Direct the composition</h2>
<p>Add a composition cue: <em>rule of thirds</em>, <em>centered symmetry</em>, <em>low-angle hero shot</em>, <em>over-the-shoulder</em>, <em>Dutch tilt</em>. This is the single highest-leverage word group you can add.</p>

<h2>6. Close with rendering style</h2>
<p>Finish with the medium itself: <em>shot on Arri Alexa</em>, <em>Kodak Portra 400</em>, <em>large-format film grain</em>, <em>ultra detailed photorealistic</em>. Keep it to two or three tokens — more dilutes the signal.</p>

<h2>A worked example</h2>
<p>Bad: <em>"a fisherman by the sea, beautiful, 8k"</em></p>
<p>Better: <em>"cinematic portrait of an elderly Portuguese fisherman, 85mm lens, shallow depth of field, soft golden hour rim light, muted teal-and-orange grade, low-angle hero shot, shot on Arri Alexa, ultra detailed, photorealistic --ar 4:5 --style raw --v 6"</em></p>

<p>Same subject, completely different image. The trick isn't more words — it's the <em>right</em> six.</p>
`.trim(),
	},
	{
		id: 'seed_post_prompt_patterns',
		slug: 'prompt-patterns-that-work',
		title: 'Five Prompt Patterns That Quietly Outperform Everything Else',
		excerpt:
			'Role priming, constraints-first, worked examples, chain-of-thought and "rate then revise" — when each one wins and a copy-paste template for each.',
		authorName: 'Admin',
		publishedAt: '2026-05-18',
		readTime: '3 min read',
		content: `
<p>After a year of A/B-testing prompts against each other, five patterns keep winning. None of them are exotic. All of them get used 10× less than they should.</p>

<h2>1. Role priming</h2>
<p>Open with who the model should <em>be</em>, not what it should do. "You are a senior copy chief at a B2B SaaS company" outperforms a generic "write me copy" by a noticeable margin because it pulls in a whole cluster of vocabulary, taste and rules.</p>
<p><strong>Template:</strong> <em>"You are a [role] at [context]. Your job is to [task]. You care about [3 specific values]."</em></p>

<h2>2. Constraints-first</h2>
<p>Lead with the limits before the task. Word count, audience, tone, things to avoid. Models obey constraints better when they appear before the request, not after.</p>
<p><strong>Template:</strong> <em>"Constraints: under 120 words, no jargon, no em-dashes, second person. Now write [task]."</em></p>

<h2>3. Worked example (one-shot)</h2>
<p>A single high-quality example beats five paragraphs of instruction. Show one input → output pair, then ask for the next one.</p>
<p><strong>Template:</strong> <em>"Here is an example. Input: [X]. Output: [Y]. Now do the same for: [Z]."</em></p>

<h2>4. Chain-of-thought, but bounded</h2>
<p>"Think step by step" is overrated. "Think step by step, but only write the final answer" is what you actually want for most tasks — you get the reasoning quality without the wall of text.</p>

<h2>5. Rate then revise</h2>
<p>Have the model produce a draft, score it 1-10 on three named criteria, then rewrite to fix the lowest score. One extra round trip, dramatically better output.</p>
<p><strong>Template:</strong> <em>"Draft an answer. Then rate it 1-10 on clarity, specificity and originality. Identify the lowest score. Rewrite to fix it."</em></p>

<h2>Mix and match</h2>
<p>The strongest prompts stack two or three of these. Role + constraints + worked example is the workhorse combination — try it next time and see.</p>
`.trim(),
	},
	{
		id: 'seed_post_chatgpt_frameworks',
		slug: 'chatgpt-prompt-frameworks',
		title: 'The Three ChatGPT Prompt Frameworks Worth Memorizing',
		excerpt:
			'CRAFT, RTF and CARE — what they actually mean, when each one fits, and the situations where ignoring all three is the right call.',
		authorName: 'Admin',
		publishedAt: '2026-05-14',
		readTime: '3 min read',
		content: `
<p>Prompt "frameworks" are mostly mnemonics for stuff you'd do anyway if you slowed down. But three of them actually pay rent. Memorize these and you can stop bookmarking Twitter threads.</p>

<h2>CRAFT — Context, Role, Action, Format, Tone</h2>
<p>The most complete framework. Use it when the output quality matters and you can spare 30 seconds to write a real prompt.</p>
<ul>
	<li><strong>Context</strong> — the situation, audience, background.</li>
	<li><strong>Role</strong> — who the model is playing.</li>
	<li><strong>Action</strong> — the specific task.</li>
	<li><strong>Format</strong> — bullets, table, JSON, length.</li>
	<li><strong>Tone</strong> — voice, register, energy.</li>
</ul>
<p><em>"Context: I run a B2B newsletter for ops leaders. Role: you are an editor with 10 years of experience. Action: pick the strongest of these 3 subject lines. Format: a short verdict + one sentence why. Tone: blunt, no hedging."</em></p>

<h2>RTF — Role, Task, Format</h2>
<p>The 80/20 version. Use it for quick, repeated requests where CRAFT is overkill. Most chat sessions should live here.</p>
<p><em>"You are a code reviewer. Find the bug in this function. Reply with: line number, problem, one-line fix."</em></p>

<h2>CARE — Context, Action, Result, Example</h2>
<p>Best when you need a specific <em>shape</em> of output. The example does most of the work; the rest just primes it.</p>
<p><em>"Context: I'm writing an FAQ page. Action: turn this paragraph into a Q&amp;A. Result: 3 Q&amp;A pairs. Example: Q: How long does shipping take? A: Usually 3-5 business days."</em></p>

<h2>When to skip frameworks entirely</h2>
<p>For exploratory questions ("brainstorm 20 angles for…"), frameworks <em>hurt</em>. They narrow the model when you want it wide. Save the structure for tasks with a right answer; leave the open-ended ones loose.</p>
`.trim(),
	},
];
