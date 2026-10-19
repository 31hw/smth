# Quob

Quob is a static Cloudflare Pages site connected to a separate API Worker. The Pages project serves the files in `dist/`; the Worker exposes ordinary JSON endpoints on `api.quob.net`:

- `GET /api/state`
- `GET /api/updates?since=<version>` (long-poll)
- `GET /api/archive` (called only when the archive is opened)
- `POST /api/click` with `{ "id": "...", "amount": 1 }`

The main count resets at January 1 UTC. Scroll down for synced clicks today, last year's clicks, a live reset countdown, and the Discord link.

## Cloudflare Dashboard setup

1. Create a Pages project connected to this GitHub repository. Set the build command to `npm run build:pages`, the output directory to `dist`, and attach `quob.net` as the Pages custom domain.
2. In **D1**, create a database for Quob.
3. Create a separate Worker for the API and paste the contents of `worker.js` into its editor. Bind the D1 database as `DB` and add a Rate Limiting binding named `rl`, set to 120 requests per 60 seconds. Add `api.quob.net` as the Worker custom domain.
4. The Worker creates its tables on first request. No SQL migration is needed. The database and rate-limit binding names must match exactly: `DB` and `rl`.

The site calls the API on `api.quob.net`; CORS permits `quob.net` and Cloudflare Pages preview domains. The click queue retries rate-limited requests, while the worker keeps click IDs idempotent. Read/poll and click requests use separate per-IP rate-limit buckets, so sync traffic cannot consume the click allowance. Calendar stats use UTC. The archive makes one API request only when opened; the goal bar and theme/share controls use the already-synced browser state. Long-poll database checks are spaced eight seconds apart. `wrangler.toml` is retained for the local preview helper; dashboard deployment does not require running Wrangler yourself.

## Local preview

Run `npm run preview` to build the static Pages output and start a local Pages-style server with the API Worker proxied behind `/api/*`. The preview uses a local D1 database and skips the production rate limit.
