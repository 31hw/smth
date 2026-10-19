import io

from werkzeug.datastructures import FileStorage

from .conftest import get_csrf
from .test_upload import _register_admin, _register_user, _mp3_bytes


def _upload(client, token, title):
    rv = client.post(
        "/api/upload",
        data={
            "title": title, "artist": "Artist", "csrf_token": token,
            "file": FileStorage(
                stream=io.BytesIO(_mp3_bytes()),
                filename=title + ".mp3", content_type="audio/mpeg",
            ),
        },
    )
    assert rv.status_code == 200
    return rv.json["slug"]


def test_admin_can_approve_and_stream(client):
    token = _register_admin(client)
    slug = _upload(client, token, "Approved Song")

    rv = client.post(
        "/api/admin/moderate",
        data={"slug": slug, "action": "approve", "csrf_token": token},
    )
    assert rv.status_code == 200

    rv = client.get(f"/music/{slug}/stream")
    assert rv.status_code == 200
    assert rv.headers["Content-Type"].startswith("audio/mpeg")
    assert b"\xff\xfb" in rv.data

    rv = client.get("/api/tracks")
    assert any(t["slug"] == slug for t in rv.json["tracks"])


def test_admin_can_reject_with_reason(app, client):
    token = _register_admin(client)
    slug = _upload(client, token, "Bad Song")

    rv = client.post(
        "/api/admin/moderate",
        data={"slug": slug, "action": "reject",
              "reason": "copyright", "csrf_token": token},
    )
    assert rv.status_code == 200

    from app import models

    with app.app_context():
        track = models.get_track_by_slug(slug)
    assert track["status"] == "rejected"
    assert track["reject_reason"] == "copyright"


def test_regular_user_cannot_moderate(app, client):
    token = _register_admin(client)
    slug = _upload(client, token, "Song X")

    # A brand-new visitor registers a non-admin account.
    other = app.test_client()
    user_token = _register_user(other, "grace")
    rv = other.post(
        "/api/admin/moderate",
        data={"slug": slug, "action": "approve", "csrf_token": user_token},
    )
    assert rv.status_code in (401, 403)


def test_owner_can_delete_pending_upload(app, client):
    token = _register_admin(client)
    slug = _upload(client, token, "Doomed Song")

    rv = client.post(
        f"/api/tracks/{slug}/delete",
        data={"csrf_token": token},
    )
    assert rv.status_code == 200

    from app import models

    with app.app_context():
        assert models.get_track_by_slug(slug) is None
