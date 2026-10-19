"""SMTH Music — a local-first music platform.

The package exposes a single entry point, :func:`create_app`, which builds a
fully configured Flask application.  All state (database + music files) lives
inside the workspace under ``db/`` so the platform can run entirely offline.
"""

from .main import create_app

__all__ = ["create_app"]
__version__ = "1.0.0"
