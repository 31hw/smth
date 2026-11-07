# Classic 2019 UI — page source map

Snapshot of every page that renders the 2019 UI, taken from the extension source at commit `5bd9d14`
(branch `arena/63c1c8c0-smth`).

- `src/` — a frozen copy of the extension's `src/` tree (paths identical to the live source, so any file
  here can be diffed against / copied straight back into `../src/`).
- `routes-2019.json` — machine-readable `route → entry file` table (all 45 routes).
- This folder is **reference material only**: the extension loads `bundles/`, `early-main.js` and
  `public/`, never anything in here.

---

## 1. How 2019 vs 2016 is selected

| File | What it does |
| --- | --- |
| `src/services/theme.js` | `getEra()` reads `localStorage['rbx_era_v1']` (`'2019'` is the default), `applyEraPreset('2016')` switches avatar/catalog/game page styles and fonts, `getGamePageStyle()` / `getCatalogPageStyle()` / `getAvPageStyle()` return `Modern` (2019) or `Legacy` (2016). |
| `src/components/theme2016/index.js` | Not a 2016 page — it only renders the `<div id="theme-2016-enabled" />` era marker. Every page wraps its content in it, in **both** eras. |

So: **2019 is the default render for every page**; the 2016 look is a per-page branch (see §6).

---

## 2. Game page (2019) — `/games/:assetId/:name`

Entry chain:

```
src/pages/games/[assetId]/[name].js        route entry (<title>Game - ROBLOX</title> + SharedAssetPage2019)
└─ src/components/sharedAssetPage2019/index.js   resolves game vs asset vs bundle vs game-pass
   ├─ src/components/gameDetails/index.js        ← the 2019 game page (isModern branch)
   │  ├─ components/newGameOverview.js           hero: thumbnails, play, follow, vote, favourite, ⋯ menu
   │  │  ├─ components/new/gameThumbnails.js
   │  │  ├─ components/newPlayButton.js
   │  │  ├─ components/new/follow.js
   │  │  ├─ components/new/vote.js
   │  │  ├─ components/new/voteModal.js
   │  │  ├─ components/new/favorite.js
   │  │  ├─ components/new/shutdownServerModal.js
   │  │  └─ ../../dropdown2016 (the "…" menu, used by 2019 pages too)
   │  ├─ components/gameAbout/index.js           About tab
   │  │  └─ components/gameAbout/components/badges.js
   │  ├─ components/gameStore.js                 Store tab
   │  ├─ components/recommendations/index.js     Recommendations row
   │  │  └─ components/recommendations/GameRow.js
   │  ├─ components/new/newGameServers.js        Servers tab
   │  ├─ components/gameModals/instructionsModal.js
   │  ├─ components/gameModals/downloadRobloxModal.js
   │  ├─ components/gameModals/robloxLoadingModal.js
   │  └─ stores/gameDetailsStore.js
   ├─ src/components/catalogDetailsPage/**       used when the id is an asset/bundle (catalog item)
   ├─ src/components/AssetDetailsPage/**         used for library items
   └─ src/components/sharedAssetPage/index.js    legacy wrapper; in Modern it just delegates to 2019
```

Shared pieces the 2019 game page pulls in:
`horizontalTabs/`, `actionButton/`, `actionButtonNew/`, `creatorLink/`, `playerImage/`, `playerHeadshot/`,
`newGameCard/`, `itemImage/`, `gameIconImage/`, `newModal/`, `oldModal/`, `bcOverlay/`, `robux2/`,
`userAdvertisement/`, `ad/adBanner.js`, `ad/adSkyscraper.js`, `resaleSvgChart.js`,
`services/games.js`, `services/catalog.js`, `services/thumbnails.js`, `services/users.js`, `services/friends.js`.

**2016-only files inside the same folders** (skip them for 2019): `components/gameOverview.js`,
`components/playButton.js`, `components/vote.js`, `components/gameThumbnails.js`, `components/gameServers.js`,
`components/builderDetails.js`, `components/description.js`, `components/gameStats.js`.
(`catalogDetailsPage/components/favorite.js` is still used by the legacy overview — the 2019 overview has its own `new/favorite.js`.)

---

## 3. All routes that render the 2019 UI

