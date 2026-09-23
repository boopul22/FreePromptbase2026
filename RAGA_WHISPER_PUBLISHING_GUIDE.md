# Raga whisper Facebook Publishing Guide

Last updated: 2026-08-22

## Purpose and ownership

`Raga whisper` is a **separate external project** with its own Facebook Page. It
is not a Free Prompt Base brand account, database, Instagram account, or content
source.

Free Prompt Base remains the primary project and owns the Cloudflare Worker,
but standard PromptBase campaigns never publish to Raga whisper. Raga uses only
its dedicated cloud Reel queue or an explicitly requested immediate manual
post.

| Destination | Ownership | Identifier | Order |
| --- | --- | --- | --- |
| Instagram `freepromptbase` | Free Prompt Base | `28022656494035186` | 1 |
| Facebook `Free Prompt Base` | Free Prompt Base | `1240248679172928` | 2 |
| Facebook `Raga whisper` | Separate external project | `1277300398800100` | Raga-only jobs |

The projects have intentionally separate Cloudflare flows:

1. A Free Prompt Base campaign publishes to Free Prompt Base Instagram and
   Facebook only. It never calls the Raga Page.
2. A Raga-only Reel schedule uses `raga_reel_jobs` plus R2. It never creates an
   Instagram delivery or posts to the Free Prompt Base Facebook Page.

## Source of truth

Production scheduling belongs to:

```text
/Volumes/Mac_ssd1/Websites/Bipul/freepromptbase.com
```

Important files:

- `src/lib/socialScheduler.ts` — health checks, Page allowlisting, publishing,
  retries, and durable state.
- `src/worker.ts` — one-minute Cron entrypoint.
- `wrangler.jsonc` — non-secret Page IDs and Cloudflare bindings.
- `src/pages/admin/cms/social.astro` — scheduler dashboard and permalinks.
- `tests/socialScheduler.test.mjs` — duplicate-prevention and recovery tests.
- `src/lib/ragaReelScheduler.ts` — isolated Raga-only hosted Reel publisher.
- `db/migrations/0025-raga-reel-scheduler.sql` — independent Reel queue schema.
- `scripts/raga-cloud-batch.mjs` — validated R2 upload and idempotent D1 loader.
- `tests/ragaReelScheduler.test.mjs` — Reel phase/retry duplicate-prevention.
- `instagramPostGuide.md` — complete Free Prompt Base campaign/media workflow.
- This guide — Raga-specific architecture and operations.

## Raga-only cloud Reel flow

Raga-only scheduled videos use the same Worker deployment but not the same
campaign system. This is the production path for schedules that must work while
the Mac is off:

```text
local source (one-time import) -> R2 video -> D1 raga_reel_jobs
                                      |              |
                                      +-- public CDN <- Worker Cron (every minute)
                                                        |
                                                        +-> Raga whisper only
```

The Worker starts a Facebook Reel upload, stores Meta's `video_id` immediately,
asks Meta to fetch the MP4 from `/cdn/raga/reels/...`, finishes publishing, and
polls processing state. Each remote mutation is saved before the next phase.
Retries always reuse the saved `video_id`; they do not create replacement Reels.

The Raga queue statuses are `scheduled`, `running`, `processing`, `retrying`,
`published`, `failed`, and `canceled`. A ten-minute lease protects against
overlapping Cron invocations. Transient Meta/network failures back off and retry
up to five times. A processing Reel is polled every minute without resending the
start, upload, or finish calls.

The `finalv2` batch uses keys under `raga/reels/finalv2/`. Item 1 was published
immediately and is intentionally excluded; items 2–62 are the cloud schedule.

## Completed production snapshot

This records the state verified on 2026-08-22. A later deployment may change
the Worker version ID without changing the architecture.

