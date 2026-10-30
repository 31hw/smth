# Rollimons

Click **Roll** and get one random Roblox item: its **name**, its **picture**, its
**(year)**, and its Rolimons address (`www.rolimons.com/item/<id>`) underneath.
Nothing else on the page. The picture and the address both open in a new tab.

Behind that, every roll is filtered to:

| Rule                | Value                                              |
| ------------------- | -------------------------------------------------- |
| Item kind           | gear, face or accessory only                       |
| Made by             | Roblox only (no community uploads)                 |
| Created             | between **2008 and 2019**                          |
| Trading             | never limited / limited unique                     |
| Availability        | must still be for sale (not off sale)              |

The picture links to the item: the Rolimons page when Rolimons tracks it,
otherwise the Roblox catalog page (so the picture never dead-ends). The text
link under the year always points at the Rolimons item page.

## Run it

```bash
npm install       # only for the tests (jsdom)
npm run dev       # http://localhost:4173
```

No npm needed to just look at it — any static server works, e.g.
`python3 -m http.server 4173`.

There's an opt-in dev switch, `http://localhost:4173/?demo=1`, which runs the
same pipeline against bundled sample data. It is never used automatically — the
live page only ever shows real items or "Unavailable".

## How a roll works

Gentle by design: **one item at a time**, one request after another — no
batches, no parallel bursts.

1. **Pick** — a small catalog page (10 results, category cycling gear → faces →
   accessories, random keyword/sort/price cap), one random item taken from it.
2. **Check** — that single item, and only that one, is confirmed via
   `economy.roblox.com/v2/assets/{id}/details` (real creation date, real price,
   real limited flags, real creator).
3. **Repeat** — up to 14 single-item attempts, falling back to one Rolimons id
   at a time and then to random asset ids from the 2008–2019 id windows.

The Rolimons item list is a single request per roll (cached for 12 h); it is
also what decides whether the picture links to Rolimons.

Two honest failure states, no stand-ins:

- **"Unavailable"** — nothing answered at all (blocked network / CORS). Hosts
  that just refused every relay are skipped, so this takes about five seconds
  instead of a minute.
- **"No item matched. Try again."** — the APIs answered, but nothing passed the
  rules.

Either way the page never shows an invented or downgraded item.

```
index.html      the whole page: heading, roll button, name / picture / year
styles.css      plain classic styling (borders, no gradients or shadows)
js/core.js      the rules: year window, asset types, Roblox-only, limited/off-sale
js/api.js       Roblox catalog + economy APIs, Rolimons feed, CORS relays, demo data
js/roll.js      the roll pipeline (categories, verification, id sampling)
js/app.js       button wiring and rendering the three fields
dev-server.mjs  zero-dependency static server
test/           node:test suites (rules, pipeline, jsdom UI)
```

Keyboard: <kbd>R</kbd> rolls again.

## About CORS

`rolimons.com` and `economy.roblox.com` don't reliably send
`Access-Control-Allow-Origin`, so the page tries the direct request first and
then public read-only relays (allorigins, corsproxy.io, codetabs, thingproxy),
remembering the one that worked. Each request has a 5 s budget across all
relays, and a host that just refused everything is skipped for a minute — so a
blocked network shows **Unavailable** in about five seconds, not a minute. For a
real deployment, point the two constants at the top of `js/api.js` at your own
small proxy.

## Tests

```bash
npm test        # 38 tests, no network
```

- `test/core.test.mjs` — year window edges, the asset-type allowlist, Roblox-only
  creator check, limited/off-sale rejection, thumbnail + link building, Rolimons
  payload parsing.
- `test/roll.test.mjs` — the pipeline against a fake API: one decoy per rule
  (limited, off sale, 2007, 2021, shirt, community upload), category walk,
  Rolimons-sourced hits, the two distinct failure states, and a check that no
  two API calls ever overlap (one candidate at a time).
- `test/ui.test.mjs` — boots the real `index.html` in jsdom: the page contains
  only the button and the empty fields, a roll fills name / picture / year /
  Rolimons address, both links open in a new tab, the picture never stays
  hidden (regression test), re-rolling, the sample-data fallback, demo mode end
  to end, and a check that the CSS has no gradients, shadows or rgba neon.

Not affiliated with Roblox or Rolimons. MIT licensed.
