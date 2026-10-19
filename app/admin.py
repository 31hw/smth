"""Admin area: moderation queue, user management, settings, audit log."""

from __future__ import annotations

from flask import Blueprint, abort, g, redirect, render_template, request, url_for

from . import config, models
from .security import validate_csrf
from .uploads import refresh_info_json
from .utils import clean_text, now_iso

bp = Blueprint("admin", __name__)


def _require_admin():
    if not g.user or not g.user["is_admin"]:
        abort(403)


@bp.route("/api/admin/stats")
def stats():
    _require_admin()
    return {
        "ok": True,
        "pending": models.count_tracks("pending"),
        "approved": models.count_tracks("approved"),
        "rejected": models.count_tracks("rejected"),
        "users": models.count_users(),
    }


@bp.route("/admin")
def index():
    _require_admin()
    queue = models.list_tracks(status="pending", limit=100)
    recent = models.list_tracks(limit=10)
    users = models.list_users(limit=100)
    audit = models.list_audit(limit=50)
    stats = {
        "tracks": models.count_tracks(),
        "approved": models.count_tracks("approved"),
        "pending": models.count_tracks("pending"),
        "rejected": models.count_tracks("rejected"),
        "users": models.count_users(),
    }
    registration_open = models.get_setting("registration_open", "1") == "1"
    return render_template(
        "admin.html", queue=queue, recent=recent, users=users,
        audit=audit, stats=stats,
        registration_open=registration_open,
    )


@bp.route("/api/admin/moderate", methods=["POST"])
def moderate():
    _require_admin()
    if not validate_csrf(request.form.get("csrf_token") or request.headers.get("X-CSRF-Token")):
        abort(400, "Invalid CSRF token.")

    slug = clean_text(request.form.get("slug", ""), 80)
    action = request.form.get("action", "")
    reason = clean_text(request.form.get("reason", ""), 200)
    track = models.get_track_by_slug(slug)
    if not track:
        abort(404)

    if action == "approve":
        models.update_track(
            track["id"], status="approved", reviewed_at=now_iso(),
            reviewed_by=g.user["id"],
        )
        refresh_info_json(slug, "approved")
        models.log_audit(
            g.user["id"], "moderate.approve", f"track '{slug}' approved",
            request.remote_addr,
        )
    elif action == "reject":
        models.update_track(
            track["id"], status="rejected", reject_reason=reason or None,
            reviewed_at=now_iso(), reviewed_by=g.user["id"],
        )
        refresh_info_json(slug, "rejected", reason)
        models.log_audit(
            g.user["id"], "moderate.reject",
            f"track '{slug}' rejected ({reason or 'no reason'})",
            request.remote_addr,
        )
    else:
        abort(400, "Unknown action.")
    return {"ok": True, "slug": slug, "action": action}


@bp.route("/api/admin/tracks/<slug>/delete", methods=["POST"])
def delete_track(slug: str):
    _require_admin()
    if not validate_csrf(request.form.get("csrf_token") or request.headers.get("X-CSRF-Token")):
        abort(400, "Invalid CSRF token.")
    track = models.get_track_by_slug(slug)
    if not track:
        abort(404)
    models.delete_track(slug)
    from .uploads import remove_track_files

    remove_track_files(slug)
    models.log_audit(
        g.user["id"], "track.delete", f"admin removed '{slug}'",
        request.remote_addr,
    )
    return {"ok": True}


@bp.route("/api/admin/users/<int:user_id>/toggle-admin", methods=["POST"])
def toggle_admin(user_id: int):
    _require_admin()
    if not validate_csrf(request.form.get("csrf_token") or request.headers.get("X-CSRF-Token")):
        abort(400, "Invalid CSRF token.")
    target = models.get_user_by_id(user_id)
    if not target:
        abort(404)
    if target["id"] == g.user["id"]:
        abort(400, "You cannot change your own admin status.")
    if target["is_admin"] and models.count_admins() == 1:
        abort(400, "Cannot demote the only remaining admin.")
    models.set_admin(user_id, not target["is_admin"])
    models.log_audit(
        g.user["id"],
        "user.admin-toggle",
        f"user '{target['username']}' admin={not target['is_admin']}",
        request.remote_addr,
    )
    return {"ok": True}


@bp.route("/api/admin/settings", methods=["POST"])
def update_settings():
    _require_admin()
    if not validate_csrf(request.form.get("csrf_token") or request.headers.get("X-CSRF-Token")):
        abort(400, "Invalid CSRF token.")
    value = request.form.get("registration_open", "1")
    models.set_setting("registration_open", "1" if value == "1" else "0")
    models.log_audit(
        g.user["id"], "settings.update",
        f"registration_open={value}", request.remote_addr,
    )
    return {"ok": True}


@bp.route("/api/admin/sessions/<token_hash>/revoke", methods=["POST"])
def revoke_session(token_hash: str):
    _require_admin()
    if not validate_csrf(request.form.get("csrf_token") or request.headers.get("X-CSRF-Token")):
        abort(400, "Invalid CSRF token.")
    models.delete_session_hash(token_hash)
    return {"ok": True}
