"""Request lifecycle hooks: authentication, rate limiting, headers."""

from __future__ import annotations

from flask import abort, g, request

from . import config, models
from .security import apply_security_headers, limiter


def load_user() -> None:
    """Resolve the session cookie into ``g.user`` / ``g.session_token``."""
    token = request.cookies.get(config.Config.AUTH_COOKIE_NAME)
    row = models.get_session(token) if token else None
    if row is not None:
        g.user = {
            "id": row["user_id"],
            "username": row["username"],
            "is_admin": bool(row["is_admin"]),
            "created_at": row["created_at"],
        }
        g.session_token = token
    else:
        g.user = None
        g.session_token = None
    models.purge_expired_sessions()


def enforce_global_rate_limit() -> None:
    key = f"global:{request.remote_addr or 'unknown'}"
    if not limiter.allow(
        key, config.GLOBAL_RATE_LIMIT, config.GLOBAL_RATE_WINDOW
    ):
        abort(429, "Too many requests. Slow down a little.")


def set_security_headers(response) -> None:
    apply_security_headers(response)
    return response


def register(app) -> None:
    app.before_request(load_user)
    app.before_request(enforce_global_rate_limit)
    app.after_request(set_security_headers)
