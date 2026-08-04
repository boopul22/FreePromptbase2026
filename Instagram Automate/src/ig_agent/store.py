from __future__ import annotations

import json
import sqlite3
import uuid
from datetime import timedelta
from pathlib import Path
from typing import Any

from .timeutil import to_utc_string, utc_now


SCHEMA = """
CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    idempotency_key TEXT UNIQUE,
    status TEXT NOT NULL,
    scheduled_at TEXT NOT NULL,
    next_attempt_at TEXT,
    payload_json TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    container_id TEXT,
    media_id TEXT,
    last_error TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS jobs_due_idx
ON jobs(status, scheduled_at, next_attempt_at);
"""


class JobStore:
    def __init__(self, path: Path):
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._initialize()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.path, timeout=30)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA journal_mode=WAL")
        connection.execute("PRAGMA foreign_keys=ON")
        return connection

    def _initialize(self) -> None:
        with self._connect() as connection:
            connection.executescript(SCHEMA)

    @staticmethod
    def _job(row: sqlite3.Row | None) -> dict[str, Any] | None:
        if row is None:
            return None
        job = dict(row)
        job["payload"] = json.loads(job.pop("payload_json"))
        return job

    def schedule(
        self,
        payload: dict[str, Any],
        scheduled_at: str,
        idempotency_key: str | None = None,
    ) -> tuple[dict[str, Any], bool]:
        now = to_utc_string(utc_now())
        job_id = str(uuid.uuid4())
        try:
            with self._connect() as connection:
                connection.execute(
                    """
                    INSERT INTO jobs (
                        id, idempotency_key, status, scheduled_at,
                        payload_json, created_at, updated_at
                    ) VALUES (?, ?, 'queued', ?, ?, ?, ?)
                    """,
                    (job_id, idempotency_key, scheduled_at, json.dumps(payload), now, now),
                )
        except sqlite3.IntegrityError:
            if not idempotency_key:
                raise
            existing = self.get_by_idempotency_key(idempotency_key)
            if existing is None:
                raise
            return existing, False
        job = self.get(job_id)
        assert job is not None
        return job, True

    def get(self, job_id: str) -> dict[str, Any] | None:
        with self._connect() as connection:
            row = connection.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
        return self._job(row)

    def get_by_idempotency_key(self, key: str) -> dict[str, Any] | None:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT * FROM jobs WHERE idempotency_key = ?", (key,)
            ).fetchone()
        return self._job(row)

    def list(self, status: str | None = None, limit: int = 100) -> list[dict[str, Any]]:
        with self._connect() as connection:
            if status:
                rows = connection.execute(
                    "SELECT * FROM jobs WHERE status = ? ORDER BY scheduled_at LIMIT ?",
                    (status, limit),
                ).fetchall()
            else:
                rows = connection.execute(
                    "SELECT * FROM jobs ORDER BY scheduled_at LIMIT ?", (limit,)
                ).fetchall()
        return [self._job(row) for row in rows if row is not None]

    def requeue_stale(self, stale_after_minutes: int = 15) -> int:
        cutoff = to_utc_string(utc_now() - timedelta(minutes=stale_after_minutes))
        now = to_utc_string(utc_now())
        with self._connect() as connection:
            cursor = connection.execute(
                """
                UPDATE jobs
                SET status = 'queued', next_attempt_at = ?,
                    last_error = 'Recovered stale running job', updated_at = ?
                WHERE status = 'running' AND updated_at <= ?
                """,
                (now, now, cutoff),
            )
            return cursor.rowcount

    def claim_due(self, limit: int = 10) -> list[dict[str, Any]]:
        now = to_utc_string(utc_now())
        with self._connect() as connection:
            connection.execute("BEGIN IMMEDIATE")
            rows = connection.execute(
                """
                SELECT * FROM jobs
                WHERE status = 'queued'
                  AND scheduled_at <= ?
                  AND (next_attempt_at IS NULL OR next_attempt_at <= ?)
                ORDER BY scheduled_at
                LIMIT ?
                """,
                (now, now, limit),
            ).fetchall()
            ids = [row["id"] for row in rows]
            if ids:
                placeholders = ",".join("?" for _ in ids)
                connection.execute(
                    f"""
                    UPDATE jobs
                    SET status = 'running', attempts = attempts + 1, updated_at = ?
                    WHERE id IN ({placeholders})
                    """,
                    (now, *ids),
                )
            connection.commit()
        jobs: list[dict[str, Any]] = []
        for job_id in ids:
            job = self.get(job_id)
            if job is not None:
                jobs.append(job)
        return jobs

    def claim(self, job_id: str) -> dict[str, Any] | None:
        now = to_utc_string(utc_now())
        with self._connect() as connection:
            connection.execute("BEGIN IMMEDIATE")
            cursor = connection.execute(
                """
                UPDATE jobs
                SET status = 'running', attempts = attempts + 1, updated_at = ?
                WHERE id = ? AND status = 'queued'
                """,
                (now, job_id),
            )
            connection.commit()
        return self.get(job_id) if cursor.rowcount else None

    def set_container(self, job_id: str, container_id: str) -> None:
        now = to_utc_string(utc_now())
        with self._connect() as connection:
            connection.execute(
                "UPDATE jobs SET container_id = ?, updated_at = ? WHERE id = ?",
                (container_id, now, job_id),
            )

    def mark_published(self, job_id: str, media_id: str) -> None:
        now = to_utc_string(utc_now())
        with self._connect() as connection:
            connection.execute(
                """
                UPDATE jobs
                SET status = 'published', media_id = ?, last_error = NULL,
                    next_attempt_at = NULL, updated_at = ?
                WHERE id = ?
                """,
                (media_id, now, job_id),
            )

    def mark_failed(
        self,
        job_id: str,
        error: str,
        transient: bool,
        max_attempts: int = 5,
    ) -> None:
        current = self.get(job_id)
        if current is None:
            return
        attempts = int(current["attempts"])
        retry = transient and attempts < max_attempts
        status = "queued" if retry else "failed"
        next_attempt = None
        if retry:
            delay = min(60 * (2 ** max(0, attempts - 1)), 3600)
            next_attempt = to_utc_string(utc_now() + timedelta(seconds=delay))
        now = to_utc_string(utc_now())
        with self._connect() as connection:
            connection.execute(
                """
                UPDATE jobs
                SET status = ?, next_attempt_at = ?, last_error = ?, updated_at = ?
                WHERE id = ?
                """,
                (status, next_attempt, error[:4000], now, job_id),
            )

    def cancel(self, job_id: str) -> bool:
        now = to_utc_string(utc_now())
        with self._connect() as connection:
            cursor = connection.execute(
                """
                UPDATE jobs SET status = 'canceled', updated_at = ?
                WHERE id = ? AND status IN ('queued', 'failed')
                """,
                (now, job_id),
            )
            return cursor.rowcount == 1

    def retry(self, job_id: str) -> bool:
        now = to_utc_string(utc_now())
        with self._connect() as connection:
            cursor = connection.execute(
                """
                UPDATE jobs
                SET status = 'queued', next_attempt_at = ?, last_error = NULL, updated_at = ?
                WHERE id = ? AND status = 'failed'
                """,
                (now, now, job_id),
            )
            return cursor.rowcount == 1
