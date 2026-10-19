"""Small helper utilities shared across the application."""

from __future__ import annotations

import hashlib
import re
import unicodedata
from datetime import datetime, timezone

_SLUG_STRIP_RE = re.compile(r"[^a-z0-9]+")
_CONTROL_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


def slugify(text: str) -> str:
    """Convert arbitrary text into a safe, filesystem-friendly slug.

    The result only ever contains ``[a-z0-9-]`` so it can never contain path
    separators or traversal sequences.
    """
    normalized = unicodedata.normalize("NFKD", text or "")
    normalized = normalized.encode("ascii", "ignore").decode("ascii").lower()
    slug = _SLUG_STRIP_RE.sub("-", normalized).strip("-")
    return slug or "track"


def clean_text(value: str | None, max_len: int = 256) -> str:
    """Strip control characters and cap the length of user supplied text."""
    if value is None:
        return ""
    value = _CONTROL_RE.sub("", str(value))
    value = " ".join(value.split())
    return value[:max_len]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def human_size(num_bytes: int | None) -> str:
    if not num_bytes:
        return "0 B"
    units = ("B", "KB", "MB", "GB")
    size = float(num_bytes)
    for unit in units:
        if size < 1024 or unit == units[-1]:
            return f"{size:.1f} {unit}" if unit != "B" else f"{int(size)} B"
        size /= 1024
    return f"{size:.1f} GB"


def fmt_duration(seconds: float | None) -> str:
    """Render seconds as ``m:ss`` or ``h:mm:ss``."""
    if not seconds or seconds <= 0:
        return "0:00"
    total = int(round(seconds))
    minutes, secs = divmod(total, 60)
    hours, minutes = divmod(minutes, 60)
    if hours:
        return f"{hours}:{minutes:02d}:{secs:02d}"
    return f"{minutes}:{secs:02d}"


def hash_token(token: str) -> str:
    """Hash a session token so the database never stores the raw value."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def avatar_gradient(name: str) -> tuple[str, str]:
    """Deterministic two-colour gradient derived from a username."""
    digest = hashlib.md5(name.encode("utf-8", "ignore")).hexdigest()
    hue1 = int(digest[0:8], 16) % 360
    hue2 = (hue1 + 40 + int(digest[8:12], 16) % 80) % 360
    return (f"hsl({hue1}, 65%, 45%)", f"hsl({hue2}, 70%, 30%)")
