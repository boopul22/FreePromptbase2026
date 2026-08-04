from __future__ import annotations

from copy import deepcopy
from typing import Any
from urllib.parse import urlparse

from .timeutil import parse_datetime, to_utc_string


POST_TYPES = {"image", "reel", "story", "carousel"}
MEDIA_TYPES = {"image", "video"}


def _validate_public_url(value: str, field: str) -> str:
    parsed = urlparse(value)
    if parsed.scheme != "https" or not parsed.netloc:
        raise ValueError(f"{field} must be a public HTTPS URL")
    return value


def normalize_job(raw: dict[str, Any], scheduled_override: str | None = None) -> dict[str, Any]:
    data = deepcopy(raw)
    post_type = str(data.get("type", "")).strip().lower()
    if post_type not in POST_TYPES:
        raise ValueError(f"type must be one of: {', '.join(sorted(POST_TYPES))}")

    scheduled_raw = scheduled_override or data.get("scheduled_at")
    if not scheduled_raw:
        raise ValueError("scheduled_at is required")
    scheduled_at = to_utc_string(parse_datetime(str(scheduled_raw)))

    caption = str(data.get("caption", ""))
    if len(caption) > 2200:
        raise ValueError("caption cannot exceed 2200 characters")

    media = data.get("media")
    if not isinstance(media, list):
        raise ValueError("media must be an array")

    normalized_media: list[dict[str, str]] = []
    for index, item in enumerate(media):
        if not isinstance(item, dict):
            raise ValueError(f"media[{index}] must be an object")
        media_type = str(item.get("type", "")).strip().lower()
        if media_type not in MEDIA_TYPES:
            raise ValueError(f"media[{index}].type must be image or video")
        url = _validate_public_url(str(item.get("url", "")), f"media[{index}].url")
        normalized_media.append({"type": media_type, "url": url})

    if post_type == "image":
        if len(normalized_media) != 1 or normalized_media[0]["type"] != "image":
            raise ValueError("image posts require exactly one image")
    elif post_type == "reel":
        if len(normalized_media) != 1 or normalized_media[0]["type"] != "video":
            raise ValueError("reel posts require exactly one video")
    elif post_type == "story":
        if len(normalized_media) != 1:
            raise ValueError("story posts require exactly one image or video")
    elif post_type == "carousel":
        if not 2 <= len(normalized_media) <= 10:
            raise ValueError("carousel posts require 2 to 10 media items")

    payload: dict[str, Any] = {
        "type": post_type,
        "caption": caption,
        "media": normalized_media,
    }
    if data.get("alt_text"):
        payload["alt_text"] = str(data["alt_text"])
    if post_type == "reel":
        payload["share_to_feed"] = bool(data.get("share_to_feed", True))
        if data.get("cover_url"):
            payload["cover_url"] = _validate_public_url(str(data["cover_url"]), "cover_url")

    result: dict[str, Any] = {
        "scheduled_at": scheduled_at,
        "payload": payload,
    }
    if data.get("idempotency_key"):
        result["idempotency_key"] = str(data["idempotency_key"])
    return result