| Component | Verified production value |
| --- | --- |
| Raga destination | `Raga whisper`, Page ID `1277300398800100` |
| Worker | `freepromptbase2026` |
| Verified Worker version | `9be0a27b-ea1a-49ba-bf70-4e31618d4fd5` |
| Cron | Every minute: `* * * * *` |
| D1 database | `freepromptbase-com` |
| R2 bucket | `freepromptbase-media-2026` |
| Public media base | `https://freepromptbase.com/cdn` |
| Batch | `finalv2` |
| Cloud jobs | 61 unique jobs: items 2–62 |
| Cloud schedule | `2026-08-22 14:00:00Z` through `2026-09-21 14:00:00Z` |
| Local scheduler | Not installed; local queued jobs canceled |

Item 1 was intentionally published before the cloud queue was created:

- Meta video ID: `2268848650535311`
- Permalink: `https://www.facebook.com/reel/2268848650535311/`
- It must never be added to the `finalv2` D1 queue.

The final verification established:

- all 61 MP4 objects returned HTTP 200, `video/mp4`, and their exact non-zero
  `Content-Length`;
- D1 contained exactly 61 unique idempotency keys in `scheduled` state;
- the first and last timestamps matched the metadata;
- no YouTube-only YAML fields leaked into any Facebook caption;
- all 13 current social scheduler tests and the production build passed; and
- one live Cron event ran both publishers successfully and independently.

## 2026-08-22 boundary correction

An earlier Worker version incorrectly treated Raga as an additional destination
for standard PromptBase campaigns. That behavior was removed completely. The
current regression test fails if PromptBase Facebook publishing calls the Raga
Page, and future PromptBase campaigns publish only to PromptBase Instagram and
Facebook.

Before the correction deployed, exactly one PromptBase copy reached Raga:

- Prompt slug: `cinematic-double-exposure-portrait-poster-prompt`
- Raga post ID: `1277300398800100_122098271457451394`
- Permalink:
  `https://www.facebook.com/122097183399451394/posts/122098271457451394`

That existing post was not deleted automatically because deletion requires an
explicit destructive-action decision. No other PromptBase campaign had Raga
state, and all future scheduled PromptBase campaigns were still untouched when
the corrected Worker deployed.

## Future Reel batch runbook

Use this section for every future Raga-only video upload and schedule. Run all
commands from the Free Prompt Base repository unless a command says otherwise.

### 1. Choose an immutable batch slug

Every batch needs a new lowercase slug such as `september-ragas` or
`wisdom-v3`. It becomes part of the R2 keys, D1 IDs, and idempotency keys.
Never reuse an old slug for different media or captions.

Set the batch environment without editing source code:

```bash
export RAGA_REEL_SOURCE="/absolute/path/to/the/batch"
export RAGA_REEL_BATCH="september-ragas"
export RAGA_REEL_FIRST="1"
export RAGA_REEL_LAST="30"
```

The defaults remain the completed `finalv2` import: source
`/Volumes/Mac_ssd1/Root_download_new/finalv2`, batch `finalv2`, first item `2`,
last item `62`.

### 2. Prepare the folder and metadata

The source folder must contain one numbered folder per item in the configured
inclusive range:

```text
batch-root/
  1/
    metadata.md
    reel_01_final.mp4
  2/
    metadata.md
    reel_02_final.mp4
```

Each `metadata.md` must use this shape:

```markdown
---
title: "One Flame Can Train A Restless Mind"
video: "reel_01_final.mp4"
description: |
  A wandering mind returns home, one flame at a time. 🥀 🖤
publish_at: "2026-09-01T05:00:00Z"
---

#poetry #quotes #deepthoughts #trataka #meditation
```

Other YAML fields may exist for another platform, but the Facebook caption is
always constructed only from:

```text
title

description

Markdown body hashtags
```

Fields such as `privacy`, `category_id`, `tags`, `language`, and
`made_for_kids` are ignored. `publish_at` controls D1 scheduling and must include
an explicit timezone (`Z` or `+/-HH:MM`). D1 stores UTC. For reference, `05:00Z`
is 10:30 AM IST and `14:00Z` is 7:30 PM IST.

The loader rejects a batch unless every configured item exists, schedules are
strictly increasing, and every video is H.264, AAC, 9:16, at least 23 fps, and
4–60 seconds long.

