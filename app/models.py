"""Data-access layer.

Every statement uses bound parameters — user input never touches SQL text.
"""

from __future__ import annotations

import sqlite3
from typing import Any

from .database import get_db
from .utils import hash_token, now_iso

# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------


def create_user(username: str, password_hash: str, is_admin: bool = False) -> int:
    db = get_db()
    cursor = db.execute(
        "INSERT INTO users (username, password_hash, is_admin) VALUES (?, ?, ?)",
        (username, password_hash, 1 if is_admin else 0),
    )
    db.commit()
    return cursor.lastrowid


def get_user_by_id(user_id: int) -> sqlite3.Row | None:
    return get_db().execute(
        "SELECT * FROM users WHERE id = ?", (user_id,)
    ).fetchone()


def get_user_by_username(username: str) -> sqlite3.Row | None:
    return get_db().execute(
        "SELECT * FROM users WHERE username = ?", (username,)
    ).fetchone()


def count_users() -> int:
    return get_db().execute("SELECT COUNT(*) FROM users").fetchone()[0]


def list_users(limit: int = 100) -> list[sqlite3.Row]:
    return get_db().execute(
        "SELECT id, username, is_admin, created_at, last_login_at "
        "FROM users ORDER BY id LIMIT ?",
        (limit,),
    ).fetchall()


def set_admin(user_id: int, is_admin: bool) -> None:
    db = get_db()
    db.execute("UPDATE users SET is_admin = ? WHERE id = ?", (1 if is_admin else 0, user_id))
    db.commit()


def update_last_login(user_id: int) -> None:
    db = get_db()
    db.execute("UPDATE users SET last_login_at = ? WHERE id = ?", (now_iso(), user_id))
    db.commit()


def update_user_password(user_id: int, password_hash: str) -> None:
    db = get_db()
    db.execute(
        "UPDATE users SET password_hash = ? WHERE id = ?",
        (password_hash, user_id),
    )
    db.commit()


def count_admins() -> int:
    return get_db().execute(
        "SELECT COUNT(*) FROM users WHERE is_admin = 1"
    ).fetchone()[0]


def delete_user(user_id: int) -> None:
    db = get_db()
    db.execute("DELETE FROM sessions WHERE user_id = ?", (user_id,))
    db.execute("DELETE FROM users WHERE id = ?", (user_id,))
    db.commit()


# ---------------------------------------------------------------------------
# Sessions
# ---------------------------------------------------------------------------


def create_session(user_id: int, token_hash: str, ip: str | None, user_agent: str | None, expires_at: str) -> None:
    db = get_db()
    db.execute(
        "INSERT INTO sessions (token_hash, user_id, ip, user_agent, expires_at) "
        "VALUES (?, ?, ?, ?, ?)",
        (token_hash, user_id, ip, user_agent, expires_at),
    )
    db.commit()


def get_session(token: str | None) -> sqlite3.Row | None:
    if not token:
        return None
    return get_db().execute(
        "SELECT s.*, u.id AS user_id, u.username, u.is_admin "
        "FROM sessions s JOIN users u ON u.id = s.user_id "
        "WHERE s.token_hash = ? AND s.expires_at > ?",
        (hash_token(token), now_iso()),
    ).fetchone()


def delete_session(token: str | None) -> None:
    if not token:
        return
    db = get_db()
    db.execute("DELETE FROM sessions WHERE token_hash = ?", (hash_token(token),))
    db.commit()


def delete_session_hash(token_hash: str) -> None:
    db = get_db()
    db.execute("DELETE FROM sessions WHERE token_hash = ?", (token_hash,))
    db.commit()


def delete_sessions_for_user(user_id: int, keep_hash: str | None = None) -> None:
    db = get_db()
    if keep_hash:
        db.execute(
            "DELETE FROM sessions WHERE user_id = ? AND token_hash != ?",
            (user_id, keep_hash),
        )
    else:
        db.execute("DELETE FROM sessions WHERE user_id = ?", (user_id,))
    db.commit()


def list_sessions(user_id: int) -> list[sqlite3.Row]:
    return get_db().execute(
        "SELECT token_hash, created_at, ip, user_agent "
        "FROM sessions WHERE user_id = ? ORDER BY created_at DESC",
        (user_id,),
    ).fetchall()


