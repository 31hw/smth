#!/usr/bin/env python3
"""Seed the library with demo tracks (synthetic silent MP3s).

Usage:  python tools/seed-demo.py [--approve] [--user USERNAME]
"""


from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import argparse
import struct
from pathlib import Path

from app.main import create_app
from app.database import init_db
from app import models
from app.uploads import unique_slug
from app import config
from werkzeug.security import generate_password_hash

DEMO_TRACKS = [
    ("Midnight Drive", "Neon Waves", "Afterglow", "Electronic"),
    ("Coffee & Rain", "LoFi Lounge", "Morning Brew", "Lo-fi"),
    ("Gravity", "Orbit Nine", "Weightless", "Ambient"),
]


def synth_mp3(path: Path, seconds: float = 2.6) -> None:
    """Write a structurally valid, silent MPEG-1 Layer III file."""
    frame = b"\xff\xfb\x90\x00" + bytes(413)
    frames = max(1, int(seconds * 44100 / 1152))
    path.write_bytes(frame * frames)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--approve", action="store_true")
    parser.add_argument("--user", default="demo")
    args = parser.parse_args()

    init_db()
    app = create_app()
    with app.app_context():
        return _main(app, args)


def _main(app, args) -> int:
    user = models.get_user_by_username(args.user)
    if not user:
        user_id = models.create_user(
            username=args.user,
            password_hash=generate_password_hash("demo-password-123", method="scrypt"),
        )
    else:
        user_id = user["id"]

    for title, artist, album, genre in DEMO_TRACKS:
        slug = unique_slug(title)
        folder = config.MUSIC_ROOT / slug
        folder.mkdir(parents=True, exist_ok=True)
        synth_mp3(folder / "music.mp3")
        import json

        (folder / "info.json").write_text(json.dumps({
            "slug": slug, "title": title, "artist": artist,
            "album": album, "genre": genre,
            "duration": 2.6, "status": "approved" if args.approve else "pending",
            "uploaded_by": user_id,
        }, indent=2))
        track_id = models.create_track(
            slug=slug, title=title, artist=artist, album=album,
            genre=genre, duration=2.6,
            file_size=(folder / "music.mp3").stat().st_size,
            uploaded_by=user_id,
        )
        if args.approve:
            models.update_track(track_id, status="approved")
        print(f"  + {title} by {artist} [{slug}]")
    print("Done.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
