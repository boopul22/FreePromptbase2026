# ig-agent-cli

A small local Instagram scheduler for AI agents. It uses Meta's official Instagram API directly and stores scheduled jobs in SQLite.

There is no web dashboard, Docker stack, paid scheduler, or hosted database.

## What it supports

- Image posts
- Reels
- Image or video Stories
- Carousels with 2 to 10 items
- Future scheduling in SQLite
- Foreground worker or one-shot `run-due` execution
- Listing, cancellation, retry, and job inspection
- JSON input and output for AI agents
- Local idempotency keys to prevent duplicate scheduling
- Retry with exponential backoff for temporary Meta/network errors

## Important Meta limitation

The program runs locally, but Meta must download each image or video from a public HTTPS URL. A local path such as `./post.jpg` cannot be sent directly to the Instagram publishing endpoint.

The MVP therefore accepts public HTTPS media URLs. You can later add an upload adapter for storage you already use.

## Meta setup

The simplest route is **Instagram API with Instagram Login**:

1. Change the Instagram account to Business or Creator.
2. Create a Meta developer app.
3. Add the Instagram product and configure Business Login for Instagram.
4. Request `instagram_business_basic` and `instagram_business_content_publish`.
5. Generate an Instagram user access token and find the Instagram user ID.

For a tool used only by your own app-role/test account, you can develop privately. Apps that connect unrelated public users generally need Live mode, App Review, and the appropriate access level.

The older Facebook Login flow is also supported by configuration. It normally requires a Facebook Page linked to the professional Instagram account and a Page access token.

## Install

Python 3.10 or newer is required. This project has no runtime dependencies.

```bash
cd "/Volumes/Mac_ssd1/Instagram Automate"
uv sync
```

Run without installing globally:

```bash
uv run ig-agent --help
```

Or install it as a local command:

```bash
uv tool install .
ig-agent --help
```

## Configure

Create a `.env` file in the project directory. The CLI loads it automatically:

```dotenv
IG_ACCESS_TOKEN=your-token
IG_USER_ID=your-instagram-user-id
IG_API_HOST=https://graph.instagram.com
IG_API_VERSION=v25.0
```

If you have a token but do not know the Instagram user ID, leave `IG_USER_ID` blank and run `uv run ig-agent doctor`. It will query `/me` and print the ID to add to `.env`.

The API version is configurable because Meta retires old Graph API versions. Confirm the current version in your Meta developer dashboard before production use.

The token is never stored in SQLite.

Initialize and verify:

```bash
uv run ig-agent init
uv run ig-agent doctor --offline
uv run ig-agent doctor
```

## Schedule a simple image

```bash
uv run ig-agent schedule \
  --at "2026-08-10T18:30:00+05:30" \
  --type image \
  --media-url "https://example.com/post.jpg" \
  --caption-file ./caption.txt \
  --alt-text "A useful image description" \
  --idempotency-key "campaign-42-post-1"
```

Timestamps must include a timezone. They are stored internally in UTC.

## Schedule from JSON

JSON files are the recommended agent interface:

```bash
uv run ig-agent schedule --file examples/image-post.json
uv run ig-agent schedule --file examples/carousel-post.json
```

Every command prints JSON. An agent should check the `ok` and `created` fields and retain the returned job ID.

## Run the scheduler

The simplest local option is a foreground worker:

```bash
uv run ig-agent worker --interval 30
```

Keep that terminal and computer running. If the Mac sleeps, the post will publish after it wakes and the worker runs again.

Alternatively, have your agent or cron call the one-shot command every minute:

```bash
uv run ig-agent run-due
```

## Manage jobs

```bash
uv run ig-agent list
uv run ig-agent list --status queued
uv run ig-agent show JOB_ID
uv run ig-agent cancel JOB_ID
uv run ig-agent retry JOB_ID
```

Publish immediately:

```bash
uv run ig-agent publish-now \
  --type image \
  --media-url "https://example.com/post.jpg" \
  --caption "Published by our local agent" \
  --idempotency-key "manual-test-1"
```

## Agent contract

Recommended behavior for an AI agent:

1. Produce a job JSON file with a unique `idempotency_key`.
2. Run `ig-agent schedule --file JOB.json`.
3. Parse the JSON response and store `job.id`.
4. Use `ig-agent show JOB_ID` when status is needed.
5. Never put the Meta token in prompts or job files.
6. Run `ig-agent run-due` periodically, or keep `ig-agent worker` active.

## Tests

```bash
uv run python -m unittest discover -s tests -v
```
