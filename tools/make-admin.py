#!/usr/bin/env python3
"""Promote an existing user to administrator.

Usage:  python tools/make-admin.py <username>
"""


from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import sys

from app.main import create_app
from app.database import init_db
from app import models


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: python tools/make-admin.py <username>")
        return 2
    init_db()
    with create_app().app_context():
        return _main(sys.argv[1])


def _main(username: str) -> int:
    user = models.get_user_by_username(username)
    if not user:
        print(f"No user named '{sys.argv[1]}'.")
        return 1
    models.set_admin(user["id"], True)
    models.log_audit(None, "user.admin-toggle",
                     f"CLI promoted '{user['username']}'")
    print(f"User '{user['username']}' is now an administrator.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
