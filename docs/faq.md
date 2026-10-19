# FAQ

**Where is my music stored?**
`db/music/<track-name>/` — each folder holds `info.json` (metadata)
and `music.mp3` (the audio).

**Who can see my uploads?**
Nobody until an admin approves them. Pending tracks are only
visible to you (the uploader) and admins.

**How does the first admin work?**
The first account ever created on the instance is granted full
admin rights automatically. Admins can promote others later.

**Can I reset my password?**
Not yet — it's a local single-user-first app. Use
`tools/db-console.py` to delete the `users` row and start over
(your tracks stay but lose their owner link).

**Is my data safe?**
The database is a single SQLite file (`db/app.db`). Back it up
with `python tools/backup.py`.

**Why does playback start slowly on large files?**
Streaming is Range-aware, so seeking works, but everything runs
over your local loopback. Keep files under ~50 MB.

**How do I run this on my server?**
See [deployment.md](deployment.md) — Docker, tunnel or plain
`python run.py`.
