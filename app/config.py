"""Central configuration for SMTH Music.

Everything is derived from environment variables with safe local defaults,
so the application works out of the box on a fresh machine.
"""

from __future__ import annotations

import os
import secrets
from pathlib import Path

# ---------------------------------------------------------------------------
# Paths — the workspace root is the parent directory of this package.
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent
DB_DIR = BASE_DIR / "db"
DB_PATH = DB_DIR / "app.db"
MUSIC_ROOT = DB_DIR / "music"
SECRET_KEY_FILE = DB_DIR / ".secret_key"
CONFIG_DIR = BASE_DIR / "config"

# ---------------------------------------------------------------------------
# Tunables
# ---------------------------------------------------------------------------
MAX_UPLOAD_MB = int(os.environ.get("SMTH_MAX_UPLOAD_MB", "50"))
MAX_CONTENT_LENGTH = MAX_UPLOAD_MB * 1024 * 1024 + 1024 * 1024  # Flask hard cap
PAGE_SIZE = int(os.environ.get("SMTH_PAGE_SIZE", "60"))
SESSION_LIFETIME_DAYS = 30
LOGIN_RATE_LIMIT = 6          # attempts
LOGIN_RATE_WINDOW = 300       # seconds
GLOBAL_RATE_LIMIT = 900       # requests
GLOBAL_RATE_WINDOW = 60       # seconds
UPLOAD_RATE_LIMIT = 10        # uploads
UPLOAD_RATE_WINDOW = 3600     # seconds

ALLOWED_EXTENSIONS = {".mp3"}
MAX_TITLE_LEN = 80
MAX_ARTIST_LEN = 60
MAX_ALBUM_LEN = 80
MAX_GENRE_LEN = 32


def _load_or_create_secret() -> str:
    """Return a persistent secret key, generating one on first boot."""
    try:
        if SECRET_KEY_FILE.exists():
            value = SECRET_KEY_FILE.read_text(encoding="utf-8").strip()
            if len(value) >= 32:
                return value
    except OSError:
        pass
    key = secrets.token_hex(32)
    try:
        DB_DIR.mkdir(parents=True, exist_ok=True)
        SECRET_KEY_FILE.write_text(key, encoding="utf-8")
        SECRET_KEY_FILE.chmod(0o600)
    except OSError:
        pass  # fall back to an ephemeral key (sessions reset on restart)
    return key


class Config:
    """Flask configuration object with hardened defaults."""

    SECRET_KEY = os.environ.get("SMTH_SECRET_KEY") or _load_or_create_secret()
    MAX_CONTENT_LENGTH = MAX_CONTENT_LENGTH
    SESSION_COOKIE_NAME = "session"      # Flask's signed session (CSRF etc.)
    AUTH_COOKIE_NAME = "smth_auth"       # our server-side session token
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = os.environ.get("SMTH_SECURE_COOKIES", "").lower() in {
        "1",
        "true",
        "yes",
    }
    PREFERRED_URL_SCHEME = os.environ.get("SMTH_URL_SCHEME", "http")

    # Disable Flask's dev-server warning noise when running locally
    JSON_SORT_KEYS = False


def ensure_dirs() -> None:
    """Create the storage directories the application depends on."""
    DB_DIR.mkdir(parents=True, exist_ok=True)
    MUSIC_ROOT.mkdir(parents=True, exist_ok=True)
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
