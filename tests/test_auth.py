from .conftest import get_csrf


def test_first_account_becomes_admin(client):
    rv = client.post(
        "/register",
        data={
            "username": "ada",
            "password": "Sup3r$ecret!",
            "confirm_password": "Sup3r$ecret!",
            "csrf_token": get_csrf(client),
        },
        follow_redirects=False,
    )
    assert rv.status_code == 302
    assert "smth_auth" in rv.headers.get("Set-Cookie", "")

    rv = client.get("/api/me")
    assert rv.status_code == 200
    assert rv.json["user"]["is_admin"] is True


def test_second_account_is_not_admin(app, client):
    client.post(
        "/register",
        data={
            "username": "ada",
            "password": "Sup3r$ecret!",
            "confirm_password": "Sup3r$ecret!",
            "csrf_token": get_csrf(client),
        },
    )
    # A second client simulates a brand-new visitor.
    other = app.test_client()
    rv = other.post(
        "/register",
        data={
            "username": "grace",
            "password": "Another$Password9",
            "confirm_password": "Another$Password9",
            "csrf_token": get_csrf(other),
        },
    )
    assert rv.status_code == 302
    rv = other.get("/api/me")
    assert rv.json["user"]["is_admin"] is False


def test_login_logout_cycle(client):
    client.post(
        "/register",
        data={
            "username": "ada",
            "password": "Sup3r$ecret!",
            "confirm_password": "Sup3r$ecret!",
            "csrf_token": get_csrf(client),
        },
    )
    client.post("/logout", data={"csrf_token": get_csrf(client)})
    rv = client.get("/api/me")
    assert rv.status_code == 401

    rv = client.post(
        "/login",
        data={
            "username": "ada",
            "password": "Sup3r$ecret!",
            "csrf_token": get_csrf(client),
        },
        follow_redirects=False,
    )
    assert rv.status_code == 302
    assert client.get("/api/me").json["user"]["username"] == "ada"


def test_duplicate_username_rejected(client):
    payload = dict(
        username="ada",
        password="Sup3r$ecret!",
        confirm_password="Sup3r$ecret!",
        csrf_token=get_csrf(client),
    )
    client.post("/register", data=payload)
    rv = client.post("/register", data=payload)
    assert rv.status_code == 400


def test_weak_password_rejected(client):
    rv = client.post(
        "/register",
        data={
            "username": "ada",
            "password": "123456",
            "confirm_password": "123456",
            "csrf_token": get_csrf(client),
        },
    )
    assert rv.status_code == 400
