#!/usr/bin/env python3
"""Environment self-test for SMTH Music.

Verifies Python, Flask, the database layout and the music storage
directory, and prints a friendly report.
"""


from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def check(name: str, ok: bool, detail: str = "") -> bool:
    mark = "OK " if ok else "FAIL"
    print(f"  [{mark}] {name}" + (f"  ({detail})" if detail else ""))
    return ok


def main() -> int:
    print("SMTH Music — environment check\n" + "-" * 40)
    ok = True

    ok &= check("Python >= 3.10", sys.version_info >= (3, 10), sys.version.split()[0])
    ok &= check("pip available", shutil.which("pip") is not None)

    try:
        from importlib.metadata import version

        ok &= check("Flask installed", True, version("flask"))
    except ImportError:
        ok &= check("Flask installed", False, "pip install -r requirements.txt")

    ok &= check("Database directory", (ROOT / "db").is_dir())
    ok &= check("Music storage", (ROOT / "db" / "music").is_dir())
    ok &= check("Schema file", (ROOT / "app" / "schema.sql").is_file())

    try:
        result = subprocess.run(
            [sys.executable, "-c", "from app.main import create_app; create_app()"],
            cwd=ROOT, capture_output=True, text=True, timeout=30,
        )
        ok &= check("Application boots", result.returncode == 0,
                    result.stderr.strip().splitlines()[-1] if result.returncode else "ready")
    except Exception as exc:  # pragma: no cover
        ok &= check("Application boots", False, str(exc))

    print("-" * 40)
    print("  All good!" if ok else "  Something needs attention.")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
