#!/usr/bin/env python3
"""Upsert the 30 Aura-rewritten blog drafts into remote D1.

Blog 01 → published immediately (publish_at NULL).
Blogs 02–30 → status=published with publish_at one day apart at 09:00 IST
(03:30 UTC), so the SSR gate reveals them one per day without a cron.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DRAFTS = ROOT / "content/blog-drafts"
OUT = DRAFTS / "_staging" / "publish-sql"
SCHEDULE = DRAFTS / "_staging" / "publish-schedule.json"

IST = timezone(timedelta(hours=5, minutes=30))
# Daily go-live time for scheduled posts
DAILY_HOUR_IST = 9
DAILY_MINUTE_IST = 0


def esc(s: str) -> str:
    return s.replace("'", "''")


def sql_str(s: str | None) -> str:
    if s is None:
        return "NULL"
    return f"'{esc(s)}'"


def run_wrangler_file(path: Path) -> None:
    env = {k: v for k, v in os.environ.items() if k != "CLOUDFLARE_API_TOKEN"}
    r = subprocess.run(
        [
            "npx",
            "wrangler",
            "d1",
            "execute",
            "freepromptbase-com",
            "--remote",
            f"--file={path}",
        ],
        cwd=ROOT,
        capture_output=True,
        text=True,
        env=env,
    )
    if r.returncode != 0:
        raise RuntimeError(f"{path.name} failed:\n{r.stderr[-2000:] or r.stdout[-2000:]}")
    print("ok", path.name)


def load_meta(slug: str) -> dict:
    return json.loads((DRAFTS / f"{slug}.meta.json").read_text())


def build_sql(blog: dict, meta: dict, html: str, *, status: str, publish_at: str | None, published_at: str | None, featured: int) -> str:
    slug = blog["slug"]
    post_id = f"blog-aura-{blog['id']}-{slug[:40]}"
    title = meta.get("title") or blog["title"]
    excerpt = meta.get("excerpt") or f"Hi, I'm Bipul Kumar. Copy-paste {meta.get('primaryKw') or blog.get('primaryKw', '')} prompts for Gemini Nano Banana Pro."
    meta_title = meta.get("metaTitle") or title
    meta_desc = meta.get("metaDescription") or excerpt[:155]
    cover = meta.get("coverImage") or ""
    faq = json.dumps(meta.get("faqItems") or [], ensure_ascii=False)
    related = json.dumps(meta.get("relatedSlugs") or [], ensure_ascii=False)
    read_time = meta.get("readTime") or "8 min read"

    return f"""-- {blog['id']} {slug}
DELETE FROM posts WHERE slug = {sql_str(slug)};
INSERT INTO posts (
  id, slug, title, excerpt, content, category_id,
  author_name, author_role, author_avatar,
  featured, status, content_type, source_url, cover_image,
  read_time, meta_title, meta_description, related_slugs, faq_items,
  published_at, publish_at, created_at, updated_at
) VALUES (
  {sql_str(post_id)},
  {sql_str(slug)},
  {sql_str(title)},
  {sql_str(excerpt)},
  {sql_str(html)},
  NULL,
  'Bipul Kumar', 'Founder', '',
  {featured}, {sql_str(status)}, 'guide',
  NULL,
  {sql_str(cover) if cover else 'NULL'},
  {sql_str(read_time)},
  {sql_str(meta_title)},
  {sql_str(meta_desc)},
  {sql_str(related)},
  {sql_str(faq)},
  {sql_str(published_at)},
  {sql_str(publish_at)},
  datetime('now'), datetime('now')
);
"""


def main() -> int:
    catalog = json.loads((DRAFTS / "catalog-30.json").read_text())
    blogs = catalog["blogs"]
    OUT.mkdir(parents=True, exist_ok=True)

    now_utc = datetime.now(timezone.utc)
    # First scheduled day = tomorrow 09:00 IST
    tomorrow_ist = (datetime.now(IST) + timedelta(days=1)).date()
    schedule_rows = []

    only = set(sys.argv[1:]) if len(sys.argv) > 1 else None

    for i, blog in enumerate(blogs):
        bid = blog["id"]
        if only and bid not in only and blog["slug"] not in only:
            continue

        slug = blog["slug"]
        meta = load_meta(slug)
        html = (DRAFTS / f"{slug}.html").read_text()
        if not meta.get("coverImage"):
            raise SystemExit(f"missing coverImage for {slug}")
        if html.count("<blockquote>") < 5:
            raise SystemExit(f"expected 5 blockquotes in {slug}")

        if i == 0:
            status = "published"
            publish_at = None
            published_at = now_utc.strftime("%Y-%m-%dT%H:%M:%S.000Z")
            featured = 1
            go_live = "NOW"
        else:
            day = tomorrow_ist + timedelta(days=i - 1)
            go_ist = datetime(day.year, day.month, day.day, DAILY_HOUR_IST, DAILY_MINUTE_IST, tzinfo=IST)
            go_utc = go_ist.astimezone(timezone.utc)
            status = "published"
            publish_at = go_utc.strftime("%Y-%m-%d %H:%M:%S")
            published_at = go_utc.strftime("%Y-%m-%dT%H:%M:%S.000Z")
            featured = 0
            go_live = go_ist.isoformat()

        sql = build_sql(
            blog,
            meta,
            html,
            status=status,
            publish_at=publish_at,
            published_at=published_at,
            featured=featured,
        )
        path = OUT / f"{bid}-{slug}.sql"
        path.write_text(sql)
        print(f"writing {bid} {slug} → {go_live}")
        run_wrangler_file(path)

        schedule_rows.append(
            {
                "id": bid,
                "slug": slug,
                "title": meta.get("title") or blog["title"],
                "status": status,
                "publish_at_utc": publish_at,
                "published_at": published_at,
                "go_live_ist": go_live,
                "url": f"https://freepromptbase.com/blog/{slug}",
            }
        )

    SCHEDULE.write_text(json.dumps({"generatedAt": now_utc.isoformat(), "posts": schedule_rows}, indent=2) + "\n")
    print("schedule written", SCHEDULE)
    print(json.dumps({"upserted": len(schedule_rows), "live_now": schedule_rows[0]["url"] if schedule_rows else None}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
