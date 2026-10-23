# Classic Roblox UI (2016 / 2019) — Microsoft Edge Extension

A lightweight Manifest V3 **Microsoft Edge** browser extension that replaces modern `www.roblox.com` / `web.roblox.com` pages with the classic **2016 & 2019 Roblox UI** (sourced from [`Blue7366/ZekoroV2`](https://github.com/Blue7366/ZekoroV2) and [`RandomWood/economy-simulator`](https://github.com/RandomWood/economy-simulator)) while calling live `*.roblox.com` and `*.rbxcdn.com` APIs directly.

The repository root itself **is** the unpacked extension and contains all UI source (`src/`), assets (`public/`), and prebuilt bundles (`bundles/`).

---

## Load in Microsoft Edge

1. Clone or download this repository.
2. Open Microsoft Edge and go to **`edge://extensions`**.
3. Turn on **Developer mode**.
4. Click **Load unpacked** and select **this repository's root folder** (where `manifest.json` is located).
5. Visit **`https://www.roblox.com/home`**.

---

## Features & Scope

- **47 Classic 2016 + 2019 Routes:** Home, Games, Experience Details (with native `roblox-player:` launch via `auth.roblox.com/v1/authentication-ticket`), Catalog, Asset/Bundle/Game Pass Details, Collectibles, 3D/2D Avatar Editor, Profiles, Friends, Inventory, Favorites, Groups & Group Admin, Messages, Money & Transactions, Trades, Promo Codes, Badges, Archive Forums, and Account Settings.
- **Native Upgrade / Plus & Robux Pages:** Upgrade (`/premium/membership`, `/upgrade`, `/BuildersClub/Upgrade.ashx`) and Buy Robux (`/upgrades/robux`) open Roblox's native Plus/Premium & Robux pages directly.
- **Optimized Footprint:**
  - `bundles/content-ui.js` (`~881 KB`) + pruned `bundles/content-ui.css` (`~73 KB`) load on replaced pages.
  - `bundles/vendor-3d.js` (`~555 KB`, tree-shaken Three.js r137 + Roblox OBJ/MTL loaders) is **lazy-loaded on demand** only when viewing a 3D avatar.
  - `public/` (`~845 KB`) holds all classic fonts (`Gotham SSm`) and authentic 2016/2019 revival logos, sprites & icons.
- **Roblox Create Untouched:** `create.roblox.com` and `/create`, `/develop`, `/build`, `/places/*`, `/universes/*`, `/game-pass/configure`, `/ide/*`, `/my/createuserad.aspx` are excluded and stay on native Roblox Create.
- **Theme Changed Only in Settings (`/My/Account`):** Theme (`Light`, `Dark (2019)`, `OBC Dark (2016)`) and UI Era (`2019` / `2016`) are changed exclusively in **Account Settings (`/My/Account`)**, and sync Light/Dark directly with your Roblox account via `PATCH https://accountsettings.roblox.com/v1/themes/user`.

---

## Rebuild & Test (Optional)

Prebuilt bundles are already included in `bundles/`. If you edit `src/`:

```bash
npm install
npm run build
npm test
```

> Tip: If you run `npm install` locally, `node_modules/` is created for building — remove `node_modules/` before loading unpacked in Edge (or load a clean clone) so Edge doesn't scan dev dependencies.
