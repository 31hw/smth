# Changelog

## 1.0.0 — 2026-10-19

First release.

- Spotify-style UI with bottom player bar, queue and seek
- User registration / login with server-side sessions
- First account automatically becomes full admin
- MP3 upload with drag & drop and progress bar
- Moderation queue in `/admin` (approve / reject with reason)
- Predictable storage layout: `db/music/<name>/{info.json,music.mp3}`
- Range-aware audio streaming
- scrypt password hashing, CSRF tokens, rate limiting, CSP,
  audit log, upload magic-byte validation
- `start.bat` / `start.sh` launchers with local + tunnel modes,
  automatic dependency installation and progress bars
- Tools: admin promotion, demo seeder, backup, DB console,
  environment self-test
- pytest suite, Dockerfile, docker-compose, GitHub Actions CI
