from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path
from typing import Any

from . import __version__
from .config import Settings
from .meta import MetaAPIError, MetaClient, MetaPublisher
from .model import normalize_job
from .service import Scheduler
from .store import JobStore
from .timeutil import to_utc_string, utc_now


def emit(value: Any) -> None:
    print(json.dumps(value, indent=2, ensure_ascii=False, default=str))


def load_json(path: str) -> dict[str, Any]:
    try:
        value = json.loads(Path(path).read_text(encoding="utf-8"))
    except OSError as exc:
        raise ValueError(f"Cannot read JSON file: {exc}") from exc
    except json.JSONDecodeError as exc:
        raise ValueError(f"Invalid JSON file: {exc}") from exc
    if not isinstance(value, dict):
        raise ValueError("Job JSON must contain an object")
    return value


def caption_from_args(args: argparse.Namespace) -> str:
    if args.caption and args.caption_file:
        raise ValueError("Use either --caption or --caption-file, not both")
    if args.caption_file:
        try:
            return Path(args.caption_file).read_text(encoding="utf-8").strip()
        except OSError as exc:
            raise ValueError(f"Cannot read caption file: {exc}") from exc
    return args.caption or ""


def raw_job_from_args(args: argparse.Namespace, publish_now: bool = False) -> dict[str, Any]:
    if args.file:
        raw = load_json(args.file)
        if publish_now:
            raw["scheduled_at"] = to_utc_string(utc_now())
        elif args.at:
            raw["scheduled_at"] = args.at
        return raw

    if not args.type or not args.media_url:
        raise ValueError("Without --file, --type and --media-url are required")
    media_type = "video" if args.type == "reel" else args.story_media_type
    if args.type == "image":
        media_type = "image"
    if args.type == "carousel":
        raise ValueError("Carousel jobs must use --file so each media item has a type")
    return {
        "scheduled_at": to_utc_string(utc_now()) if publish_now else args.at,
        "type": args.type,
        "media": [{"type": media_type, "url": args.media_url}],
        "caption": caption_from_args(args),
        "alt_text": args.alt_text,
        "share_to_feed": args.share_to_feed,
        "cover_url": args.cover_url,
        "idempotency_key": args.idempotency_key,
    }


def add_job_arguments(parser: argparse.ArgumentParser, require_time: bool) -> None:
    parser.add_argument("--file", help="JSON job file; recommended for AI agents")
    parser.add_argument("--at", required=False, help="ISO 8601 publish time with timezone")
    parser.add_argument("--type", choices=["image", "reel", "story", "carousel"])
    parser.add_argument("--media-url", help="Public HTTPS media URL")
    parser.add_argument("--story-media-type", choices=["image", "video"], default="image")
    parser.add_argument("--caption")
    parser.add_argument("--caption-file")
    parser.add_argument("--alt-text")
    parser.add_argument("--cover-url")
    parser.add_argument(
        "--share-to-feed",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="For Reels, also share to the main feed",
    )
    parser.add_argument("--idempotency-key", help="Prevents duplicate scheduling by an agent")
    parser.set_defaults(require_time=require_time)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="ig-agent",
        description="Local Instagram scheduler using Meta's official API",
    )
    parser.add_argument("--version", action="version", version=__version__)
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("init", help="Create the local SQLite database")

    doctor = subparsers.add_parser("doctor", help="Check configuration and Meta access")
    doctor.add_argument("--offline", action="store_true", help="Do not call Meta")

    schedule = subparsers.add_parser("schedule", help="Add a post to the local queue")
    add_job_arguments(schedule, require_time=True)

    publish = subparsers.add_parser("publish-now", help="Queue and immediately publish a post")
    add_job_arguments(publish, require_time=False)

    listing = subparsers.add_parser("list", help="List local jobs")
    listing.add_argument(
        "--status", choices=["queued", "running", "published", "failed", "canceled"]
    )
    listing.add_argument("--limit", type=int, default=100)

    show = subparsers.add_parser("show", help="Show one local job")
    show.add_argument("job_id")

    cancel = subparsers.add_parser("cancel", help="Cancel a queued or failed job")
    cancel.add_argument("job_id")

    retry = subparsers.add_parser("retry", help="Retry a permanently failed job")
    retry.add_argument("job_id")

    run_due = subparsers.add_parser("run-due", help="Publish posts that are due, then exit")
    run_due.add_argument("--limit", type=int, default=10)

    worker = subparsers.add_parser("worker", help="Run the local scheduler in the foreground")
    worker.add_argument("--interval", type=int, default=30)
    worker.add_argument("--limit", type=int, default=10)
    return parser


