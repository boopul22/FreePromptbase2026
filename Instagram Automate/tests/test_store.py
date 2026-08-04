from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from ig_agent.store import JobStore


class JobStoreTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.store = JobStore(Path(self.temp_dir.name) / "jobs.sqlite3")
        self.payload = {
            "type": "image",
            "caption": "hello",
            "media": [{"type": "image", "url": "https://example.com/post.jpg"}],
        }

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    def test_idempotency_key_returns_existing_job(self) -> None:
        first, created = self.store.schedule(
            self.payload, "2020-01-01T00:00:00Z", "same-request"
        )
        second, created_again = self.store.schedule(
            self.payload, "2020-01-01T00:00:00Z", "same-request"
        )
        self.assertTrue(created)
        self.assertFalse(created_again)
        self.assertEqual(first["id"], second["id"])

    def test_claim_due_and_publish(self) -> None:
        job, _ = self.store.schedule(self.payload, "2020-01-01T00:00:00Z")
        claimed = self.store.claim_due()
        self.assertEqual([item["id"] for item in claimed], [job["id"]])
        self.assertEqual(claimed[0]["status"], "running")
        self.store.set_container(job["id"], "container-1")
        self.store.mark_published(job["id"], "media-1")
        published = self.store.get(job["id"])
        assert published is not None
        self.assertEqual(published["status"], "published")
        self.assertEqual(published["container_id"], "container-1")
        self.assertEqual(published["media_id"], "media-1")


if __name__ == "__main__":
    unittest.main()

