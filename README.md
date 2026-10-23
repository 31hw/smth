# Classic Roblox UI (2016 / 2019) — Microsoft Edge Extension

A Manifest V3 **Microsoft Edge** browser extension that replaces modern `www.roblox.com` / `web.roblox.com` pages with the classic **2016 & 2019 Roblox UI** (sourced from [`Blue7366/ZekoroV2`](https://github.com/Blue7366/ZekoroV2) and [`RandomWood/economy-simulator`](https://github.com/RandomWood/economy-simulator)) while connecting directly to live `*.roblox.com` and `*.rbxcdn.com` endpoints.

> **Pure Browser Extension:** There is no proxy server or sandbox backend. All requests use your real signed-in Roblox session on `roblox.com`.

---

## Install in Microsoft Edge

The `extension/` directory is already built and ready to load unpacked:

1. Clone or download this repository.
2. Open Microsoft Edge and navigate to **`edge://extensions`**.
3. Enable **Developer mode** (toggle in the left sidebar or bottom-left).
4. Click **Load unpacked** and select the **`extension`** folder inside this repository (`.../smth/extension`).
5. Visit **`https://www.roblox.com/home`** — modern Roblox's HTML is removed and replaced with the classic UI.

---

## Key Behavior

- **Combined 2016 + 2019 Classic Pages (45 Routes):**
  - Home (`/home`), Public Landing (`/`), Login (`/login`), Download (`/download`)
  - Games Discovery (`/games`) & Experience Details (`/games/:placeId/:name`) with live `roblox-player:` game launch via `auth.roblox.com/v1/authentication-ticket`
  - Catalog (`/catalog`), Asset Details (`/catalog/:id/:name`, `/library/:id/:name`), Collectibles (`/collectibles`), Item Configuration (`/My/Item.aspx`)
  - 3D/2D Avatar Editor (`/My/Avatar` & `/My/Character.aspx`)
  - User Profiles (`/users/:id/profile`, `/User.aspx`), Friends (`/users/friends`, `/users/:id/friends`), Inventory (`/users/:id/inventory`), Favorites (`/users/:id/favorites`), User Search (`/search/users`)
  - Groups (`/My/Groups.aspx`, `/Groups/:id/:name`, `/My/GroupAdmin.aspx`, `/Groups/Audit.aspx`, `/My/CreateGroup.aspx`, `/search/groups`)
  - Messages (`/My/Messages`, `/messages/compose`), Money & Transactions (`/My/Money.aspx`, `/My/CurrencyExchange.aspx`), Trades (`/My/Trades.aspx`, `/Trade/TradeWindow.aspx`)
  - Account Settings (`/My/Account`), Promo Codes (`/promocodes`), Membership (`/BuildersClub/Upgrade.ashx`), Badges (`/Badges.aspx`), Classic Archive Forums (`/Forum/*`), Report Abuse (`/internal/report-center`)
- **Roblox Create Excluded:**
  - `https://create.roblox.com/*` as well as `/create`, `/develop`, `/build`, `/places/*`, `/universes/*`, `/game-pass/*`, `/ide/*`, and `/my/createuserad.aspx` are **not** replaced and continue to use native Roblox Create.
  - Appending `?rbx_native=1` to any URL temporarily bypasses the classic UI on that tab, or you can toggle the extension on/off from the Edge toolbar popup.
- **Theme Configuration Only in Settings (`/My/Account`):**
  - Theme (`Light`, `Dark (2019)`, `OBC Dark (2016)`), UI Era (`2019 Classic` vs `2016 Classic`), Page Styles (Avatar, Catalog, Game Details), Typography, Logo, and Accent Color are configured **exclusively** in **Settings (`/My/Account` -> Account Info -> Theme & Classic UI)**.
  - Selecting a Light or Dark theme in `/My/Account` also syncs directly with your real Roblox account via `PATCH https://accountsettings.roblox.com/v1/themes/user`.

---

## Building from Source (Optional)

Prebuilt bundles are already included in `extension/bundles/`. If you modify files under `src/` or `scripts/`:

```bash
npm install
npm run build   # Rebuilds extension/bundles/{vendor-3d.js,content-ui.js,content-ui.css}
npm test        # Runs MV3 manifest, DNR, Create-exclusion, Settings sync & 45-route verification
```

After rebuilding, click **Reload** on the extension card in `edge://extensions`.
