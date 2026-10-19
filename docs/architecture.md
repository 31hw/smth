# Architecture

SMTH Music is a deliberately simple, local-first web application:

```
┌──────────────────────────────────────────────────────────┐
│  Browser (Spotify-style SPA-ish UI)                      │
│  templates/*.html + static/{css,js}                      │
└───────────────────────┬──────────────────────────────────┘
                        │ HTTP (JSON API + forms)
┌───────────────────────▼──────────────────────────────────┐
│  Flask app factory (app/main.py)                         │
│  ├── middleware.py   auth + rate limiting + headers      │
│  ├── auth.py         register / login / logout           │
│  ├── music.py        home, streaming, uploads, account   │
│  ├── admin.py        moderation queue, users, settings   │
│  ├── api.py          public JSON endpoints               │
│  ├── security.py     CSRF, rate limiter, CSP             │
│  ├── uploads.py      validation + storage engine         │
│  ├── audio.py        pure-python MP3 frame probing       │
│  └── models.py       data access (parameterized SQL)     │
└───────────────────────┬──────────────────────────────────┘
                        │ sqlite3 (WAL mode)
┌───────────────────────▼──────────────────────────────────┐
│  db/                                                     │
│  ├── app.db                  users, sessions, tracks,    │
│  │                           audit_log, settings         │
│  ├── .secret_key             generated on first boot     │
│  └── music/<slug>/           info.json + music.mp3       │
└──────────────────────────────────────────────────────────┘
```

## Request lifecycle

1. `middleware.load_user` resolves the `smth_sid` cookie against the
   `sessions` table (SHA-256 hashes only) and populates `g.user`.
2. The global rate limiter (900 req/min per IP) gates every request.
3. The blueprint handler runs; all writes go through `models.py`
   with bound parameters.
4. `middleware.set_security_headers` adds CSP, nosniff, frame
   denial and referrer policies to the response.

## Upload lifecycle

```
POST /api/upload ──► validate (CSRF, rate, size, extension,
                     magic bytes) ──► slugify title ──►
                     unique folder db/music/<slug>/ ──►
                     write music.mp3 + info.json ──►
                     INSERT track (status='pending') ──►
                     audit log

Admin approves ───► UPDATE status='approved' ──► info.json
                  refreshed ──► visible on home page
```

## Why SQLite

- Zero configuration, zero network surface.
- ACID transactions with WAL mode for concurrent readers.
- The whole database is one file — easy to back up
  (`tools/backup.py`) or move.
