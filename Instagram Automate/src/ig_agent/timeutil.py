from __future__ import annotations

from datetime import datetime, timezone


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def parse_datetime(value: str) -> datetime:
    raw = value.strip()
    if raw.lower() == "now":
        return utc_now()
    if raw.endswith("Z"):
        raw = f"{raw[:-1]}+00:00"
    try:
        parsed = datetime.fromisoformat(raw)
    except ValueError as exc:
        raise ValueError(
            "Timestamp must be ISO 8601, for example 2026-08-10T18:30:00+05:30"
        ) from exc
    if parsed.tzinfo is None:
        raise ValueError("Timestamp must include a timezone offset or Z")
    return parsed.astimezone(timezone.utc)


def to_utc_string(value: datetime) -> str:
    if value.tzinfo is None:
        raise ValueError("Datetime must be timezone-aware")
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")

