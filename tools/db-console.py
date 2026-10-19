#!/usr/bin/env python3
"""Drop into an interactive SQLite console against the local database."""


from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import sqlite3
import sys

from app import config
from app.database import init_db
from app.main import create_app


def main() -> int:
    init_db()
    with create_app().app_context():
        pass
    print(f"Connected to {config.DB_PATH}")
    print("Type .help for commands, .quit to exit.\n")
    conn = sqlite3.connect(str(config.DB_PATH))
    try:
        while True:
            try:
                sql = input("smth> ").strip()
            except (EOFError, KeyboardInterrupt):
                print("\nBye.")
                break
            if not sql:
                continue
            try:
                cursor = conn.execute(sql)
                if cursor.description:
                    print(" | ".join(d[0] for d in cursor.description))
                    for row in cursor.fetchmany(50):
                        print(" | ".join(str(v) for v in row))
                else:
                    conn.commit()
                    print(f"OK ({cursor.rowcount} row(s) affected)")
            except sqlite3.Error as exc:
                print(f"SQL error: {exc}")
    finally:
        conn.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
