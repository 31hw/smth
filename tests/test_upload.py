import io

from werkzeug.datastructures import FileStorage

from .conftest import get_csrf


def _mp3_bytes() -> bytes:
    return b"\xff\xfb\x90\x00" + bytes(413) * 10


def _register_admin(client):
    token = get_csrf(client)
    client.post(
        "/register",
        data={
            "username": "ada",
            "password": "Sup3r$ecret!",
            "confirm_password": "Sup3r$ecret!",
            "csrf_token": token,
        },
    )
    return token


def _register_user(client, username="grace"):
    token = get_csrf(client)
    client.post(
        "/register",
        data={
            "username": username,
            "password": "Another$Password9",
            "confirm_password": "Another$Password9",
            "csrf_token": token,
        },
    )
    return token


def test_upload_enters_moderation_queue(client):
    token = _register_admin(client)
    rv = client.post(
        "/api/upload",
        data={
            "title": "Midnight Drive",
            "artist": "Neon Waves",
            "album": "Afterglow",
            "genre": "Electronic",
            "csrf_token": token,
            "file": FileStorage(
                stream=io.BytesIO(_mp3_bytes()),
                filename="song.mp3",
                content_type="audio/mpeg",
            ),
        },
    )
    assert rv.status_code == 200
    body = rv.json
    assert body["ok"] is True
    assert body["status"] == "pending"

    slug = body["slug"]
    from app import config

    assert (config.MUSIC_ROOT / slug / "music.mp3").exists()
    assert (config.MUSIC_ROOT / slug / "info.json").exists()

    import json

    info = json.loads((config.MUSIC_ROOT / slug / "info.json").read_text())
    assert info["title"] == "Midnight Drive"
    assert info["status"] == "pending"


def test_pending_track_is_not_public(app, client):
    token = _register_admin(client)
    rv = client.post(
        "/api/upload",
        data={
            "title": "Secret", "artist": "Me", "csrf_token": token,
            "file": FileStorage(
                stream=io.BytesIO(_mp3_bytes()),
                filename="song.mp3", content_type="audio/mpeg",
            ),
        },
    )
    slug = rv.json["slug"]

    anonymous = app.test_client()
    rv = anonymous.get(f"/music/{slug}/stream")
    assert rv.status_code == 404  # hidden until approved
    rv = anonymous.get("/api/tracks")
    assert all(t["slug"] != slug for t in rv.json["tracks"])


def test_non_mp3_rejected(client):
    token = _register_admin(client)
    rv = client.post(
        "/api/upload",
        data={
            "title": "Bad", "artist": "Me", "csrf_token": token,
            "file": FileStorage(
                stream=io.BytesIO(b"MZ\x90\x00"),
                filename="evil.exe",
                content_type="application/octet-stream",
            ),
        },
    )
    assert rv.status_code == 400
    assert "mp3" in rv.json["error"].lower()


def test_missing_title_rejected(client):
    token = _register_admin(client)
    rv = client.post(
        "/api/upload",
        data={
            "title": "", "artist": "Me", "csrf_token": token,
            "file": FileStorage(
                stream=io.BytesIO(_mp3_bytes()),
                filename="song.mp3", content_type="audio/mpeg",
            ),
        },
    )
    assert rv.status_code == 400


def test_csrf_required_on_upload(client):
    _register_admin(client)
    rv = client.post(
        "/api/upload",
        data={
            "title": "Nope", "artist": "Me",
            "file": FileStorage(
                stream=io.BytesIO(_mp3_bytes()),
                filename="song.mp3", content_type="audio/mpeg",
            ),
        },
    )
    assert rv.status_code == 400
