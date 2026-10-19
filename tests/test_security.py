import io

from werkzeug.datastructures import FileStorage

from .conftest import get_csrf
from .test_upload import _register_admin, _mp3_bytes


def test_path_traversal_slug_is_neutralised(client):
    token = _register_admin(client)
    rv = client.post(
        "/api/upload",
        data={
            "title": "../../etc/passwd", "artist": "X", "csrf_token": token,
            "file": FileStorage(
                stream=io.BytesIO(_mp3_bytes()),
                filename="a.mp3", content_type="audio/mpeg",
            ),
        },
    )
    assert rv.status_code == 200
    slug = rv.json["slug"]
    assert ".." not in slug and "/" not in slug and "\\" not in slug


def test_security_headers_present(client):
    rv = client.get("/")
    assert rv.status_code == 200
    assert "Content-Security-Policy" in rv.headers
    assert rv.headers["X-Content-Type-Options"] == "nosniff"
    assert rv.headers["X-Frame-Options"] == "DENY"


def test_admin_page_requires_admin(client):
    _register_admin(client)
    rv = client.get("/admin")
    assert rv.status_code == 200  # first user is admin


def test_404_for_unknown_routes(client):
    rv = client.get("/does-not-exist")
    assert rv.status_code == 404


def test_login_throttled_after_burst(app, client):
    from app import config, models
    from app.database import init_db
    from werkzeug.security import generate_password_hash

    with app.app_context():
        models.create_user(
            username="victim",
            password_hash=generate_password_hash("pw", method="scrypt"),
        )
    codes = []
    for _ in range(config.LOGIN_RATE_LIMIT + 3):
        codes.append(
            client.post(
                "/login",
                data={"username": "victim", "password": "wrong",
                      "csrf_token": get_csrf(client)},
            ).status_code
        )
    assert 429 in codes
