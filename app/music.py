"""Music browsing, streaming, uploads and the account area."""

from __future__ import annotations

from flask import (
    Blueprint, abort, flash, g, redirect, render_template, request,
    send_file, url_for,
)
from werkzeug.exceptions import RequestEntityTooLarge
from werkzeug.security import check_password_hash, generate_password_hash

from . import config, models
from .security import limiter, validate_csrf
from .uploads import (
    remove_track_files,
    refresh_info_json,
    store_upload,
    validate_mp3_upload,
)
from .utils import clean_text

bp = Blueprint("music", __name__)


# ---------------------------------------------------------------------------
# Pages
# ---------------------------------------------------------------------------

@bp.route("/")
def index():
    tracks = models.list_tracks(status="approved", limit=config.PAGE_SIZE)
    genres = sorted({t["genre"] for t in tracks if t["genre"]})
    return render_template(
        "home.html", tracks=tracks, genres=genres,
        total=models.count_tracks(status="approved"),
    )


@bp.route("/account")
def account():
    if not g.user:
        return redirect(url_for("auth.login_form"))
    my_tracks = models.list_tracks_by_user(g.user["id"])
    sessions = models.list_sessions(g.user["id"])
    tab = request.args.get("tab", "overview")
    if tab not in {"overview", "music", "uploads", "security"}:
        tab = "overview"
    return render_template(
        "account.html", tab=tab, my_tracks=my_tracks, sessions=sessions,
    )


# ---------------------------------------------------------------------------
# Streaming (Range-aware, approved tracks only)
# ---------------------------------------------------------------------------

@bp.route("/music/<slug>/stream")
def stream(slug: str):
    track = models.get_track_by_slug(slug)
    if track is None:
        abort(404)
    public = track["status"] == "approved"
    owner = g.user and g.user["id"] == track["uploaded_by"]
    admin = g.user and g.user["is_admin"]
    if not (public or owner or admin):
        abort(404)  # pretend it does not exist
    path = config.MUSIC_ROOT / slug / "music.mp3"
    if not path.is_file():
        abort(404)
    response = send_file(
        str(path), mimetype="audio/mpeg", conditional=True, max_age=300,
    )
    response.headers["Content-Disposition"] = f'inline; filename="{slug}.mp3"'
    return response


# ---------------------------------------------------------------------------
# Uploads
# ---------------------------------------------------------------------------

@bp.route("/api/upload", methods=["POST"])
def upload():
    if not g.user:
        abort(401)
    if not validate_csrf(request.form.get("csrf_token") or request.headers.get("X-CSRF-Token")):
        abort(400, "Invalid CSRF token.")
    if not limiter.allow(f"upload:{g.user['id']}", config.UPLOAD_RATE_LIMIT, config.UPLOAD_RATE_WINDOW):
        abort(429, "Too many uploads this hour.")

    file = request.files.get("file")
    error = validate_mp3_upload(file)
    if error:
        return {"ok": False, "error": error}, 400

    title = clean_text(request.form.get("title", ""), config.MAX_TITLE_LEN)
    artist = clean_text(request.form.get("artist", ""), config.MAX_ARTIST_LEN)
    album = clean_text(request.form.get("album", ""), config.MAX_ALBUM_LEN) or None
    genre = clean_text(request.form.get("genre", ""), config.MAX_GENRE_LEN) or None
    if not title or not artist:
        return {"ok": False, "error": "Title and artist are required."}, 400

    record = store_upload(
        file, title=title, artist=artist, album=album,
        genre=genre, user_id=g.user["id"],
    )
    models.log_audit(
        g.user["id"], "upload",
        f"track '{record['slug']}' queued for moderation",
        request.remote_addr,
    )
    return {
        "ok": True,
        "slug": record["slug"],
        "status": "pending",
        "message": "Upload received — an admin will review it shortly.",
    }


@bp.route("/api/tracks/<slug>/delete", methods=["POST"])
def delete_track(slug: str):
    if not g.user:
        abort(401)
    if not validate_csrf(request.form.get("csrf_token") or request.headers.get("X-CSRF-Token")):
        abort(400, "Invalid CSRF token.")
    track = models.get_track_by_slug(slug)
    if not track:
        abort(404)
    is_owner = track["uploaded_by"] == g.user["id"]
    if not (is_owner or g.user["is_admin"]):
        abort(403)
    models.delete_track(slug)
    remove_track_files(slug)
    models.log_audit(
        g.user["id"], "track.delete", f"track '{slug}' removed",
        request.remote_addr,
    )
    return {"ok": True}


# ---------------------------------------------------------------------------
# Account actions
# ---------------------------------------------------------------------------

@bp.route("/api/account/password", methods=["POST"])
def change_password():
    if not g.user:
        abort(401)
    if not validate_csrf(request.form.get("csrf_token") or request.headers.get("X-CSRF-Token")):
        abort(400, "Invalid CSRF token.")
    user = models.get_user_by_id(g.user["id"])
    if not check_password_hash(user["password_hash"], request.form.get("old_password", "")):
        return {"ok": False, "error": "Current password is incorrect."}, 400
    new_password = request.form.get("new_password", "")
    if len(new_password) < 8:
        return {"ok": False, "error": "New password must be at least 8 characters."}, 400
    if check_password_hash(user["password_hash"], new_password):
        return {"ok": False, "error": "New password must differ from the old one."}, 400
    models.update_user_password(
        user["id"], generate_password_hash(new_password, method="scrypt")
    )
    models.log_audit(g.user["id"], "password.change", "", request.remote_addr)
    return {"ok": True, "message": "Password updated."}


@bp.route("/api/account/delete", methods=["POST"])
def delete_account():
    if not g.user:
        abort(401)
    if not validate_csrf(request.form.get("csrf_token") or request.headers.get("X-CSRF-Token")):
        abort(400, "Invalid CSRF token.")
    user = models.get_user_by_id(g.user["id"])
    if not check_password_hash(user["password_hash"], request.form.get("password", "")):
        return {"ok": False, "error": "Password incorrect."}, 400
    if models.count_admins() == 1 and user["is_admin"]:
        return {"ok": False, "error": "The last admin cannot delete its own account."}, 403
    models.log_audit(g.user["id"], "account.delete", user["username"], request.remote_addr)
    if g.session_token:
        models.delete_session(g.session_token)
    models.delete_user(g.user["id"])
    from flask import make_response

    resp = make_response(redirect(url_for("music.index")))
    resp.delete_cookie(config.Config.AUTH_COOKIE_NAME)
    return resp


@bp.route("/api/sessions/<token_hash>/revoke", methods=["POST"])
def revoke_session(token_hash: str):
    if not g.user:
        abort(401)
    if not validate_csrf(request.form.get("csrf_token") or request.headers.get("X-CSRF-Token")):
        abort(400, "Invalid CSRF token.")
    sessions = models.list_sessions(g.user["id"])
    if not any(s["token_hash"] == token_hash for s in sessions):
        abort(404)
    models.delete_session_hash(token_hash)
    return {"ok": True}
