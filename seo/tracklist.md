# Keyword → Page Tracklist — freepromptbase.com

> The mapping of target keyword → URL. One **primary** keyword per page.
> Pages live as keyword landing pages at `/<slug>` (data in `src/data/tags.ts`,
> articles in `src/data/tag-articles/<slug>.json`). Categories at `/category/<slug>`.
> Legacy `/tag/<slug>` URLs 301 to `/<slug>`. See [keyword-research.md](keyword-research.md)
> for volumes & rationale. Index/noindex/redirect policy: `src/data/tag-seo.ts`.

## Priority targets (work these first)

| Priority | Page (URL) | Primary keyword | Cluster | KD | Status |
|---|---|---|---|---|---|
| P0 | `/nano-banana-prompt` | nano banana prompt | A | breakout | **Flagship** — optimized (Jun 2026) |
| P0 | `/gemini-ai-photo-prompt-copy-paste` | gemini ai photo prompt copy paste | B | 26 | Best low-KD target |
| P1 | `/nano-banana-ai` | nano banana ai | A | 78–90 | High vol |
| P1 | `/prompt-for-gemini-ai` | prompt for gemini ai | B | 42 | |
| P1 | `/gemini-ai-photo-prompt` | gemini ai photo prompt | B | low | Rising |
| P2 | `/gemini-couple-photo-prompt` | gemini couple photo prompt | B/D | low | Couple sub-niche |
| P2 | `/trending-gemini-prompt` | trending gemini prompt | B | low | Refresh often |
| P2 | (home) `/` | free ai prompts | C | 37 | Brand match |

## Full tag → keyword map (existing pages in `src/data/tags.ts`)

### Cluster A — Nano Banana
| Slug | Primary keyword |
|---|---|
| nano-banana-prompt | nano banana prompt |
| nano-banana | nano banana |
| nano-banana-ai | nano banana ai |
| banana-prompt | banana prompt |
| banana-prompts | banana prompts |
| banana-prompt-xyz | banana prompt xyz |

### Cluster B — Gemini AI photo prompts
| Slug | Primary keyword |
|---|---|
| gemini-ai-photo-prompt-copy-paste | gemini ai photo prompt copy paste |
| gemini-ai-prompt-copy-paste | gemini ai prompt copy paste |
| gemini-ai-photo-prompt | gemini ai photo prompt |
| ai-gemini-photo-prompt | ai gemini photo prompt |
| gemini-photo-prompt | gemini photo prompt |
| gemini-ai-photo | gemini ai photo |
| gemini-ai-foto | gemini ai foto |
| gemini-ai-photo-editor | gemini ai photo editor |
| gemini-photo-editing-prompt | gemini photo editing prompt |
| prompt-for-gemini-ai | prompt for gemini ai |
| prompt-for-gemini | prompt for gemini |
| gemini-ai-prompt | gemini ai prompt |
| ai-gemini-prompt | ai gemini prompt |
| ai-gemini | ai gemini |
| gemini-prompt-for-image-generation | gemini prompt for image generation |
| google-gemini-ai-photo-prompt | google gemini ai photo prompt |
| google-gemini-ai-photo | google gemini ai photo |
| google-gemini-ai-photo-editing-prompt | google gemini ai photo editing prompt |
| trending-gemini-prompt | trending gemini prompt |
| gemini-ai-photo-prompt-copy-paste-trending | gemini ai photo prompt copy paste trending |
| google-gemini-trending-photo-prompt | google gemini trending photo prompt |

