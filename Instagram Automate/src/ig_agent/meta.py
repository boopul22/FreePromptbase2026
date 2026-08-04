from __future__ import annotations

import json
import socket
import time
from dataclasses import dataclass
from typing import Any, Callable
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


@dataclass
class MetaAPIError(Exception):
    message: str
    code: int | None = None
    subcode: int | None = None
    transient: bool = False
    http_status: int | None = None

    def __str__(self) -> str:
        details = [self.message]
        if self.code is not None:
            details.append(f"code={self.code}")
        if self.subcode is not None:
            details.append(f"subcode={self.subcode}")
        return " | ".join(details)


class MetaClient:
    def __init__(
        self,
        access_token: str,
        user_id: str,
        api_host: str,
        api_version: str,
        timeout: int = 60,
    ):
        self.access_token = access_token
        self.user_id = user_id
        self.api_host = api_host.rstrip("/")
        self.api_version = api_version.strip("/")
        self.timeout = timeout

    def _url(self, path: str) -> str:
        return f"{self.api_host}/{self.api_version}/{path.lstrip('/')}"

    @staticmethod
    def _encode_value(value: Any) -> str:
        if isinstance(value, bool):
            return "true" if value else "false"
        if isinstance(value, (dict, list)):
            return json.dumps(value, separators=(",", ":"))
        return str(value)

    def request(self, method: str, path: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        params = params or {}
        encoded = {key: self._encode_value(value) for key, value in params.items() if value is not None}
        data = None
        url = self._url(path)
        if method.upper() == "GET" and encoded:
            url = f"{url}?{urlencode(encoded)}"
        elif method.upper() == "POST":
            data = urlencode(encoded).encode("utf-8")

        request = Request(
            url,
            data=data,
            method=method.upper(),
            headers={
                "Authorization": f"Bearer {self.access_token}",
                "Accept": "application/json",
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": "ig-agent-cli/0.1.0",
            },
        )
        try:
            with urlopen(request, timeout=self.timeout) as response:
                body = response.read().decode("utf-8")
        except HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")
            raise self._error_from_body(body, exc.code) from exc
        except (URLError, TimeoutError, socket.timeout) as exc:
            raise MetaAPIError(f"Network error: {exc}", transient=True) from exc

        try:
            parsed = json.loads(body)
        except json.JSONDecodeError as exc:
            raise MetaAPIError("Meta returned a non-JSON response", transient=True) from exc
        if "error" in parsed:
            raise self._error_from_payload(parsed["error"], None)
        return parsed

    def _error_from_body(self, body: str, status: int) -> MetaAPIError:
        try:
            payload = json.loads(body).get("error", {})
        except json.JSONDecodeError:
            return MetaAPIError(
                f"Meta HTTP {status}: {body[:500]}",
                transient=status == 429 or status >= 500,
                http_status=status,
            )
        return self._error_from_payload(payload, status)

    @staticmethod
    def _error_from_payload(payload: dict[str, Any], status: int | None) -> MetaAPIError:
        code = payload.get("code")
        transient = bool(payload.get("is_transient")) or status == 429 or (status or 0) >= 500
        return MetaAPIError(
            message=str(payload.get("message", "Unknown Meta API error")),
            code=int(code) if isinstance(code, int) else None,
            subcode=payload.get("error_subcode"),
            transient=transient,
            http_status=status,
        )

    def account(self) -> dict[str, Any]:
        return self.request(
            "GET", self.user_id or "me", {"fields": "id,username,account_type"}
        )

    def publishing_limit(self) -> dict[str, Any]:
        return self.request("GET", f"{self.user_id}/content_publishing_limit", {"fields": "quota_usage"})

    def create_container(self, params: dict[str, Any]) -> str:
        result = self.request("POST", f"{self.user_id}/media", params)
        container_id = result.get("id")
        if not container_id:
            raise MetaAPIError("Meta did not return a container ID", transient=True)
        return str(container_id)

    def container_status(self, container_id: str) -> dict[str, Any]:
        return self.request("GET", container_id, {"fields": "id,status,status_code"})

    def publish_container(self, container_id: str) -> str:
        result = self.request(
            "POST", f"{self.user_id}/media_publish", {"creation_id": container_id}
        )
        media_id = result.get("id")
        if not media_id:
            raise MetaAPIError("Meta did not return a published media ID", transient=True)
        return str(media_id)


class MetaPublisher:
    def __init__(self, client: MetaClient, processing_timeout: int = 300, poll_interval: int = 5):
        self.client = client
        self.processing_timeout = processing_timeout
        self.poll_interval = poll_interval

    def _wait_for_container(self, container_id: str) -> None:
        deadline = time.monotonic() + self.processing_timeout
        while time.monotonic() < deadline:
            result = self.client.container_status(container_id)
            status = str(result.get("status_code", "")).upper()
            if status == "FINISHED":
                return
            if status in {"ERROR", "EXPIRED"}:
                detail = result.get("status") or status
                raise MetaAPIError(f"Container processing failed: {detail}")
            time.sleep(self.poll_interval)
        raise MetaAPIError(
            f"Container processing timed out after {self.processing_timeout} seconds",
            transient=True,
        )

    def _new_container(self, payload: dict[str, Any]) -> str:
        post_type = payload["type"]
        media = payload["media"]
        caption = payload.get("caption", "")

        if post_type == "image":
            params: dict[str, Any] = {"image_url": media[0]["url"]}
            if caption:
                params["caption"] = caption
            if payload.get("alt_text"):
                params["alt_text"] = payload["alt_text"]
            return self.client.create_container(params)

        if post_type == "reel":
            params = {
                "media_type": "REELS",
                "video_url": media[0]["url"],
                "share_to_feed": payload.get("share_to_feed", True),
            }
            if caption:
                params["caption"] = caption
            if payload.get("cover_url"):
                params["cover_url"] = payload["cover_url"]
            if payload.get("alt_text"):
                params["alt_text"] = payload["alt_text"]
            return self.client.create_container(params)

        if post_type == "story":
            item = media[0]
            params = {"media_type": "STORIES"}
            params["image_url" if item["type"] == "image" else "video_url"] = item["url"]
            return self.client.create_container(params)

        if post_type == "carousel":
            child_ids: list[str] = []
            for item in media:
                child_params: dict[str, Any] = {"is_carousel_item": True}
                if item["type"] == "image":
                    child_params["image_url"] = item["url"]
                else:
                    child_params.update({"media_type": "VIDEO", "video_url": item["url"]})
                child_id = self.client.create_container(child_params)
                if item["type"] == "video":
                    self._wait_for_container(child_id)
                child_ids.append(child_id)
            parent_params: dict[str, Any] = {
                "media_type": "CAROUSEL",
                "children": ",".join(child_ids),
            }
            if caption:
                parent_params["caption"] = caption
            return self.client.create_container(parent_params)

        raise ValueError(f"Unsupported post type: {post_type}")

    def publish(
        self,
        payload: dict[str, Any],
        existing_container_id: str | None = None,
        on_container: Callable[[str], None] | None = None,
    ) -> str:
        container_id = existing_container_id or self._new_container(payload)
        if not existing_container_id and on_container:
            on_container(container_id)

        post_type = payload["type"]
        needs_processing = (
            post_type in {"reel", "carousel"}
            or (post_type == "story" and payload["media"][0]["type"] == "video")
        )
        if needs_processing:
            self._wait_for_container(container_id)
        return self.client.publish_container(container_id)
