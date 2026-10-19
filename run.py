"""Run SMTH Music directly:  ``python run.py``."""

from __future__ import annotations

import os

from app.main import create_app

HOST = os.environ.get("SMTH_HOST", "127.0.0.1")
PORT = int(os.environ.get("SMTH_PORT", "5000"))
DEBUG = os.environ.get("SMTH_DEBUG", "").lower() in {"1", "true", "yes"}

if __name__ == "__main__":
    application = create_app()
    print(f"SMTH Music starting on http://{HOST}:{PORT}")
    application.run(host=HOST, port=PORT, debug=DEBUG, use_reloader=False)
