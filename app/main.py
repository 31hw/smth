"""Application factory for SMTH Music."""

from __future__ import annotations

from flask import Flask, render_template
from werkzeug.exceptions import HTTPException, RequestEntityTooLarge

from . import middleware
from .admin import bp as admin_bp
from .api import bp as api_bp
from .auth import bp as auth_bp
from .database import close_db, init_db
from .music import bp as music_bp
from .security import csrf_token


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object("app.config.Config")

    # Database
    init_db()
    app.teardown_appcontext(close_db)

    # Request lifecycle
    middleware.register(app)

    # Blueprints
    app.register_blueprint(music_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(api_bp)

    # Template globals
    app.jinja_env.globals.update(csrf_token=csrf_token)

    @app.context_processor
    def inject_user():
        from flask import g

        return {"current_user": g.get("user")}

    # Error pages
    @app.errorhandler(HTTPException)
    def handle_http_error(exc: HTTPException):
        return (
            render_template(
                "errors/error.html", code=exc.code, message=exc.description
            ),
            exc.code,
        )

    @app.errorhandler(RequestEntityTooLarge)
    def handle_too_large(exc):
        return (
            render_template(
                "errors/error.html", code=413,
                message="The file is too large. Check the upload limit "
                        "and try again.",
            ),
            413,
        )

    @app.errorhandler(Exception)
    def handle_unexpected(exc: Exception):
        app.logger.exception("Unhandled exception")
        return (
            render_template(
                "errors/error.html", code=500,
                message="Something went wrong on our side.",
            ),
            500,
        )

    return app
