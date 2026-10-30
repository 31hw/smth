# 🎲 Rollimons

Roll a **random Roblox item from 2019 or earlier** — and get its title, thumbnail
and a direct link, without ever being handed a limited or something that is no
longer for sale.

Built around [Rolimons](https://www.rolimons.com) + Roblox's public catalog APIs.
Plain HTML/CSS/ES modules — no build step, no framework, no backend.

```
Roll  →  "Red Roblox Cap"  ·  2011  ·  R$ 15  ·  thumbnail  ·  link
```

## Why the filtering exists

A naive "random item" roll keeps landing on limiteds and retired items, because
most old catalog entries are exactly that. Every candidate here is verified
before it is shown:

| Rule                     | Why                                                       |
| ------------------------ | --------------------------------------------------------- |
| `IsLimited = false`      | You asked for no limiteds / limited uniques.              |
| `IsLimitedUnique = false`| Same, Rolimons calls them "limiteds".                     |
| `IsForSale` + price > 0  | Not off sale. Free-but-purchasable still counts.           |
| creation year ≤ cutoff   | Default 2019 ("or earlier"), can switch to "exactly".     |
| visible asset type       | Audio, scripts, models etc. have no real thumbnail.       |

If nothing qualifies, the app **says so** instead of quietly returning a newer
limited. Every attempt is logged in the "Why not that one?" panel with the
reason it lost.

## Quick start

```bash
npm install       # only needed for the tests (jsdom)
npm run dev       # http://localhost:4173
```

No npm? Any static server works, e.g. `python3 -m http.server 4173`.

Open <http://localhost:4173/?demo=1> to preview the whole flow with bundled
sample data — useful when the catalog APIs are unreachable (see *CORS* below).

## How a roll works

1. **Catalog stage** — shuffles Roblox catalog searches (keyword / category /
   sort / price cap, alternating between Roblox-made and community items) and
   verifies the freshest candidates first. Cheap and high-yield.
2. **Rolimons stage** — pulls Rolimons' public item feed in the background and
   tries ids from it. Rolimons has no creation dates, so these still go through
   the same verification. This is what makes an item eligible for the
   *"On Rolimons"* badge and the direct Rolimons link.
3. **Id-space stage** — last resort: random asset ids inside the historical id
   window for the requested year, plus a burst of neighbouring ids.

Concurrency is 4, everything is cached in `localStorage` (Rolimons 12 h, asset
details 6 h, catalog queries 10 min), and there's a 48 s safety deadline.

```
index.html      UI shell
styles.css      all styling (dark, no external assets)
js/core.js      pure logic: normalising, eligibility rules, URLs, Rolimons parser
js/api.js       network layer: Roblox catalog/economy, Rolimons, CORS relays, demo data
js/roll.js      the roll pipeline (stages, concurrency, stats)
js/app.js       DOM wiring, history, clipboard, options
dev-server.mjs  zero-dependency static server
test/           node:test suites (core, pipeline, jsdom UI)
```

## Options

- **Year mode** — `or earlier` (default, 2019) or `exactly`.
- **Rolimons-tracked only** — only accept ids that Rolimons knows. Slower and
  smaller pool, but every result has a real Rolimons page.
- **Made by Roblox** — skip community uploads.

Preferences persist in `localStorage`; rolled items collect in session history
(click one to bring it back). Keyboard: <kbd>R</kbd> rolls again.

## CORS, and why the app has relays

`rolimons.com` and `economy.roblox.com` don't reliably send
`Access-Control-Allow-Origin`, so a browser page can't always call them
directly. `js/api.js` tries the direct request first, then public read-only
CORS relays (`allorigins`, `corsproxy.io`, `codetabs`, `thingproxy`), remembering
whichever relay worked. If your network blocks all of them you'll see a clear
error with a link to demo mode — nothing silently breaks.

For a production deployment, the clean fix is a tiny proxy on your own domain
that forwards the two endpoints. Swapping it in means changing the two constants
at the top of `js/api.js`.

## Tests

```bash
npm test
```

35 tests, no network:

- `test/core.test.mjs` — date parsing, normalisation, every eligibility rule,
  Rolimons payload parsing, URL building.
- `test/roll.test.mjs` — the pipeline with a fake API: limiteds/off-sale/new
  items are rejected, `exactly` mode can fail loudly, Rolimons-only mode,
  total API failure, progress + logs.
- `test/ui.test.mjs` — boots the real `index.html` in jsdom and checks the
  rendered title, thumbnail, links, badges, history and error state, plus a full
  demo-mode roll from the button through to the history list, plus a CSS
  regression check that `[hidden]` really hides the pills/links.

## Notes

- Rolimons has no official public API; this uses the public item feed that the
  site itself consumes. Be gentle with it — hence the aggressive caching.
- Item eligibility is recomputed on every roll; nothing is hard-coded, so the
  result reflects whatever is actually purchasable right now.
- Not affiliated with Roblox or Rolimons.

MIT licensed.
