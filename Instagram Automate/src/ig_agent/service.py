from __future__ import annotations

from typing import Any

from .meta import MetaAPIError, MetaPublisher
from .store import JobStore


class Scheduler:
    def __init__(self, store: JobStore, publisher: MetaPublisher):
        self.store = store
        self.publisher = publisher

    def process_claimed(self, job: dict[str, Any]) -> dict[str, Any]:
        job_id = job["id"]
        try:
            media_id = self.publisher.publish(
                job["payload"],
                existing_container_id=job.get("container_id"),
                on_container=lambda container_id: self.store.set_container(job_id, container_id),
            )
            self.store.mark_published(job_id, media_id)
            return {"ok": True, "job": self.store.get(job_id)}
        except MetaAPIError as exc:
            self.store.mark_failed(job_id, str(exc), transient=exc.transient)
            return {"ok": False, "error": str(exc), "job": self.store.get(job_id)}
        except Exception as exc:  # Protect the worker from one malformed job.
            self.store.mark_failed(job_id, str(exc), transient=False)
            return {"ok": False, "error": str(exc), "job": self.store.get(job_id)}

    def process_due(self, limit: int = 10) -> list[dict[str, Any]]:
        self.store.requeue_stale()
        return [self.process_claimed(job) for job in self.store.claim_due(limit)]

    def process_job(self, job_id: str) -> dict[str, Any]:
        job = self.store.claim(job_id)
        if job is None:
            current = self.store.get(job_id)
            return {
                "ok": False,
                "error": "Job is missing or is not queued",
                "job": current,
            }
        return self.process_claimed(job)

