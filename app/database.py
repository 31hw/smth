"""SQLite access layer.

A fresh connection is opened per request via Flask's application context and
closed again on teardown.  Every query in this project goes through
``app/models.py`` which uses bound parameters exclusively — there is not a
single string-formatted SQL statement in the codebase.
"""

from __future__ import annotations

import sqlite3
from pathlib import Path

from flask import g

from . import config

SCHEMA_PATH = Path(__file__).resolve().parent / "schema.sql"


def get_db() -> sqlite3.Connection:
    """Return the connection bound to the current request context."""
    if "db" not in g:
        g.db = sqlite3.connect(str(config.DB_PATH), timeout=15.0)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
        g.db.execute("PRAGMA busy_timeout = 5000")
    return g.db


def close_db(exc: Exception | None = None) -> None:
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db() -> None:
    """Create the database file and apply the schema (idempotent)."""
    config.ensure_dirs()
    schema = SCHEMA_PATH.read_text(encoding="utf-8")
    conn = sqlite3.connect(str(config.DB_PATH))
    try:
        conn.executescript(schema)
        conn.commit()
    finally:
        conn.close()


def get_settings() -> dict[str, str]:
    conn = sqlite3.connect(str(config.DB_PATH))
    try:
        rows = conn.execute("SELECT key, value FROM settings").fetchall()
        return {row[0]: row[1] for row in rows}
    finally:
        conn.close()
