from __future__ import annotations

import unittest

from ig_agent.model import normalize_job


class NormalizeJobTests(unittest.TestCase):
    def test_converts_scheduled_time_to_utc(self) -> None:
        job = normalize_job(
            {
                "scheduled_at": "2026-08-10T18:30:00+05:30",
                "type": "image",
                "media": [{"type": "image", "url": "https://example.com/post.jpg"}],
            }
        )
        self.assertEqual(job["scheduled_at"], "2026-08-10T13:00:00Z")

    def test_rejects_local_media_paths(self) -> None:
        with self.assertRaisesRegex(ValueError, "public HTTPS URL"):
            normalize_job(
                {
                    "scheduled_at": "2026-08-10T13:00:00Z",
                    "type": "image",
                    "media": [{"type": "image", "url": "./post.jpg"}],
                }
            )

    def test_carousel_requires_two_items(self) -> None:
        with self.assertRaisesRegex(ValueError, "2 to 10"):
            normalize_job(
                {
                    "scheduled_at": "2026-08-10T13:00:00Z",
                    "type": "carousel",
                    "media": [{"type": "image", "url": "https://example.com/one.jpg"}],
                }
            )


if __name__ == "__main__":
    unittest.main()