### 3. Decide how the first Reel is published

Choose exactly one owner before doing anything:

- Fully cloud: include item 1 in the configured range and give it a current or
  future `publish_at`. After seeding, the next Cron publishes it when due.
- Explicit immediate manual post: publish it once with the standalone local
  uploader, then set `RAGA_REEL_FIRST=2` so the cloud queue excludes it.

Never publish an item manually after its D1 job exists. Local SQLite and cloud
D1 cannot detect duplicates across systems.

### 4. Run the non-mutating validation

```bash
cd /Volumes/Mac_ssd1/Websites/Bipul/freepromptbase.com
npm run raga:cloud-batch
```

Review the item count, total size, first timestamp, and last timestamp. Stop if
any value is unexpected. This command does not upload or create jobs.

### 5. Confirm production prerequisites

No new Meta app is needed while the existing Worker token can still resolve
`Raga whisper` with `CREATE_CONTENT`. The required secret is
`FB_PAGE_ACCESS_TOKEN`; never print it or place it in a guide, command history,
R2, or D1.

Confirm these existing Wrangler bindings before proceeding:

```text
DB                 freepromptbase-com
R2                 freepromptbase-media-2026
R2_PUBLIC_URL      https://freepromptbase.com/cdn
RAGA_FB_PAGE_ID    1277300398800100
```

The CDN route already allows `raga/reels/`, supports `GET` and `HEAD`, and sends
`Content-Type` plus `Content-Length`, which the hosted Reel transfer requires.

### 6. Upload videos to R2

```bash
npm run raga:cloud-batch -- --upload
```

The loader uploads three objects concurrently to:

```text
raga/reels/<batch-slug>/<video filename from metadata>
```

It sets `Content-Type: video/mp4` and immutable caching. If a long terminal
session stops, preserve the completed objects and resume at the first uncertain
item:

```bash
npm run raga:cloud-batch -- --upload --start=48
```

Re-uploading the first uncertain object is safe because it overwrites the same
R2 key before any D1 job is created. Do not change its file after jobs are
seeded.

### 7. Verify every public cloud object

```bash
npm run raga:cloud-batch -- --verify
```

This performs a public `HEAD` check for the entire configured batch and requires
HTTP success, `video/mp4`, and a `Content-Length` exactly matching the local
file. Do not seed D1 if verification fails.

For one manual check:

```bash
curl -I "https://freepromptbase.com/cdn/raga/reels/<batch-slug>/<video>.mp4"
```

### 8. Seed the independent D1 queue

Only after cloud verification succeeds:

```bash
npm run raga:cloud-batch -- --seed
```

The loader creates IDs in these forms:

```text
id:              raga-<batch>-<item number>
idempotency_key: raga-whisper-<batch>-reel-<item number>-v1
```

Seeding is idempotent: rerunning it does not duplicate existing keys. It also
does not overwrite an existing job, so always audit D1 after seeding. For small
batches, `--all` runs upload, public verification, and seed in that order; for a
large batch, use the separate resumable phases above.

### 9. Audit the schedule before the first due time

```bash
npx wrangler d1 execute freepromptbase-com --remote --json --command \
  "SELECT status, COUNT(*) AS count FROM raga_reel_jobs WHERE id LIKE 'raga-<batch>-%' GROUP BY status;
   SELECT id, title, scheduled_at, status, video_r2_key FROM raga_reel_jobs WHERE id LIKE 'raga-<batch>-%' ORDER BY scheduled_at;"
```

Confirm the count, order, titles, UTC timestamps, R2 keys, and that every new
row is `scheduled`. Also spot-check a full caption:

```bash
npx wrangler d1 execute freepromptbase-com --remote --json --command \
  "SELECT title, caption FROM raga_reel_jobs WHERE id='raga-<batch>-01';"
```

### 10. Observe Cron and verify the live Reel

```bash
npx wrangler tail freepromptbase2026 --format pretty
```

Expected log events are independent:

```text
social_cron
raga_reel_cron
```

