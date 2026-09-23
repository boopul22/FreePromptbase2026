# Free Prompt Base

Production repository for [freepromptbase.com](https://freepromptbase.com): an
Astro application deployed as a Cloudflare Worker with D1, R2, KV, Email, and a
one-minute social publishing Cron.

## Project boundaries

Free Prompt Base is the primary project. Its social scheduler publishes each
standard campaign to:

1. Instagram `freepromptbase`
2. Facebook Page `Free Prompt Base`

`Raga whisper` is a separate external project, not another Free Prompt Base
account. Read [RAGA_WHISPER_PUBLISHING_GUIDE.md](RAGA_WHISPER_PUBLISHING_GUIDE.md)
before changing or troubleshooting that integration.

Raga-only scheduled Reels run fully in Cloudflare through an isolated D1 queue
and R2 media prefix. They do not create Instagram or Free Prompt Base Facebook
posts and continue publishing while the source Mac is off.

The separate standalone Raga-only uploader lives outside this repository at:

```text
/Volumes/Mac_ssd1/Raga_wishper/Raga Whisper Facebook Uploader
```

Never run that uploader for a campaign already owned by this Cloudflare
scheduler.

## Required guides

- [AGENTS.md](AGENTS.md) — repository rules and task routing.
- [aiPromptpublishguide.md](aiPromptpublishguide.md) — prompt publishing.
- [instagramPostGuide.md](instagramPostGuide.md) — complete social campaign
  creation and verification.
- [RAGA_WHISPER_PUBLISHING_GUIDE.md](RAGA_WHISPER_PUBLISHING_GUIDE.md) — the
  independent Raga-only cloud Reel queue, recovery state, and deployment
  procedure. PromptBase campaigns must never publish to Raga.
- [PRODUCT.md](PRODUCT.md) — product and brand context.

## Development

```bash
npm install
npm run dev
```

Useful checks:

```bash
npm run test:social
npm run build
npm run cf-typegen
```

## Cloudflare

Configuration is in `wrangler.jsonc`. Secrets stay in Cloudflare and must not be
committed or printed.

```bash
npx wrangler secret list --name freepromptbase2026
npx wrangler deploy
```

Production resources include Worker `freepromptbase2026`, D1 database
`freepromptbase-com`, R2 bucket `freepromptbase-media-2026`, and a Cron trigger
running every minute.