def make_store() -> tuple[Settings, JobStore]:
    settings = Settings.from_env(require_credentials=False)
    return settings, JobStore(settings.db_path)


def make_scheduler(settings: Settings, store: JobStore) -> Scheduler:
    if not settings.access_token or not settings.user_id:
        raise ValueError("IG_ACCESS_TOKEN and IG_USER_ID are required for publishing")
    client = MetaClient(
        settings.access_token,
        settings.user_id,
        settings.api_host,
        settings.api_version,
    )
    publisher = MetaPublisher(client, processing_timeout=settings.processing_timeout)
    return Scheduler(store, publisher)


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        settings, store = make_store()

        if args.command == "init":
            emit({"ok": True, "database": str(settings.db_path)})
            return 0

        if args.command == "doctor":
            result: dict[str, Any] = {
                "ok": bool(settings.access_token and settings.user_id),
                "database": str(settings.db_path),
                "api_host": settings.api_host,
                "api_version": settings.api_version,
                "access_token_configured": bool(settings.access_token),
                "user_id_configured": bool(settings.user_id),
            }
            if not args.offline and settings.access_token:
                client = MetaClient(
                    settings.access_token,
                    settings.user_id,
                    settings.api_host,
                    settings.api_version,
                )
                result["account"] = client.account()
                discovered_id = str(result["account"].get("id", ""))
                if not settings.user_id and discovered_id:
                    result["discovered_user_id"] = discovered_id
                    result["next_step"] = f"Set IG_USER_ID={discovered_id} in .env"
                result["ok"] = bool(settings.access_token and (settings.user_id or discovered_id))
                if settings.user_id:
                    try:
                        result["publishing_limit"] = client.publishing_limit()
                    except MetaAPIError as exc:
                        result["publishing_limit_warning"] = str(exc)
            emit(result)
            return 0 if result["ok"] else 1

        if args.command == "schedule":
            raw = raw_job_from_args(args)
            if args.require_time and not raw.get("scheduled_at"):
                raise ValueError("--at is required unless scheduled_at is present in --file")
            normalized = normalize_job(raw)
            job, created = store.schedule(
                normalized["payload"],
                normalized["scheduled_at"],
                normalized.get("idempotency_key"),
            )
            emit({"ok": True, "created": created, "job": job})
            return 0

        if args.command == "publish-now":
            raw = raw_job_from_args(args, publish_now=True)
            normalized = normalize_job(raw, scheduled_override="now")
            job, created = store.schedule(
                normalized["payload"],
                normalized["scheduled_at"],
                normalized.get("idempotency_key"),
            )
            if not created and job["status"] == "published":
                emit({"ok": True, "created": False, "job": job})
                return 0
            result = make_scheduler(settings, store).process_job(job["id"])
            emit(result)
            return 0 if result["ok"] else 1

        if args.command == "list":
            emit({"ok": True, "jobs": store.list(args.status, args.limit)})
            return 0

        if args.command == "show":
            job = store.get(args.job_id)
            emit({"ok": job is not None, "job": job})
            return 0 if job else 1

        if args.command == "cancel":
            changed = store.cancel(args.job_id)
            emit({"ok": changed, "job": store.get(args.job_id)})
            return 0 if changed else 1

        if args.command == "retry":
            changed = store.retry(args.job_id)
            emit({"ok": changed, "job": store.get(args.job_id)})
            return 0 if changed else 1

        if args.command == "run-due":
            results = make_scheduler(settings, store).process_due(args.limit)
            emit({"ok": all(item["ok"] for item in results), "processed": len(results), "results": results})
            return 0 if all(item["ok"] for item in results) else 1

        if args.command == "worker":
            if args.interval < 5:
                raise ValueError("--interval must be at least 5 seconds")
            scheduler = make_scheduler(settings, store)
            emit({"ok": True, "event": "worker_started", "interval": args.interval})
            while True:
                results = scheduler.process_due(args.limit)
                if results:
                    emit(
                        {
                            "ok": all(item["ok"] for item in results),
                            "event": "jobs_processed",
                            "results": results,
                        }
                    )
                time.sleep(args.interval)

        parser.error("Unknown command")
        return 2
    except KeyboardInterrupt:
        emit({"ok": True, "event": "worker_stopped"})
        return 0
    except (ValueError, MetaAPIError) as exc:
        emit({"ok": False, "error": str(exc)})
        return 1
    except Exception as exc:
        emit({"ok": False, "error": f"Unexpected error: {exc}"})
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