When a Raga item is due, it normally moves through `running`, `processing`, and
`published`. Once published, verify `remote_id`, `permalink`, `published_at`, and
the actual Page caption/video:

```bash
npx wrangler d1 execute freepromptbase-com --remote --json --command \
  "SELECT id, status, attempts, failure_count, remote_id, permalink, published_at, last_error FROM raga_reel_jobs WHERE id='raga-<batch>-01';"
```

Do not consider the batch complete merely because it was seeded. Confirm the
first live Reel, then monitor failed jobs for the rest of the schedule.

## Reel queue data and recovery

`raga_reel_jobs` is separate from `social_campaigns` and `social_deliveries`.
Its important fields are:

| Field | Meaning |
| --- | --- |
| `idempotency_key` | Prevents duplicate batch insertion |
| `video_r2_key` | Publicly served R2 source object |
| `scheduled_at` | UTC due time |
| `status` | Queue lifecycle state |
| `attempts` | Number of Worker claims, including processing polls |
| `failure_count` | Actual Meta/network failures |
| `next_attempt_at` | Backoff or processing poll time |
| `lease_expires_at` | Protects against overlapping Worker claims |
| `state_json.videoId` | Durable Meta video ID; core duplicate guard |
| `state_json.uploadComplete` | Hosted transfer completed |
| `state_json.finishSentAt` | Publish finish request completed |
| `remote_id`, `permalink` | Published Facebook result |
| `last_error` | Most recent failure without secrets |

The Worker stores `videoId` immediately after Meta starts the upload. Every
retry resumes that same ID and skips completed phases. Never clear `state_json`,
`remote_id`, or `finishSentAt` to force a retry; doing so can create duplicates.

Transient network/Meta errors retry automatically with exponential backoff.
After the automatic limit, inspect the row and Meta state before any manual
action. To retry a genuinely failed job while preserving duplicate protection:

```bash
npx wrangler d1 execute freepromptbase-com --remote --command \
  "UPDATE raga_reel_jobs SET status='retrying', failure_count=0, next_attempt_at=datetime('now'), lease_expires_at=NULL, last_error=NULL, updated_at=datetime('now') WHERE id='<job-id>' AND status='failed';"
```

Only an untouched job may be rescheduled or canceled:

```bash
# Reschedule; use a UTC SQL timestamp.
npx wrangler d1 execute freepromptbase-com --remote --command \
  "UPDATE raga_reel_jobs SET scheduled_at='<YYYY-MM-DD HH:MM:SS>', updated_at=datetime('now') WHERE id='<job-id>' AND status='scheduled' AND attempts=0;"

# Cancel before it starts.
npx wrangler d1 execute freepromptbase-com --remote --command \
  "UPDATE raga_reel_jobs SET status='canceled', updated_at=datetime('now') WHERE id='<job-id>' AND status='scheduled' AND attempts=0;"
```

Always run a read-only `SELECT` immediately before and after a manual update.
Never delete a job to resolve a failure, never create a replacement key for the
same Reel, and never delete or replace an R2 object owned by a scheduled,
running, processing, or retrying job.

## Separate standalone local project

The local project below is a separate manual/rollback uploader:

```text
/Volumes/Mac_ssd1/Raga_wishper/Raga Whisper Facebook Uploader
```

It is useful for an explicitly requested immediate manual text, link, photo, or
Reel post. It is **not** the production scheduler and does not share D1
idempotency state with Cloudflare. The project was converted to Facebook-only:
its active CLI has no Instagram publishing commands and enforces Page ID
`1277300398800100`. Its macOS LaunchAgent is not installed, and the canceled
historical local queue must not be reactivated for a cloud-owned batch.

Never submit the same campaign to both systems. If Cloudflare owns a campaign,
inspect and retry it in `/admin/cms/social`; do not use `fb-page publish-now` as
a workaround. The local uploader could create a duplicate because its SQLite
idempotency keys are invisible to the Worker.

## Credentials and allowlisting

The Worker uses one secret:

```text
FB_PAGE_ACCESS_TOKEN
```

