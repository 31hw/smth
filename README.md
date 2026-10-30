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

Offline preview: `http://localhost:4173/?demo=1` runs the whole pipeline against
bundled sample data (useful when rolimons.com / roblox.com aren't reachable).

## How a roll works

1. **Catalog** — walks Roblox catalog searches category by category
   (2 = gear, 4 = faces, 5 and 11 = accessories) with shuffled keywords, sorts
   and price caps, always scoped to the Roblox account.
2. **Rolimons** — its public item feed is loaded in the background as a second
   pool, and it decides whether the picture links to Rolimons.
3. **Id sampling** — last resort: random asset ids from the historical id
   windows for 2008–2019.

Candidates are pre-filtered with the data the search already gives us, then the
survivors are confirmed one by one via
`economy.roblox.com/v2/assets/{id}/details` (real creation date, real price,
real limited flags, real creator). If nothing qualifies, the page says
"No item matched that time" — it never falls back to a newer or limited item.

If *nothing at all* answers (blocked network / CORS on every host), the page
says so and switches to the bundled sample data so you still see the flow.

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
remembering the one that worked. If your network blocks all of them the page
shows a short message and you can use `?demo=1`. For a real deployment, point
the two constants at the top of `js/api.js` at your own small proxy.

## Tests

```bash
npm test        # 37 tests, no network
```

- `test/core.test.mjs` — year window edges, the asset-type allowlist, Roblox-only
  creator check, limited/off-sale rejection, thumbnail + link building, Rolimons
  payload parsing.
- `test/roll.test.mjs` — the pipeline against a fake API: one decoy per rule
  (limited, off sale, 2007, 2021, shirt, community upload), category walk,
  Rolimons-sourced hits, honest failure, total API failure.
- `test/ui.test.mjs` — boots the real `index.html` in jsdom: the page contains
  only the button and the empty fields, a roll fills name / picture / year /
  Rolimons address, both links open in a new tab, the picture never stays
  hidden (regression test), re-rolling, the sample-data fallback, demo mode end
  to end, and a check that the CSS has no gradients, shadows or rgba neon.

Not affiliated with Roblox or Rolimons. MIT licensed.