def purge_expired_sessions() -> None:
    db = get_db()
    db.execute("DELETE FROM sessions WHERE expires_at <= ?", (now_iso(),))
    db.commit()


# ---------------------------------------------------------------------------
# Tracks
# ---------------------------------------------------------------------------


def create_track(
    *,
    slug: str,
    title: str,
    artist: str,
    album: str | None,
    genre: str | None,
    duration: float | None,
    file_size: int,
    uploaded_by: int,
) -> int:
    db = get_db()
    cursor = db.execute(
        "INSERT INTO tracks (slug, title, artist, album, genre, duration, "
        "file_size, uploaded_by, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')",
        (slug, title, artist, album, genre, duration, file_size, uploaded_by),
    )
    db.commit()
    return cursor.lastrowid


def get_track_by_slug(slug: str) -> sqlite3.Row | None:
    return get_db().execute("SELECT * FROM tracks WHERE slug = ?", (slug,)).fetchone()


def list_tracks(
    status: str | None = None,
    limit: int = 200,
    offset: int = 0,
    order: str = "created_at DESC",
) -> list[sqlite3.Row]:
    allowed_orders = {
        "created_at DESC": "t.created_at DESC",
        "title ASC": "t.title COLLATE NOCASE ASC",
        "duration DESC": "t.duration DESC",
    }
    order_sql = allowed_orders.get(order, "t.created_at DESC")
    sql = (
        "SELECT t.*, u.username AS uploader_name "
        "FROM tracks t JOIN users u ON u.id = t.uploaded_by "
    )
    params: list[Any] = []
    if status:
        sql += "WHERE t.status = ? "
        params.append(status)
    sql += f"ORDER BY {order_sql} LIMIT ? OFFSET ?"
    params.extend([limit, offset])
    return get_db().execute(sql, params).fetchall()


def list_tracks_by_user(user_id: int, limit: int = 100) -> list[sqlite3.Row]:
    return get_db().execute(
        "SELECT * FROM tracks WHERE uploaded_by = ? ORDER BY created_at DESC LIMIT ?",
        (user_id, limit),
    ).fetchall()


# Column names are restricted to this allow-list so that no caller
# (even with malformed input) can alter SQL structure.
_TRACK_FIELDS = frozenset(
    {"status", "reject_reason", "reviewed_at", "reviewed_by"}
)


def update_track(track_id: int, **fields: Any) -> None:
    if not fields:
        return
    bad = set(fields) - _TRACK_FIELDS
    if bad:
        raise ValueError(f"Refusing to update non-allow-listed fields: {bad}")
    columns = ", ".join(f"{name} = ?" for name in fields)
    values = list(fields.values())
    values.append(track_id)
    db = get_db()
    db.execute(f"UPDATE tracks SET {columns} WHERE id = ?", values)
    db.commit()


def delete_track(slug: str) -> None:
    db = get_db()
    db.execute("DELETE FROM tracks WHERE slug = ?", (slug,))
    db.commit()


def count_tracks(status: str | None = None) -> int:
    if status:
        return get_db().execute(
            "SELECT COUNT(*) FROM tracks WHERE status = ?", (status,)
        ).fetchone()[0]
    return get_db().execute("SELECT COUNT(*) FROM tracks").fetchone()[0]


# ---------------------------------------------------------------------------
# Settings & audit log
# ---------------------------------------------------------------------------


def get_setting(key: str, default: str = "") -> str:
    row = get_db().execute(
        "SELECT value FROM settings WHERE key = ?", (key,)
    ).fetchone()
    return row[0] if row else default


def set_setting(key: str, value: str) -> None:
    db = get_db()
    db.execute(
        "INSERT INTO settings (key, value) VALUES (?, ?) "
        "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        (key, value),
    )
    db.commit()


def log_audit(actor_id: int | None, action: str, detail: str = "", ip: str | None = None) -> None:
    get_db().execute(
        "INSERT INTO audit_log (actor_id, action, detail, ip) VALUES (?, ?, ?, ?)",
        (actor_id, action, detail, ip),
    )
    get_db().commit()


def list_audit(limit: int = 50) -> list[sqlite3.Row]:
    return get_db().execute(
        "SELECT a.*, u.username AS actor_name FROM audit_log a "
        "LEFT JOIN users u ON u.id = a.actor_id "
        "ORDER BY a.created_at DESC LIMIT ?",
        (limit,),
    ).fetchall()
