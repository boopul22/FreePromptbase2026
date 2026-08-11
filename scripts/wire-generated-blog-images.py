#!/usr/bin/env python3
"""Convert generated PNGs → WebP, upload to R2, wire draft HTML/meta.

Expects files in content/blog-drafts/_staging/generated/:
  {slug}__featured.png
  {slug}__p01.png ... {slug}__p05.png
"""
from __future__ import annotations

import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
GEN = ROOT / "content/blog-drafts/_staging/generated"
OUT = ROOT / "content/blog-drafts"
BUCKET = "freepromptbase-media-2026"
CDN = "https://freepromptbase.com/cdn"


def to_featured_webp(src: Path, dest: Path) -> None:
    im = Image.open(src).convert("RGB")
    im = im.resize((1600, 900), Image.Resampling.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, "WEBP", quality=88, method=6)


def to_prompt_webp(src: Path, dest: Path, tw=1080, th=1440) -> None:
    im = Image.open(src).convert("RGB")
    scale = max(tw / im.width, th / im.height)
    nw, nh = int(im.width * scale), int(im.height * scale)
    im = im.resize((nw, nh), Image.Resampling.LANCZOS)
    left, top = (nw - tw) // 2, (nh - th) // 2
    im = im.crop((left, top, left + tw, top + th))
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, "WEBP", quality=86, method=6)


def upload(path: Path) -> str:
    data = path.read_bytes()
    h = hashlib.sha256(data).hexdigest()
    key = f"cms/blog/{h}.webp"
    cmd = [
        "npx",
        "wrangler",
        "r2",
        "object",
        "put",
        f"{BUCKET}/{key}",
        f"--file={path}",
        "--content-type=image/webp",
        "--remote",
    ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(r.stderr or r.stdout)
    return f"{CDN}/{key}"


def wire(slug: str, cover: str, prompts: list[str], title: str, primary_kw: str) -> None:
    html_path = OUT / f"{slug}.html"
    html = html_path.read_text()
    html = re.sub(r"(<blockquote>)\s*<img[^>]*>\s*", r"\1\n", html, flags=re.I)
    idx = {"n": 0}

    def inject(m):
        i = idx["n"]
        idx["n"] += 1
        if i >= len(prompts):
            return m.group(0)
        alt = f"{primary_kw} example {i+1} — {title}"[:140].replace('"', "'")
        return (
            f"<blockquote>\n"
            f'<img src="{prompts[i]}" alt="{alt}" width="1080" height="1440" />\n'
            f"{m.group(1)}\n"
            f"</blockquote>"
        )

    html = re.sub(
        r'<blockquote>\s*(<p>"[\s\S]*?"</p>)\s*</blockquote>',
        inject,
        html,
        flags=re.I,
    )
    html_path.write_text(html)

    meta_path = OUT / f"{slug}.meta.json"
    meta = json.loads(meta_path.read_text()) if meta_path.exists() else {"slug": slug}
    meta["coverImage"] = cover
    meta["promptImages"] = prompts
    meta["publishReadyImages"] = True
    meta["status"] = "draft"
    meta_path.write_text(json.dumps(meta, indent=2))


def process_slug(slug: str) -> dict:
    catalog = json.loads((OUT / "catalog-30.json").read_text())
    blog = next(b for b in catalog["blogs"] if b["slug"] == slug)
    featured_png = GEN / f"{slug}__featured.png"
    if not featured_png.exists():
        raise FileNotFoundError(featured_png)

    featured_webp = GEN / f"{slug}__featured.webp"
    to_featured_webp(featured_png, featured_webp)
    cover = upload(featured_webp)

    prompt_urls = []
    for i in range(1, 6):
        png = GEN / f"{slug}__p{i:02d}.png"
        if not png.exists():
            raise FileNotFoundError(png)
        webp = GEN / f"{slug}__p{i:02d}.webp"
        to_prompt_webp(png, webp)
        prompt_urls.append(upload(webp))

    wire(slug, cover, prompt_urls, blog["title"], blog["primaryKw"])
    return {"slug": slug, "cover": cover, "prompts": prompt_urls}


def main(slugs: list[str]) -> None:
    out = {}
    for slug in slugs:
        print("processing", slug, flush=True)
        out[slug] = process_slug(slug)
        print("  ok", flush=True)
    dest = GEN / "wired-urls.json"
    existing = json.loads(dest.read_text()) if dest.exists() else {}
    existing.update(out)
    dest.write_text(json.dumps(existing, indent=2))
    print(json.dumps({"wired": list(out.keys())}, indent=2))


if __name__ == "__main__":
    args = sys.argv[1:]
    if not args:
        # auto: any slug that has featured+5 prompts png present
        catalog = json.loads((OUT / "catalog-30.json").read_text())
        ready = []
        for b in catalog["blogs"]:
            slug = b["slug"]
            ok = (GEN / f"{slug}__featured.png").exists() and all(
                (GEN / f"{slug}__p{i:02d}.png").exists() for i in range(1, 6)
            )
            if ok:
                ready.append(slug)
        args = ready
    main(args)
