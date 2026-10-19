#!/usr/bin/env python3
"""Back up the database and the music library into db/backups/."""


from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import shutil
import sqlite3
from datetime import datetime
from pathlib import Path

from app import config
from app.main import create_app


def main() -> int:
    with create_app().app_context():
        pass
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    out = config.BASE_DIR / "db" / "backups" / stamp
    out.mkdir(parents=True, exist_ok=True)

    if config.DB_PATH.exists():
        conn = sqlite3.connect(str(config.DB_PATH))
        try:
            with open(out / "app.db", "wb") as handle:
                for chunk in conn.iterdump():
                    handle.write((chunk + "\n").encode())
        finally:
            conn.close()
        print(f"  database -> {out / 'app.db'}")

    if config.MUSIC_ROOT.exists():
        shutil.copytree(config.MUSIC_ROOT, out / "music",
                        dirs_exist_ok=True)
        print(f"  music    -> {out / 'music'}")

    print("Backup complete.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
