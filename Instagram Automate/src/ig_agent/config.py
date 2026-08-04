from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


def load_env_file(path: Path | None = None) -> Path | None:
    """Load a small dotenv file without adding a runtime dependency.

    Existing process environment values always win over values in the file.
    """
    configured = os.environ.get("IG_AGENT_ENV")
    env_path = path or (Path(configured).expanduser() if configured else Path.cwd() / ".env")
    if not env_path.is_file():
        return None

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[7:].strip()
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()
        if not key:
            continue
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
            value = value[1:-1]
        os.environ.setdefault(key, value)
    return env_path


def default_db_path() -> Path:
    configured = os.environ.get("IG_AGENT_DB")
    if configured:
        return Path(configured).expanduser().resolve()
    return Path.home() / ".local" / "share" / "ig-agent" / "jobs.sqlite3"


@dataclass(frozen=True)
class Settings:
    access_token: str
    user_id: str
    api_host: str
    api_version: str
    db_path: Path
    processing_timeout: int

    @classmethod
    def from_env(cls, require_credentials: bool = True) -> "Settings":
        load_env_file()
        token = os.environ.get("IG_ACCESS_TOKEN", "").strip()
        user_id = os.environ.get("IG_USER_ID", "").strip()
        if require_credentials:
            missing = [
                name
                for name, value in (
                    ("IG_ACCESS_TOKEN", token),
                    ("IG_USER_ID", user_id),
                )
                if not value
            ]
            if missing:
                raise ValueError(f"Missing required environment variables: {', '.join(missing)}")

        host = os.environ.get("IG_API_HOST", "https://graph.instagram.com").strip().rstrip("/")
        version = os.environ.get("IG_API_VERSION", "v25.0").strip().strip("/")
        if not version.startswith("v"):
            version = f"v{version}"

        try:
            timeout = int(os.environ.get("IG_PROCESSING_TIMEOUT", "300"))
        except ValueError as exc:
            raise ValueError("IG_PROCESSING_TIMEOUT must be an integer") from exc
        if timeout < 10:
            raise ValueError("IG_PROCESSING_TIMEOUT must be at least 10 seconds")

        return cls(
            access_token=token,
            user_id=user_id,
            api_host=host,
            api_version=version,
            db_path=default_db_path(),
            processing_timeout=timeout,
        )
