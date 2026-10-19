"""Security primitives: CSRF protection, rate limiting, session cookies."""

from __future__ import annotations

import hmac
import secrets
import threading
import time
from collections import defaultdict, deque

from flask import g, request, session

from . import config

# ---------------------------------------------------------------------------
# Rate limiting — fixed-size sliding window, keyed per identifier.
# ---------------------------------------------------------------------------


class RateLimiter:
    """Thread-safe in-memory sliding-window rate limiter."""

    def __init__(self) -> None:
        self._hits: dict[str, deque] = defaultdict(deque)
        self._lock = threading.Lock()

    def allow(self, key: str, limit: int, window: int) -> bool:
        now = time.monotonic()
        with self._lock:
            queue = self._hits[key]
            while queue and now - queue[0] > window:
                queue.popleft()
            if len(queue) >= limit:
                return False
            queue.append(now)
            return True

    def reset(self, key: str) -> None:
        with self._lock:
            self._hits.pop(key, None)


limiter = RateLimiter()


def rate_key(prefix: str) -> str:
    user_id = getattr(g, "user", None)
    identity = user_id["id"] if user_id else request.remote_addr or "anon"
    return f"{prefix}:{identity}"


# ---------------------------------------------------------------------------
# CSRF — double-submit cookie pattern.
# ---------------------------------------------------------------------------


def csrf_token() -> str:
    if "csrf" not in session:
        session["csrf"] = secrets.token_urlsafe(32)
    return session["csrf"]


def validate_csrf(candidate: str | None) -> bool:
    expected = session.get("csrf")
    if not expected or not candidate:
        return False
    return hmac.compare_digest(str(candidate), expected)


# ---------------------------------------------------------------------------
# Security headers applied to every response.
# ---------------------------------------------------------------------------

CSP = (
    "default-src 'self'; "
    "script-src 'self'; "
    "style-src 'self'; "
    "img-src 'self' data:; "
    "media-src 'self'; "
    "connect-src 'self'; "
    "font-src 'self'; "
    "base-uri 'none'; "
    "frame-ancestors 'none'; "
    "form-action 'self'"
)


def apply_security_headers(response) -> None:
    response.headers["Content-Security-Policy"] = CSP
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = (
        "camera=(), microphone=(), geolocation=(), payment=()"
    )
    response.headers["X-Robots-Tag"] = "noindex, nofollow"
    if request.is_secure:
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains"
        )
