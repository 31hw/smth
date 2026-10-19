"""Public JSON API for the single-page style UI."""

from __future__ import annotations

from flask import Blueprint, g, jsonify, request

from . import config, models
from .utils import clean_text

bp = Blueprint("api", __name__)


def _serialize(track) -> dict:
    return {
        "id": track["id"],
        "slug": track["slug"],
        "title": track["title"],
        "artist": track["artist"],
        "album": track["album"],
        "genre": track["genre"],
        "duration": track["duration"],
        "file_size": track["file_size"],
        "status": track["status"],
        "uploader": track["uploader_name"] if "uploader_name" in track.keys() else None,
        "created_at": track["created_at"],
        "stream_url": f"/music/{track['slug']}/stream",
    }


@bp.route("/api/tracks")
def tracks():
    query = clean_text(request.args.get("q", ""), 80)
    genre = clean_text(request.args.get("genre", ""), 32)
    rows = models.list_tracks(status="approved", limit=config.PAGE_SIZE)
    result = [_serialize(t) for t in rows]
    if query:
        q = query.lower()
        result = [
            t for t in result
            if q in t["title"].lower()
            or q in (t["artist"] or "").lower()
            or q in (t["album"] or "").lower()
            or q in (t["genre"] or "").lower()
        ]
    if genre:
        result = [t for t in result if (t["genre"] or "").lower() == genre.lower()]
    return jsonify({"ok": True, "count": len(result), "tracks": result})


@bp.route("/api/tracks/<slug>")
def track_detail(slug: str):
    track = models.get_track_by_slug(slug)
    if not track or track["status"] != "approved":
        return {"ok": False, "error": "Not found"}, 404
    return _serialize(track)


@bp.route("/api/me")
def me():
    if not g.user:
        return {"ok": False, "error": "not logged in"}, 401
    return {"ok": True, "user": g.user}
