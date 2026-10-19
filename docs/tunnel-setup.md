# Tunneling to your domain

The launcher handles everything, but here is what happens under
the hood — useful if you want to script it yourself.

## Quick tunnel (no login)

```bash
cloudflared tunnel --url http://localhost:5000
```

Prints a throwaway `*.trycloudflare.com` URL. Fine for sharing
with friends for an evening.

## Named tunnel (persistent)

```bash
cloudflared tunnel login          # opens browser, picks a zone
cloudflared tunnel create smth-music
cloudflared tunnel run smth-music --url http://localhost:5000
```

## Custom domain

In the Cloudflare dashboard (or via CLI):

```bash
cloudflared tunnel route dns smth-music music.example.com
```

Then set `SMTH_SECURE_COOKIES=1` so the session cookie is only
sent over HTTPS.

## Auto-configuration in start.bat

1. `where cloudflared` — if missing, the launcher downloads the
   binary into `tools\bin\` with a progress bar.
2. `cloudflared tunnel list` — if it fails (not logged in), the
   launcher runs `cloudflared tunnel login` which opens your
   browser for authentication.
3. If no `smth-music` tunnel exists yet, one is created.
4. The app and the tunnel start together.