| Route | Entry file | Main 2019 component(s) |
| --- | --- | --- |
| `/` | `src/pages/index.js` | `components/publicLanding` (landing, `disableWebsiteTheming`) |
| `/home` | `src/pages/home.js` | `components/myDashboard` + `stores/dashboardStore` |
| `/login` | `src/pages/login.js` | `components/loginPage` (`loginArea`, `signUpArea`) |
| `/games` | `src/pages/games/index.js` | `components/gamesPage` (`components/games.js`, `gameRow.js`, `newGameCard`) |
| `/games/:assetId/:name` | `src/pages/games/[assetId]/[name].js` | `components/sharedAssetPage2019` → `components/gameDetails` |
| `/catalog` | `src/pages/catalog/index.js` | `catalogPageInput`, `catalogPageNavigation`, `catalogPageResults`, `catalogFilters`, `catalogLegend` |
| `/catalog/:assetId/:name` | `src/pages/catalog/[assetId]/[name].js` | `components/sharedAssetPage2019` → `components/catalogDetailsPage` |
| `/bundles/:id/:name`, `/game-pass/:id/:name` | same as above | `catalogDetailsPage` |
| `/library/:assetId/:name` | `src/pages/library/[assetId]/[name].js` | `components/sharedAssetPage2019` → `components/AssetDetailsPage` |
| `/users/friends` | `src/pages/users/friends.js` | `components/userFriends` |
| `/users/:userId/profile` | `src/pages/users/[userId]/profile.js` | `components/userProfile` (`components/profileHeader.js` uses `dropdown2016`) |
| `/users/:userId/friends` | `src/pages/users/[userId]/friends.js` | `components/userFriends` |
| `/users/:userId/inventory` | `src/pages/users/[userId]/inventory.js` | `components/userInventory` (`components/categorySelection.js`, `components/paging.js`) |
| `/users/:userId/favorites` | `src/pages/users/[userId]/favorites.js` | `components/userInventory` |
| `/User.aspx` | `src/pages/User.aspx.js` | redirects to `/users/:id/profile` |
| `/My/Avatar` | `src/pages/My/Avatar.js` | `components/AvatarEditorPage` (2019) / `characterCustomizerPage` (2016) |
| `/My/Character.aspx` | `src/pages/My/Character.aspx.js` | `components/characterCustomizerPage` — **2016 avatar editor** |
| `/My/Account` | `src/pages/My/Account.js` | `components/myAccount2016` (settings; contains the era/theme switch) |
| `/My/Messages` | `src/pages/My/Messages.js` | `components/myMessages` + `stores/myMessages` |
| `/messages/compose` | `src/pages/messages/compose.js` | `components/header`, `actionButton`, `services/privateMessages` |
| `/My/Money.aspx`, `/My/CurrencyExchange.aspx` | `src/pages/My/Money.aspx.js`, `src/pages/My/CurrencyExchange.aspx.js` | `components/myMoney` |
| `/My/Trades.aspx` | `src/pages/My/Trades.aspx.js` | `components/myMoney` + `stores/tradeStore` |
| `/Trade/TradeWindow.aspx` | `src/pages/Trade/TradeWindow.aspx.js` | `components/tradeWindow` |
| `/My/Item.aspx` | `src/pages/My/Item.aspx.js` | `components/configureItem` |
| `/My/Groups.aspx`, `/Groups/:id/:name` | `src/pages/My/Groups.aspx.js`, `src/pages/Groups/[id]/[name].js` | `components/myGroups` |
| `/My/GroupAdmin.aspx` | `src/pages/My/GroupAdmin.aspx.js` | `components/groupAdmin` |
| `/My/CreateGroup.aspx` | `src/pages/My/CreateGroup.aspx.js` | inline form + `actionButton`, `catalogDetailsPage/components/robux` |
| `/Groups/Audit.aspx` | `src/pages/Groups/Audit.aspx.js` | `components/groupAudit` |
| `/search/users`, `/search/groups` | `src/pages/search/users.js`, `src/pages/search/groups.js` | `components/searchUsers`, `components/searchGroups` |
| `/Badges.aspx` | `src/pages/Badges.aspx.js` | `components/badges` |
| `/collectibles` | `src/pages/collectibles.js` | inline grid + `itemImage`, `playerImage` |
| `/promocodes` | `src/pages/promocodes.js` | `components/promoCodesPage` |
| `/Forum/*` | `src/pages/Forum/*.js` | `forumHome`, `forumSubcategory`, `forumThread`, `forumContainer`, `forumHeader`, `myForums` |
| `/download`, `/download/thankyou` | `src/pages/download.js`, `src/pages/download/thankyou.js` | `components/download`, inline thank-you |
| `/internal/report-center` | `src/pages/internal/report-center.js` | inline report form |
| `/BuildersClub/Upgrade.ashx` | `src/pages/BuildersClub/Upgrade.ashx.js` | redirects to `/plus` |
| `/request-error`, `/404` | `src/pages/request-error.js`, `src/pages/404.js` | `components/errorPage` |

