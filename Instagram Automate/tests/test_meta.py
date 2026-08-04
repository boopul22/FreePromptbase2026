from __future__ import annotations

import unittest
from typing import Any

from ig_agent.meta import MetaPublisher


class FakeClient:
    def __init__(self) -> None:
        self.created: list[dict[str, Any]] = []
        self.published: list[str] = []

    def create_container(self, params: dict[str, Any]) -> str:
        self.created.append(params)
        return f"container-{len(self.created)}"

    def container_status(self, container_id: str) -> dict[str, Any]:
        return {"id": container_id, "status_code": "FINISHED"}

    def publish_container(self, container_id: str) -> str:
        self.published.append(container_id)
        return "media-1"


class MetaPublisherTests(unittest.TestCase):
    def test_image_publish_uses_two_step_flow(self) -> None:
        client = FakeClient()
        publisher = MetaPublisher(client)  # type: ignore[arg-type]
        captured: list[str] = []
        media_id = publisher.publish(
            {
                "type": "image",
                "caption": "hello",
                "alt_text": "description",
                "media": [{"type": "image", "url": "https://example.com/post.jpg"}],
            },
            on_container=captured.append,
        )
        self.assertEqual(media_id, "media-1")
        self.assertEqual(captured, ["container-1"])
        self.assertEqual(client.created[0]["image_url"], "https://example.com/post.jpg")
        self.assertEqual(client.published, ["container-1"])

    def test_carousel_creates_children_then_parent(self) -> None:
        client = FakeClient()
        publisher = MetaPublisher(client, poll_interval=0)  # type: ignore[arg-type]
        publisher.publish(
            {
                "type": "carousel",
                "caption": "slides",
                "media": [
                    {"type": "image", "url": "https://example.com/one.jpg"},
                    {"type": "video", "url": "https://example.com/two.mp4"},
                ],
            }
        )
        self.assertEqual(len(client.created), 3)
        self.assertEqual(client.created[2]["media_type"], "CAROUSEL")
        self.assertEqual(client.created[2]["children"], "container-1,container-2")
        self.assertEqual(client.published, ["container-3"])


if __name__ == "__main__":
    unittest.main()

