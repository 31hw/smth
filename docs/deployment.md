# Deployment

## Local (default)

```bash
python run.py            # http://localhost:5000
```

or use the launcher:

- **Windows**: double-click `start.bat`
- **Linux/macOS**: `./start.sh`

## Behind a tunnel (cloudflared)

The launcher's option **[2]** automates this:

1. Downloads `cloudflared` if missing (progress bar included).
2. Runs `cloudflared tunnel login` if you are not authenticated.
3. Creates a named tunnel `smth-music` on first use.
4. Starts the app and the tunnel, printing your public URL.

To attach a custom domain, add DNS in the Cloudflare dashboard:

```bash
cloudflared tunnel route dns smth-music music.yourdomain.tld
```

Set `SMTH_SECURE_COOKIES=1` when serving over HTTPS.

## Docker

```bash
docker compose up -d
```

The `db/` volume keeps your database and music library.

## Configuration

| Variable               | Default     | Meaning                       |
| ---------------------- | ----------- | ----------------------------- |
| `SMTH_HOST`            | `127.0.0.1` | bind address                  |
| `SMTH_PORT`            | `5000`      | port                          |
| `SMTH_MAX_UPLOAD_MB`   | `50`        | upload size cap               |
| `SMTH_REGISTRATION_OPEN` | `1`       | allow new sign-ups            |
| `SMTH_SECURE_COOKIES`  | `0`         | set `Secure` on session cookie|
| `SMTH_SECRET_KEY`      | generated   | session signing key           |

## Backups

```bash
python tools/backup.py     # -> db/backups/<timestamp>/
```

Backs up the database dump and the entire `db/music/` tree.
