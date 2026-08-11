#!/usr/bin/env python3
"""Upload featured covers as-is (no stretch) and update D1 + meta coverImage.

Expects: content/blog-drafts/_staging/generated/{slug}__featured.png
Optional: pass slug args to limit scope.
"""
from __future__ import annotations

import hashlib
import json
import os
import subprocess
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
GEN = ROOT / "content/blog-drafts/_staging/generated"
DRAFTS = ROOT / "content/blog-drafts"
BUCKET = "freepromptbase-media-2026"
CDN = "https://freepromptbase.com/cdn"


def upload_webp(webp: Path) -> str:
    data = webp.read_bytes()
    sha = hashlib.sha256(data).hexdigest()
    key = f"cms/blog/{sha}.webp"
    env = {k: v for k, v in os.environ.items() if k != "CLOUDFLARE_API_TOKEN"}
    r = subprocess.run(
        [
            "npx",
            "wrangler",
            "r2",
            "object",
            "put",
            f"{BUCKET}/{key}",
            f"--file={webp}",
            "--content-type=image/webp",
            "--remote",
        ],
        cwd=ROOT,
        capture_output=True,
        text=True,
        env=env,
    )
    if r.returncode != 0:
        raise RuntimeError(r.stderr[-1500:] or r.stdout[-1500:])
    return f"{CDN}/{key}"


def d1(sql: str) -> None:
    env = {k: v for k, v in os.environ.items() if k != "CLOUDFLARE_API_TOKEN"}
    r = subprocess.run(
        ["npx", "wrangler", "d1", "execute", "freepromptbase-com", "--remote", "--command", sql],
        cwd=ROOT,
        capture_output=True,
        text=True,
        env=env,
    )
    if r.returncode != 0:
        raise RuntimeError(r.stderr[-1500:] or r.stdout[-1500:])


def process(slug: str) -> str:
    png = GEN / f"{slug}__featured.png"
    if not png.exists():
        raise FileNotFoundError(png)
    im = Image.open(png).convert("RGB")
    webp = GEN / f"{slug}__featured.webp"
    # AS-IS — no resize/stretch
    im.save(webp, "WEBP", quality=90, method=6)
    cdn = upload_webp(webp)

    meta_path = DRAFTS / f"{slug}.meta.json"
    meta = json.loads(meta_path.read_text()) if meta_path.exists() else {"slug": slug}
    meta["coverImage"] = cdn
    meta_path.write_text(json.dumps(meta, indent=2) + "\n")

    # Escape single quotes for SQL
    safe = cdn.replace("'", "''")
    d1(f"UPDATE posts SET cover_image='{safe}', updated_at=datetime('now') WHERE slug='{slug}';")
    print(f"OK {slug} {im.size[0]}x{im.size[1]} -> {cdn}")
    return cdn


def main() -> int:
    catalog = json.loads((DRAFTS / "catalog-30.json").read_text())
    slugs = sys.argv[1:] or [b["slug"] for b in catalog["blogs"]]
    out = {}
    for slug in slugs:
        out[slug] = process(slug)
    dest = GEN / "featured-ctr-urls.json"
    existing = json.loads(dest.read_text()) if dest.exists() else {}
    existing.update(out)
    dest.write_text(json.dumps(existing, indent=2) + "\n")
    print(json.dumps({"updated": len(out)}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
