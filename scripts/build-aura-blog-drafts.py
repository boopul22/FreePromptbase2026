#!/usr/bin/env python3
"""Fetch Aura posts and build FPB draft HTML with rewritten prompts (draft only)."""
from __future__ import annotations

import json
import re
import time
import urllib.request
from html import unescape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "content/blog-drafts/catalog-30.json"
OUT_DIR = ROOT / "content/blog-drafts"
RAW_DIR = ROOT / ".firecrawl/auraprompt/posts"


def fetch(url: str) -> str:
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (compatible; FPBDraftBot/1.0)"},
    )
    with urllib.request.urlopen(req, timeout=45) as resp:
        return resp.read().decode("utf-8", "ignore")


def strip_tags(s: str) -> str:
    s = re.sub(r"<script[\s\S]*?</script>", " ", s, flags=re.I)
    s = re.sub(r"<style[\s\S]*?</style>", " ", s, flags=re.I)
    s = re.sub(r"<[^>]+>", " ", s)
    s = unescape(s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def extract_title(html: str) -> str:
    m = re.search(r"<h1[^>]*>([\s\S]*?)</h1>", html, re.I)
    if m:
        return strip_tags(m.group(1))
    m = re.search(r"<title>([^<]+)</title>", html, re.I)
    return strip_tags(m.group(1)) if m else ""


def extract_sections(html: str) -> list[dict]:
    """Return list of {h2, note, prompt} from Aura article body."""
    # Focus on entry content if present
    m = re.search(
        r'(?:class="[^"]*entry-content[^"]*"|class="[^"]*post-content[^"]*")[^>]*>([\s\S]*?)(?:<footer|class="[^"]*related|class="[^"]*author|id="comments")',
        html,
        re.I,
    )
    body = m.group(1) if m else html

    # Split by h2
    parts = re.split(r"<h2[^>]*>", body, flags=re.I)
    sections = []
    for part in parts[1:]:
        hm = re.match(r"([\s\S]*?)</h2>([\s\S]*)", part, re.I)
        if not hm:
            continue
        h2 = strip_tags(hm.group(1))
        rest = hm.group(2)
        low = h2.lower()
        if any(
            x in low
            for x in [
                "about the author",
                "related post",
                "trending ai",
                "pro tip",
                "check out",
                "search",
            ]
        ):
            continue
        if low.strip() in {"prompt", "prompts"}:
            # orphan prompt heading — attach to previous if possible
            continue

        # First meaningful paragraph as tester note
        paras = re.findall(r"<p[^>]*>([\s\S]*?)</p>", rest, re.I)
        note = ""
        prompt = ""
        for p in paras:
            text = strip_tags(p)
            if not text or len(text) < 40:
                continue
            # Skip CTAs
            if text.lower().startswith("copy prompt") or "whatsapp" in text.lower():
                continue
            if not note and len(text) < 500 and "generate " not in text.lower()[:30]:
                # likely tester note
                if not text.lower().startswith("ultra ") and "photorealistic" not in text.lower()[:80]:
                    note = text
                    continue
            # Long generation prompt
            if len(text) > 280 and (
                "prompt" in text.lower()
                or "photorealistic" in text.lower()
                or "reference" in text.lower()
                or "gemini" in text.lower()
                or "iphone" in text.lower()
                or "sony" in text.lower()
                or "canon" in text.lower()
            ):
                prompt = text
                break
            if len(text) > 400 and not prompt:
                prompt = text
                break

        # Also try pre/code blocks
        if not prompt:
            for block in re.findall(r"<pre[^>]*>([\s\S]*?)</pre>", rest, re.I):
                t = strip_tags(block)
                if len(t) > 280:
                    prompt = t
                    break

        if prompt:
            sections.append({"h2": h2, "note": note, "prompt": prompt})
        if len(sections) >= 5:
            break
    return sections


REWRITE_PAIRS = [
    (r"auraprompt\.in", "freepromptbase.com"),
    (r"Aura Prompt", "Free Prompt Base"),
    (r"Aman Batham", "Bipul Kumar"),
    (r"\bemerald green\b", "forest green"),
    (r"\boff-white\b", "cream"),
    (r"\bcream colored\b", "ivory"),
    (r"\bperfectly\b", "clean"),
    (r"\babsolutely\b", "completely"),
    (r"\bgenuinely\b", "really"),
    (r"\bstunningly\b", "noticeably"),
]


def rewrite_prompt(text: str) -> str:
    out = text
    for pat, repl in REWRITE_PAIRS:
        out = re.sub(pat, repl, out, flags=re.I)
    # Ensure watermark brand
    out = re.sub(
        r'add\s+[“"]?freepromptbase\.com[”"]?\s+as a small watermark',
        "add freepromptbase.com as a small watermark",
        out,
        flags=re.I,
    )
    if "freepromptbase.com" not in out.lower() and "watermark" in out.lower():
        out = re.sub(
            r'add\s+[“"]?[^"”]+[”"]?\s+as a small watermark',
            "add freepromptbase.com as a small watermark",
            out,
            flags=re.I,
        )
    # Strip curly quotes that break our copy cards
    out = out.replace("“", '"').replace("”", '"').replace("’", "'").replace("‘", "'")
    # Escape for HTML attribute-safe inside quoted blockquote — remove inner double quotes
    out = out.replace('"', "'")
    return out.strip()


def rewrite_note(note: str) -> str:
    if not note:
        return "After running this prompt several times, the face lock and fabric detail were the first things that stood out."
    n = note
    for pat, repl in REWRITE_PAIRS:
        n = re.sub(pat, repl, n, flags=re.I)
    n = n.replace("“", '"').replace("”", '"').replace("’", "'")
    return n.strip()


def build_intro(primary_kw: str, title: str) -> str:
    return (
        f"<p>Hi, I'm Bipul Kumar. I share simple and practical AI photo editing prompts, "
        f"{primary_kw}, and creative prompt ideas that anyone can use. My goal is to help people "
        f"create better AI images with clear, easy-to-copy prompts. If you been trying to get "
        f"that Instagram-ready look using Gemini Nano Banana Pro, these five prompts are exactly "
        f"what you need. I tested each one multiple times, compared the outputs, and only kept "
        f"the ones that actually deliver that iphone raw portrait quality. Every prompt below is "
        f"copy-paste ready. Let's get into them.</p>"
    )


def build_html(blog: dict, sections: list[dict], aura_title: str) -> str:
    primary = blog["primaryKw"]
    parts = [build_intro(primary, blog["title"])]
    for i, sec in enumerate(sections[:5], 1):
        h2 = sec["h2"] or f"{primary.title()} Look {i}"
        # light rewrite of h2 keyword brand
        h2 = re.sub(r"auraprompt\.in", "freepromptbase.com", h2, flags=re.I)
        note = rewrite_note(sec["note"])
        prompt = rewrite_prompt(sec["prompt"])
        parts.append(f"<h2>{h2}</h2>")
        parts.append(f"<p>{note}</p>")
        parts.append("<blockquote>")
        parts.append(f'<p>"{prompt}"</p>')
        parts.append("</blockquote>")

    parts.append(f"<h3>Pro Tips: {primary.title()}</h3>")
    parts.append(
        "<p>Always paste your reference photo first, then drop the prompt. "
        "Gemini Nano Banana Pro reads the image before the text, so the face lock works much better when the reference is already loaded.</p>"
    )
    parts.append(
        "<p>If skin texture looks too smooth on first generation, add visible open pores, "
        "natural micro skin texture, no beauty filter applied right after the face lock line and regenerate once.</p>"
    )
    parts.append(
        "<p>Run each prompt 3 times minimum. The third generation almost always has the cleanest facial match and the most accurate fabric detail.</p>"
    )
    parts.append(
        "<p>Aspect Ratio: 3:4 Vertical — works best for Instagram grid posts, Pinterest pins, and WhatsApp DP crops.</p>"
    )
    parts.append(
        '<p>Check out our latest prompts: <a href="/gemini-ai-photo-prompt-copy-paste">Gemini AI photo prompt copy paste</a> | '
        '<a href="/nano-banana-prompt">Nano Banana prompt</a> | '
        '<a href="/trending-gemini-prompt">Trending Gemini prompt</a></p>'
    )
    parts.append(
        f"<!-- Source inspiration rewritten from {blog['auraUrl']} | Aura title: {aura_title} -->"
    )
    return "\n".join(parts) + "\n"


def main() -> None:
    catalog = json.loads(CATALOG.read_text())
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    results = []

    for blog in catalog["blogs"]:
        if blog["id"] == "01":
            results.append({**blog, "status": "skipped_existing"})
            continue

        slug = blog["slug"]
        url = blog["auraUrl"]
        print(f"[{blog['id']}] fetching {url}")
        try:
            html = fetch(url)
            time.sleep(0.6)
        except Exception as e:
            print(f"  FAIL fetch: {e}")
            results.append({**blog, "status": "fetch_failed", "error": str(e)})
            continue

        raw_path = RAW_DIR / f"{slug}.html"
        raw_path.write_text(html)
        aura_title = extract_title(html)
        sections = extract_sections(html)
        print(f"  title={aura_title[:60]!r} sections={len(sections)}")

        if len(sections) < 3:
            results.append(
                {
                    **blog,
                    "status": "extract_weak",
                    "sections": len(sections),
                    "auraTitle": aura_title,
                }
            )
            # still write whatever we have if >=1
            if not sections:
                continue

        body = build_html(blog, sections, aura_title)
        out_html = OUT_DIR / f"{slug}.html"
        out_html.write_text(body)

        meta = {
            "id": blog["id"],
            "slug": slug,
            "title": blog["title"],
            "primaryKw": blog["primaryKw"],
            "auraUrl": url,
            "auraTitle": aura_title,
            "cluster": blog["cluster"],
            "authorName": "Bipul Kumar",
            "authorRole": "Founder",
            "status": "draft",
            "contentType": "guide",
            "readTime": "8 min read",
            "excerpt": (
                f"Hi, I'm Bipul Kumar. Five copy-paste {blog['primaryKw']} setups for Gemini Nano Banana Pro. "
                "Tested for face lock and Instagram 3:4 output."
            ),
            "metaTitle": blog["title"],
            "metaDescription": (
                f"Copy-paste {blog['primaryKw']} for Instagram. Five Nano Banana Pro prompts by Bipul Kumar."
            )[:158],
            "promptCount": min(5, len(sections)),
            "coverImage": None,
            "newIdea": blog.get("newIdea", False),
            "faqItems": [
                {
                    "question": f"Which Gemini model works best with these {blog['primaryKw']} setups?",
                    "answer": "Use Gemini with Nano Banana Pro image creation turned on. Upload a clear front-facing reference photo first, then paste the prompt.",
                },
                {
                    "question": "What aspect ratio should I use for Instagram?",
                    "answer": "3:4 vertical. It fits Instagram feed posts, Pinterest pins, and WhatsApp profile crops.",
                },
            ],
        }
        (OUT_DIR / f"{slug}.meta.json").write_text(json.dumps(meta, indent=2))
        results.append({**blog, "status": "draft_ready", "promptCount": meta["promptCount"]})

    summary = {
        "draft_ready": sum(1 for r in results if r.get("status") == "draft_ready"),
        "skipped_existing": sum(1 for r in results if r.get("status") == "skipped_existing"),
        "extract_weak": sum(1 for r in results if r.get("status") == "extract_weak"),
        "fetch_failed": sum(1 for r in results if r.get("status") == "fetch_failed"),
        "results": results,
    }
    (OUT_DIR / "batch-summary.json").write_text(json.dumps(summary, indent=2))
    print(json.dumps({k: summary[k] for k in summary if k != "results"}, indent=2))


if __name__ == "__main__":
    main()
