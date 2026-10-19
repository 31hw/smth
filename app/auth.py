"""Authentication: registration, login, logout, sessions."""

from __future__ import annotations

import re
import secrets
from datetime import datetime, timedelta, timezone

from flask import Blueprint, flash, redirect, render_template, request
from flask import abort, g, make_response, url_for
from werkzeug.security import check_password_hash, generate_password_hash

from . import config, models
from .security import limiter, validate_csrf
from .utils import clean_text, hash_token, now_iso

bp = Blueprint("auth", __name__)

USERNAME_RE = re.compile(r"^[A-Za-z0-9_-]{3,24}$")

# A tiny block-list of the most common passwords.
COMMON_PASSWORDS = {
    "123456", "password", "123456789", "12345678", "12345",
    "1234567", "qwerty", "abc123", "football", "monkey",
    "letmein", "dragon", "111111", "baseball", "iloveyou",
    "trustno1", "sunshine", "master", "123123", "welcome",
    "password1", "superman", "princess", "admin", "admin123",
}


def _make_session_response(user_id: int):
    """Create a server-side session row and set the auth cookie."""
    token = secrets.token_urlsafe(32)
    expires_at = (
        datetime.now(timezone.utc)
        + timedelta(days=config.SESSION_LIFETIME_DAYS)
    ).isoformat(timespec="seconds")
    from .utils import hash_token, now_iso

    models.create_session(
        user_id=user_id,
        token_hash=hash_token(token),
        ip=request.remote_addr,
        user_agent=request.headers.get("User-Agent", "")[:255],
        expires_at=expires_at,
    )
    resp = make_response(redirect(url_for("music.index")))
    resp.set_cookie(
        config.Config.AUTH_COOKIE_NAME,
        token,
        max_age=config.SESSION_LIFETIME_DAYS * 86400,
        httponly=True,
        samesite="Lax",
        secure=config.Config.SESSION_COOKIE_SECURE,
    )
    return resp


def _require_password_strength(password: str) -> str | None:
    if len(password) < 8:
        return "Password must be at least 8 characters long."
    if password.lower() in COMMON_PASSWORDS:
        return "That password is too common. Pick something stronger."
    categories = sum(
        (
            any(c.islower() for c in password),
            any(c.isupper() for c in password),
            any(c.isdigit() for c in password),
            any(not c.isalnum() for c in password),
        )
    )
    if categories < 3 and len(password) < 14:
        return (
            "Password needs more variety: mix upper/lowercase, "
            "digits and symbols (or make it 14+ characters)."
        )
    return None


@bp.route("/register", methods=["GET"])
def register_form():
    if g.user:
        return redirect(url_for("music.index"))
    return render_template("register.html")


@bp.route("/register", methods=["POST"])
def register():
    if g.user:
        abort(400)
    if not validate_csrf(request.form.get("csrf_token")):
        abort(400, "Invalid CSRF token.")

    registrations_open = models.get_setting("registration_open", "1") == "1"
    if not registrations_open and models.count_users() > 0:
        abort(403, "Registration is currently disabled by an admin.")

    username = clean_text(request.form.get("username", ""), 24)
    password = request.form.get("password", "")
    confirm = request.form.get("confirm_password", "")

    if not USERNAME_RE.match(username):
        return render_template(
            "register.html",
            error="Username must be 3-24 characters: letters, numbers, _ or -.",
        ), 400
    if models.get_user_by_username(username):
        return render_template("register.html", error="Username already taken."), 400
    problem = _require_password_strength(password)
    if problem:
        return render_template("register.html", error=problem), 400
    if password != confirm:
        return render_template("register.html", error="Passwords do not match."), 400

    # The first account ever created becomes the full administrator.
    is_first = models.count_users() == 0
    user_id = models.create_user(
        username=username,
        password_hash=generate_password_hash(password, method="scrypt"),
        is_admin=is_first,
    )
    models.log_audit(
        user_id, "register",
        f"user '{username}' created (first_user={is_first})",
        request.remote_addr,
    )
    return _make_session_response(user_id)


@bp.route("/login", methods=["GET"])
def login_form():
    if g.user:
        return redirect(url_for("music.index"))
    return render_template("login.html")


@bp.route("/login", methods=["POST"])
def login():
    if g.user:
        abort(400)
    if not validate_csrf(request.form.get("csrf_token")):
        abort(400, "Invalid CSRF token.")

    ip = request.remote_addr or "unknown"
    username = clean_text(request.form.get("username", ""), 24)
    password = request.form.get("password", "")

    # Per-IP login throttling.
    if not limiter.allow(f"login:{ip}", config.LOGIN_RATE_LIMIT, config.LOGIN_RATE_WINDOW):
        abort(429, "Too many login attempts. Wait a few minutes.")

    user = models.get_user_by_username(username)
    if not user or not check_password_hash(user["password_hash"], password):
        models.log_audit(None, "login.fail", f"username={username}", ip)
        return render_template("login.html", error="Invalid username or password."), 401

    models.update_last_login(user["id"])
    models.log_audit(user["id"], "login", "session started", ip)
    return _make_session_response(user["id"])


@bp.route("/logout", methods=["POST"])
def logout():
    if not validate_csrf(request.form.get("csrf_token")):
        abort(400, "Invalid CSRF token.")
    if g.session_token:
        models.delete_session(g.session_token)
    resp = make_response(redirect(url_for("music.index")))
    resp.delete_cookie(config.Config.AUTH_COOKIE_NAME)
    return resp
