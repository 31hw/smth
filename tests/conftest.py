import os
import re
import sys
import tempfile
from pathlib import Path

import pytest

# Point the app at a throwaway location before anything is imported.
TMP = Path(tempfile.mkdtemp(prefix="smth-test-"))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app import config  # noqa: E402

config.Config.SECRET_KEY = "test-secret-key"
config.Config.SESSION_COOKIE_SECURE = False

import app.database as database  # noqa: E402
from app.main import create_app  # noqa: E402


@pytest.fixture()
def app():
    # Fresh database + music store for every test.
    tmp = Path(tempfile.mkdtemp(prefix="smth-test-"))
    config.DB_DIR = tmp
    config.DB_PATH = tmp / "app.db"
    config.MUSIC_ROOT = tmp / "music"
    config.SECRET_KEY_FILE = tmp / ".secret_key"
    database.init_db()
    application = create_app()
    application.config.update(TESTING=True)
    yield application


@pytest.fixture()
def client(app):
    return app.test_client()


def get_csrf(client) -> str:
    """Pull the CSRF token out of a rendered page."""
    rv = client.get("/")
    match = re.search(
        r'name="csrf-token" content="([^"]+)"', rv.get_data(as_text=True)
    )
    assert match, "CSRF meta tag missing from login page"
    return match.group(1)


def make_mp3(path: Path, frames: int = 10) -> Path:
    frame = b"\xff\xfb\x90\x00" + bytes(413)
    path.write_bytes(frame * frames)
    return path