Despite its legacy name, this value is a Facebook User access token. At runtime
the Worker calls `/me/accounts` and resolves a Page-scoped token separately for
each Facebook Page. Tokens must never appear in source, logs, D1, campaign JSON,
the dashboard, or this guide.

The Page IDs are non-secret Wrangler variables:

```text
FB_PAGE_ID=1240248679172928
RAGA_FB_PAGE_ID=1277300398800100
```

The Worker verifies both ID and exact Page name and requires `CREATE_CONTENT`:

- `1240248679172928` must be named `Free Prompt Base`.
- `1277300398800100` must be named `Raga whisper`.

PromptBase health checks resolve only Instagram `freepromptbase` and Facebook
`Free Prompt Base`. The independent Reel scheduler resolves only
`RAGA_FB_PAGE_ID` and the exact Page name `Raga whisper`.

## Hard project boundary

- `social_campaigns` and `social_deliveries` belong only to PromptBase.
- `raga_reel_jobs` belongs only to Raga whisper.
- Standard PromptBase campaigns must never call `RAGA_FB_PAGE_ID`.
- Only `ragaReelScheduler.ts` may resolve the Raga Page for automatic posts.
- Never add Raga-copy state such as `ragaPhotoIds`, `ragaPostId`, or
  `ragaPermalink` to a PromptBase delivery.

## Health and verification

In the admin dashboard, open `/admin/cms/social` and select **Check
connections**. A healthy PromptBase response must identify:

- Instagram `freepromptbase`;
- Facebook `Free Prompt Base`.

After a campaign publishes, verify:

1. Instagram delivery is `published` with its permalink.
2. Facebook delivery is `published` with the Free Prompt Base permalink.
3. No Raga fields exist in the Facebook delivery state.
4. The Free Prompt Base post contains the expected message and attachments.

Read-only D1 inspection example:

```bash
npx wrangler d1 execute freepromptbase-com --remote --command \
  "SELECT c.prompt_slug, c.status, d.status AS delivery_status, d.permalink, d.state_json, d.last_error FROM social_campaigns c JOIN social_deliveries d ON d.campaign_id=c.id WHERE c.id='<campaign-id>';" \
  --json
```

Never edit `state_json` directly in production.

Raga Reel queue inspection:

```bash
npx wrangler d1 execute freepromptbase-com --remote --command \
  "SELECT id, scheduled_at, status, remote_id, permalink, last_error FROM raga_reel_jobs ORDER BY scheduled_at;" --json
```

Confirm each R2 source URL returns `200`, `Content-Type: video/mp4`, and a
non-zero `Content-Length`. Do not seed a job until its object is uploaded.

One-time batch loader commands (run only from the repository):

```bash
npm run raga:cloud-batch              # validate/dry-run
npm run raga:cloud-batch -- --upload  # upload item 2–62 videos to R2
npm run raga:cloud-batch -- --verify  # verify every public hosted MP4
npm run raga:cloud-batch -- --seed    # idempotently create item 2–62 D1 jobs
```

## Deployment checklist

From the Free Prompt Base repository:

```bash
npm run test:social
npm run build
npm run cf-typegen
npx wrangler deploy
```

Require all scheduler tests and the build to pass. Confirm the deployed binding
list includes:

```text
FB_PAGE_ID      1240248679172928
RAGA_FB_PAGE_ID 1277300398800100
```

Then confirm the site returns HTTP 200 and inspect D1 for unexpected due,
running, retrying, or failed campaigns. A deployment does not authorize a test
post; create one only when the user explicitly asks.

## Scope rules

- PromptBase campaigns must never publish or copy content to Raga.
- Raga-only manual posts belong to the standalone local uploader.
- Raga-only scheduled Reels belong to `raga_reel_jobs`, R2, and the Worker.
- Free Prompt Base campaign content remains sourced and validated by the Free
  Prompt Base publishing workflow.
- Do not add Raga Instagram, PromptBase cross-posting, or a new Page without an
  explicit new requirement and migration plan.
