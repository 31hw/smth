# Quob

Quob is a minimal shared click counter with white numerals on a `#1f1f1f` background. The top number shows clicks for the current UTC calendar year and resets on January 1 UTC. Scroll down for synced totals for today (also UTC), the previous calendar year, a live countdown to the next January 1 reset, and a link to the Quob Discord. Counts use standard thousands separators (for example, `999`, then `1,000`). Clicking anywhere adds a click; the browser batches bursts, retries queued clicks when rate-limited, and syncs with a long-poll connection. The Worker uses D1 for the global count and the `rl` binding to cap API requests at 120 per minute per client IP. The site is served on `quob.net`, with its API on `api.quob.net`.

## Preview

The sandbox preview is running. It uses a local D1 database and bypasses the production rate-limit binding so you can test clicks and sync.

## Publish from the Cloudflare dashboard

1. In **Cloudflare Dashboard → Storage & databases → D1**, create a database named `global-clicker` and copy its database ID.
2. Replace `REPLACE_WITH_D1_DATABASE_ID` in `wrangler.toml` with that ID. The ID is configuration, not a secret.
3. In **Workers & Pages → Workers Builds**, connect the GitHub repository and select the branch you want to publish. The dashboard build reads `wrangler.toml` to bundle the site's files and configure the `DB` and `rl` bindings; you do not need to run Wrangler locally.
4. Confirm that `quob.net` and `api.quob.net` are available as custom domains in your Cloudflare account. The Worker configuration routes both hostnames to the same Worker.

The rate limit is 120 requests per 60 seconds per client IP. The browser queues and batches clicks, and automatically retries when the API returns a rate-limit response. The Worker initializes its tables automatically using parameterized SQL; it never executes SQL from visitors. Click request IDs make retries idempotent, with old IDs pruned after seven days. `/api/updates` holds a request for up to 24 seconds and checks D1 periodically for a newer count.
