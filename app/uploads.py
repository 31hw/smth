"""Upload validation and the on-disk music store.

Layout (exactly as specified)::

    db/music/<musicname>/info.json
    db/music/<musicname>/music.mp3

The folder name is a slugified track title, made unique with a numeric
suffix when necessary.  Raw user input never reaches the filesystem.
"""

from __future__ import annotations

import json
import os
from pathlib import Path

from flask import current_app
from werkzeug.datastructures import FileStorage

from . import config, models
from .audio import probe_mp3, read_id3
from .utils import slugify

MAX_MAGIC_SCAN = 8192


def is_mp3_payload(stream) -> bool:
    """Validate that the file actually looks like an MP3.

    Accepts files that begin with an ID3 tag (looking for the MPEG sync
    word *after* the tag) or with an MPEG audio frame sync word
    (``0xFF Ex`` / ``0xFF Fx``).
    """
    head = stream.read(MAX_MAGIC_SCAN)
    offset = 0
    if head.startswith(b"ID3"):
        if len(head) < 10:
            stream.seek(0)
            return False
        size = 0
        for byte in head[6:10]:
            size = (size << 7) | (byte & 0x7F)
        offset = size + 10
        if offset >= MAX_MAGIC_SCAN - 4:
            stream.seek(offset)
            head = stream.read(MAX_MAGIC_SCAN)
            offset = 0
    for i in range(offset, max(offset, len(head) - 1)):
        if head[i] == 0xFF and (head[i + 1] & 0xE0) == 0xE0:
            stream.seek(0)
            return True
    stream.seek(0)
    return False


def unique_slug(base: str) -> str:
    slug = slugify(base)
    candidate, counter = slug, 1
    while Path(config.MUSIC_ROOT / candidate).exists() or models.get_track_by_slug(candidate):
        counter += 1
        candidate = f"{slug}-{counter}"
    return candidate


def store_upload(
    file: FileStorage,
    *,
    title: str,
    artist: str,
    album: str | None,
    genre: str | None,
    user_id: int,
) -> dict:
    """Persist a validated MP3 into ``db/music/<slug>/`` and register it."""
    slug = unique_slug(title)
    folder = config.MUSIC_ROOT / slug
    folder.mkdir(parents=True, exist_ok=True)

    target = folder / "music.mp3"
    file.save(str(target))

    file_size = target.stat().st_size
    probe = probe_mp3(str(target))
    tags = read_id3(str(target))

    record = {
        "slug": slug,
        "title": title,
        "artist": artist,
        "album": album,
        "genre": genre,
        "duration": probe.get("duration"),
        "file_size": file_size,
        "uploaded_by": user_id,
        "status": "pending",
        "bitrate_estimate_kbps": (probe.get("bitrate") or 0),
        "tag_title": tags.get("TIT2"),
        "created_at": None,
    }
    info_path = folder / "info.json"
    info_path.write_text(
        json.dumps(record, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    track_id = models.create_track(
        slug=slug,
        title=title,
        artist=artist,
        album=album,
        genre=genre,
        duration=probe.get("duration"),
        file_size=file_size,
        uploaded_by=user_id,
    )
    record["id"] = track_id
    return record


def refresh_info_json(slug: str, status: str, reject_reason: str | None = None) -> None:
    """Keep ``info.json`` in sync after a moderation decision."""
    folder = config.MUSIC_ROOT / slug
    info_path = folder / "info.json"
    if not info_path.exists():
        return
    try:
        data = json.loads(info_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return
    data["status"] = status
    if reject_reason is not None:
        data["reject_reason"] = reject_reason
    info_path.write_text(
        json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8"
    )


def remove_track_files(slug: str) -> None:
    folder = config.MUSIC_ROOT / slug
    for name in ("music.mp3", "info.json"):
        try:
            os.remove(str(folder / name))
        except FileNotFoundError:
            pass
    try:
        folder.rmdir()
    except OSError:
        pass


def validate_mp3_upload(file: FileStorage) -> str | None:
    """Return an error message, or ``None`` when the upload is acceptable."""
    if not file or not file.filename:
        return "No file was provided."
    filename = file.filename
    if not filename.lower().endswith(".mp3"):
        return "Only .mp3 files are accepted."
    if hasattr(file, "content_type") and file.content_type:
        ctype = file.content_type.lower()
        if not (ctype.startswith("audio/") or ctype in (
            "application/octet-stream",  # some browsers send this
        )):
            return f"Unsupported content type: {ctype}."
    if not is_mp3_payload(file.stream):
        return "File is not a valid MP3 (bad magic bytes)."
    max_bytes = current_app.config["MAX_CONTENT_LENGTH"]
    file.stream.seek(0, os.SEEK_END)
    size = file.stream.tell()
    file.stream.seek(0)
    if size > max_bytes:
        return f"File exceeds the {max_bytes // (1024 * 1024)} MB limit."
    if size < 1024:
        return "File is suspiciously small to be music."
    return None