### Cluster D — Adjacent / seasonal / modifiers / creator
| Slug | Primary keyword | Note |
|---|---|---|
| baby-krishna-ai-photo-editing-prompt | baby krishna ai photo editing prompt | 4-prompt devotional collection; 2 fictional samples per prompt (Aug 2026) |
| couple-prompt | couple prompt | |
| couple-prompt-for-gemini-ai | couple prompt for gemini ai | |
| gemini-couple-photo-prompt | gemini couple photo prompt | |
| chatgpt-caricature-prompt | chatgpt caricature prompt | |
| holi-prompt | holi prompt | **seasonal (Feb–Mar)** |
| prompt-for-gemini-ai-girl | prompt for gemini ai girl | modifier |
| prompt-for-gemini-ai-retro-style | prompt for gemini ai retro style | modifier |
| gemini-ai-photo-prompt-copy-paste-trending-boy | ...trending boy | modifier |
| gemini-ai-photo-prompt-copy-paste-trending-girl | ...trending girl | modifier |
| trending-prompt | trending prompt | |
| prompt-gemini-ai-foto-sendiri | prompt gemini ai foto sendiri | Indonesian |
| prompt-gemini | prompt gemini สร้าง ภาพ | Thai |
| ai-prompt-razz-suman | ai prompt razz suman | creator |
| ai-prompt-ghaus-editz | ai prompt ghaus editz | creator |
| anup-sagar-prompt | anup sagar prompt | creator |
| prompt-by-vikas-editing | prompt by vikas editing | creator |
| prompt-wala | prompt wala | creator/slang |
| mk-edit | mk edit | creator |

### News / other
| Slug | Primary keyword |
|---|---|
| openai-news | openai news |
| technology-news-today | technology news today |

## Categories
| URL | Keyword theme |
|---|---|
| /category/images | ai image prompts (Midjourney, Gemini, DALL·E) |

### Cluster E — Photo editing prompts (**SHIPPED 2026-07-14** — see [competitor-promptplum.md](competitor-promptplum.md))
| Slug | Primary keyword | Vol/KD | Notes |
|---|---|---|---|
| photo-editing-prompt | photo editing prompt | IN 720 / KD 18 | tool-agnostic angle; secondary: ai photo prompt |
| chatgpt-photo-editing-prompt | chatgpt photo editing prompts | IN 18,100 / KD 74 | grew 90× in 12 mo |
| ai-image-prompt | ai image prompts | US 720 / KD 9 | secondary: ai picture prompts (KD 8), image prompt |

Supporting blog posts shipped same day (in D1, see `seo/blog-posts-2026-07-14.sql`):
`/blog/chatgpt-photo-editing-prompts`, `/blog/how-to-edit-photos-with-ai-prompts`,
`/blog/anatomy-of-a-perfect-ai-image-prompt`, `/blog/gemini-face-consistency`,
`/blog/how-to-use-nano-banana-ai-free`, `/blog/nano-banana-vs-pro-vs-2`,
`/blog/trending-gemini-prompts`, `/blog/gemini-couple-photo-prompt-ideas`.
Free tool: `/tools/gemini-prompt-generator`. Homepage title now carries the cluster.

### Seasonal editorial blogs
| Page (URL) | Primary keyword | Cluster | Status |
|---|---|---|---|
| `/blog/15-august-ai-photo-prompts-independence-day` | 15 august ai photo prompts | Seasonal India | Published 2026-08-10 |

### Nano banana follow-ons + person-type tags (**SHIPPED 2026-07-14**)
| Slug | Primary keyword | Notes |
|---|---|---|
| nano-banana-pro | nano banana pro (18,100, KD 86) | Nov'25 model |
| nano-banana-2 | nano banana 2 | Feb'26 model, breakout |
| banana-ai | banana ai (5,400, KD 52) | head term |
| gemini-photo-prompt-for-man | gemini photo prompt for man | person-type |
| gemini-photo-prompt-for-woman | gemini photo prompt for woman | person-type, saree trend |
| gemini-family-photo-prompt | gemini family photo prompt | person-type |
| gemini-birthday-photo-prompt | gemini birthday photo prompt | person-type; promptplum's only linked pages are birthday/christmas |

## Gaps / candidates to add (from research + trend)
- `nano banana images` (KD 43) — close to our content, no dedicated page yet
- `google nano banana` (8,100, KD 76) — head variant
- `editing prompt` (IN 12,100, KD 76) / `prompt image` (IN 8,000, KD 74) / `image prompt` (IN 6,600, KD 69) — homepage/long-tail collectors, no dedicated page yet
