# SMTH Music 🎧

A **local-first music platform** with a Spotify-style interface, user uploads, and a
moderation queue. Everything runs on your machine — no external services, no cloud
database, no tracking. The first account ever created is automatically granted
**full administrator** powers.

![Python](https://img.shields.io/badge/python-3.10%2B-blue)
![Flask](https://img.shields.io/badge/flask-3.x-green)
![SQLite](https://img.shields.io/badge/database-SQLite-local-orange)
![Security](https://img.shields.io/badge/security-hardened-brightgreen)

---

## ✨ Features

- 🎵 **Spotify-style UI** — dark theme, track grid, inline player with seek/volume,
  search, genre filters, bottom player bar with queue.
- 📤 **User uploads** — upload MP3s from your account page ("Music" side-tab) with
  drag & drop and a real progress bar.
- 🛡️ **Queue moderation** — every upload lands in `pending` state. Only an admin can
  approve or reject it from `/admin`. Nothing goes public until approved.
- 👑 **First account = full admin** — the very first registered user becomes the
  owner/admin automatically.
- 🗄️ **Local SQLite database** — zero external dependencies, all data lives in
  `db/` inside the workspace.
- 📁 **Predictable storage layout**:
  ```
  db/music/<musicname>/info.json   # metadata
  db/music/<musicname>/music.mp3   # the actual audio
  ```
- 🌐 **Optional tunneling** — `start.bat` can expose the site publicly via
  `cloudflared` (auto-install + auto-login if missing).
- 🔒 **Hardened by default** — scrypt password hashing, CSRF tokens, parameterized
  SQL, upload magic-byte validation, rate limiting, security headers, audit log.

## 🚀 Quick start

### Windows
Double-click **`start.bat`** and pick:

```
[1] Local    -> http://localhost:5000
[2] Tunnel   -> public URL via cloudflared (auto-configures login if needed)
```

### Linux / macOS
```bash
chmod +x start.sh
./start.sh
```

### Manual
```bash
python -m pip install -r requirements.txt
python run.py
```

Then open <http://localhost:5000>, create the first account (it becomes admin),
and start uploading music from **Account → Music**.

## 📂 Project layout

```
smth/
├── start.bat                # Windows launcher (local / tunnel menu)
├── start.sh                 # POSIX launcher (local / tunnel menu)
├── run.py                   # Entry point for the Flask application
├── app/                     # Application package
│   ├── main.py              # App factory, error handlers, context processors
│   ├── config.py            # Settings & paths
│   ├── database.py          # SQLite connection layer
│   ├── schema.sql           # Database schema (users, tracks, sessions, audit)
│   ├── auth.py              # Register / login / logout / sessions
│   ├── music.py             # Browsing, streaming, uploads
│   ├── admin.py             # Moderation queue & user management
│   ├── api.py               # JSON API endpoints
│   ├── security.py          # Rate limiting, CSRF, session helpers
│   ├── uploads.py           # Upload validation & storage engine
│   ├── audio.py             # Pure-python MP3 frame probing (duration, ID3)
│   ├── models.py            # Data-access layer (parameterized queries)
│   ├── utils.py             # Slugify, formatting, sanitizing
│   ├── templates/           # Jinja2 views
│   └── static/              # CSS / JS / images
├── db/                      # Local database + uploaded music (git-ignored)
│   ├── app.db
│   └── music/<name>/info.json + music.mp3
├── tools/                   # CLI helpers (admin promotion, backups, seeds)
├── tests/                   # pytest suite
└── docs/                    # Architecture, security, deployment docs
```

## 🔐 Security model

See [docs/security.md](docs/security.md) for the full threat model. In short:

| Threat                | Mitigation                                                        |
| --------------------- | ----------------------------------------------------------------- |
| SQL injection         | 100% parameterized queries (sqlite3 placeholders)                 |
| Credential stuffing   | scrypt password hashing + per-IP login rate limiting              |
| CSRF                  | Double-submit tokens on every state-changing request              |
| Malware upload        | Extension + MIME + magic-byte validation, `.mp3` only, size caps  |
| Path traversal        | Slug generation strips separators; storage paths are server-built |
| XSS                   | Jinja auto-escaping + strict CSP                                  |
| Session hijacking     | Random 256-bit tokens, DB-stored hashes, HttpOnly cookies         |

## 🛠️ Development

```bash
pip install -r requirements-dev.txt
make test        # run the pytest suite
make seed        # create demo tracks so the UI is populated
make run         # start the dev server
```

## 📄 License

MIT — see [LICENSE](LICENSE).
