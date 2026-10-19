"""WSGI entry point for production servers:  gunicorn wsgi:app."""

from app.main import create_app

app = create_app()