---

## 4. Shared 2019 chrome (navbar / sidebar / footer)

```
src/components/navbar/index.js                    classic 2019 navbar (2016 = blue fallback in same file)
src/components/navbar/components/logo.js          2019 / 2016 logos (public/img/roblox_logo.svg, roblox_2019_logo.png, logo_R.svg)
src/components/navbar/components/navigationLinks.js Games · Catalog · Create · Robux
src/components/navbar/components/search.js        search + composedPath() outside-click handling
src/components/navbar/components/loggedinArea.js  robux balance, messages, notifications, settings menu
src/components/navbar/components/loginArea.js     Log In / Sign Up + LoginModal
src/components/navSidebar/index.js                signed-in left sidebar (175px) + hamburger
src/components/navSidebar/components/linkEntry.js
src/components/footer/index.js                    2019 footer (delegates to footer2016.js for the 2016 era)
src/components/footer/footer2016.js               2016 footer
```

Supporting UI used across 2019 pages: `actionButton/`, `actionButtonNew/`, `dropdown2016/`, `horizontalTabs/`,
`newModal/`, `oldModal/`, `pagination2016/`, `tabs2016/`, `genericPagination/`, `playerHeadshot/`, `playerImage/`,
`itemImage/`, `gameIconImage/`, `groupIcon/`, `link/`, `selector/`, `gearDropdown/`, `robux2/`, `bcOverlay/`,
`styles/buttonStyles.js`, `styles/globals.css`, `styles/bootstrap-pruned.css`, `styles/roblox/icons.css`.

---

## 5. Data layer (live Roblox endpoints)

`src/services/`: `games.js`, `catalog.js`, `users.js`, `avatar.js`, `inventory.js`, `economy.js`,
`thumbnails.js`, `friends.js`, `presence.js`, `privateMessages.js`, `trades.js`, `badges.js`, `groups.js`,
`forums.js`, `accountSettings.js`, `theme.js`, `themeSync.js`, `chromeTheme.js`, `metrics.js`.
`src/lib/request.js` routes every `*.roblox.com` / `*.rbxcdn.com` call through the MV3 service worker
(cookies + CSRF retry); `src/stores/` holds the `unstated-next` stores each page uses.

---

## 6. 2016-only files (do not need them for a 2019-only build)

- `src/components/characterCustomizerPage/**` — legacy avatar editor (`/My/Character.aspx`).
- `src/components/gameDetails/components/gameOverview.js`, `playButton.js`, `vote.js`, `gameThumbnails.js`,
  `gameServers.js`, `builderDetails.js`, `description.js`, `gameStats.js` — legacy game hero.
- `src/components/gamesPage/components/` → `SmallGameCard2016` branch in `games.js` / `gameRow.js`.
- `src/components/footer/footer2016.js` — 2016 footer (2019 footer is `footer/index.js`).
- legacy catalog branches: `getCatalogPageStyle() === Legacy` inside `sharedAssetPage/index.js` and `sharedAssetPage2019/index.js`.
- `src/components/publicLanding` has era branches but is the same page.
- Naming-only: `myAccount2016/`, `dropdown2016/`, `pagination2016/`, `tabs2016/`, `theme2016/` are **used by 2019 pages too** — the folder names come from the original revival repos.

---

## 7. Note

This export is source-only (`src/`). To rebuild the extension you also need the repo's
`package.json`, `scripts/build.mjs`, `public/` assets and `manifest.json`; run
`npm install && npm run build && npm test` at the repo root.
