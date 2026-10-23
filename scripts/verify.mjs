import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const extDir = path.join(rootDir, 'extension');

console.log('=== 1. Verifying MV3 Manifest, DNR Rules, Asset Integrity & De-Zekoroization ===');

const manifest = JSON.parse(fs.readFileSync(path.join(extDir, 'manifest.json'), 'utf8'));
assert.equal(manifest.manifest_version, 3, 'Must be Manifest V3');
assert.ok(manifest.minimum_edge_version, 'Must declare minimum_edge_version');
assert.ok(fs.existsSync(path.join(extDir, manifest.background.service_worker)), 'Service worker missing');

const rules = JSON.parse(fs.readFileSync(path.join(extDir, 'rules.json'), 'utf8'));
assert.ok(Array.isArray(rules) && rules.length >= 2, 'Expected Origin/Referer + CSP DNR rules');
for (const r of rules) {
  if (r.condition?.regexFilter) {
    assert.ok(
      !/\(\?[!=]/.test(r.condition.regexFilter),
      'DNR regexFilter must be RE2-compatible (no lookaheads)'
    );
  }
}
console.log('  [OK] MV3 manifest.json and RE2-valid rules.json verified');

for (const size of ['16', '32', '48', '128']) {
  const iconFile = path.join(extDir, manifest.icons[size]);
  assert.ok(fs.existsSync(iconFile), `Missing icon ${size}: ${iconFile}`);
}

for (const cs of manifest.content_scripts) {
  assert.ok(
    cs.exclude_matches.includes('https://create.roblox.com/*'),
    'content_scripts must exclude https://create.roblox.com/*'
  );
  for (const jsRel of cs.js) {
    assert.ok(fs.existsSync(path.join(extDir, jsRel)), `Missing content script ${jsRel}`);
  }
}

const cssContent = fs.readFileSync(path.join(extDir, 'bundles', 'content-ui.css'), 'utf8');
const cssUrlMatches = [
  ...cssContent.matchAll(/url\(\s*['"]?(\.\.\/public\/[^'")?#]+)[?#]?[^'")\s]*['"]?\s*\)/g),
];
assert.ok(cssUrlMatches.length > 0, 'Expected rewritten ../public/ asset URLs in content-ui.css');
const missingCssAssets = [];
for (const m of cssUrlMatches) {
  const relFromBundles = m[1];
  const resolved = path.resolve(extDir, 'bundles', relFromBundles);
  if (!fs.existsSync(resolved)) missingCssAssets.push(relFromBundles);
}
assert.deepEqual(missingCssAssets, [], `Missing CSS assets: ${missingCssAssets.join(', ')}`);
console.log(`  [OK] All ${cssUrlMatches.length} CSS asset URLs resolve to real files in extension/public/`);

function walkFiles(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walkFiles(full));
    else if (/\.(js|jsx|css|html|json)$/.test(ent.name)) out.push(full);
  }
  return out;
}

const badRefs = [];
const themeSetCallers = [];
for (const f of walkFiles(path.join(rootDir, 'src'))) {
  const rel = path.relative(rootDir, f);
  const txt = fs.readFileSync(f, 'utf8');
  if (/zekoro/i.test(txt)) badRefs.push(`${rel}: contains "zekoro"`);
  if (/\/thumbs\/[a-z]+\.ashx/i.test(txt)) badRefs.push(`${rel}: contains legacy .ashx thumb`);
  if (/__roblox_api_preview__/i.test(txt)) badRefs.push(`${rel}: contains preview server proxy`);
  if (/\b(?:setTheme|applyEraPreset)\s*\(/.test(txt)) themeSetCallers.push(rel);
}
assert.deepEqual(badRefs, [], `Unexpected references:\n${badRefs.join('\n')}`);

for (const caller of themeSetCallers) {
  assert.ok(
    caller === 'src/services/theme.js' ||
      caller === 'src/AppRouter.js' ||
      caller === 'src/components/myAccount2016/components/accountInfo.js',
    `Theme must ONLY be changeable in Settings (/My/Account), but found setter in: ${caller}`
  );
}
console.log(
  '  [OK] Zero revival/server references, and theme setters strictly restricted to Settings (/My/Account) + Roblox Account sync!'
);

const popupHtml = fs.readFileSync(path.join(extDir, 'popup.html'), 'utf8');
const popupJs = fs.readFileSync(path.join(extDir, 'popup.js'), 'utf8');
assert.ok(popupHtml.includes('https://www.roblox.com/My/Account'), 'popup.html must link to /My/Account');
assert.ok(!/<select\b|data-era|data-theme|rbx_classic_theme|rbx_classic_era/i.test(popupHtml + popupJs), 'popup must not contain theme/era controls');
console.log('  [OK] extension/popup.html & popup.js verified (overlay toggle only; theme directed to /My/Account)');

console.log('\n=== 2. Verifying Create Route Exclusion ===');

const earlyMainSrc = fs.readFileSync(path.join(extDir, 'early-main.js'), 'utf8');
const vendorSrc = fs.readFileSync(path.join(extDir, 'bundles', 'vendor-3d.js'), 'utf8');
const contentUiSrc = fs.readFileSync(path.join(extDir, 'bundles', 'content-ui.js'), 'utf8');

for (const excludedUrl of [
  'https://create.roblox.com/',
  'https://create.roblox.com/dashboard/creations',
  'https://www.roblox.com/develop',
  'https://www.roblox.com/en-us/create',
  'https://www.roblox.com/places/192800/update',
  'https://www.roblox.com/home?rbx_native=1',
]) {
  const dom = new JSDOM(
    '<!doctype html><html><head><title>Creator Hub</title></head><body><div id="modern-create-hub">Native Create UI</div></body></html>',
    { url: excludedUrl, runScripts: 'outside-only', pretendToBeVisual: true }
  );
  dom.window.eval(earlyMainSrc);
  dom.window.eval(contentUiSrc);
  await new Promise((r) => setTimeout(r, 25));
  assert.ok(dom.window.document.getElementById('modern-create-hub'));
  assert.equal(dom.window.document.getElementById('__next'), null);
  dom.window.close();
  console.log(`  [OK] Untouched as required: ${excludedUrl}`);
}

console.log('\n=== 3. Verifying DOM Replacement, Settings-Only Theme Sync & All 45 Routes ===');

function mockRobloxApiResponse(rawUrl, method, data) {
  const u = new URL(rawUrl);
  const host = u.hostname.toLowerCase();
  const p = u.pathname;
  if (host === 'users.roblox.com' && p === '/v1/users/authenticated') {
    return { id: 261, name: 'Shedletsky', displayName: 'Shedletsky' };
  }
  if (host === 'users.roblox.com' && /^\/v1\/users\/\d+$/.test(p)) {
    const id = Number(p.split('/').pop());
    return { id, name: 'Shedletsky', displayName: 'Shedletsky', description: 'Hello', created: '2006-06-22T00:00:00Z', isBanned: false, hasVerifiedBadge: true };
  }
  if (host === 'economy.roblox.com' && p.endsWith('/currency')) return { robux: 1200 };
  if (host === 'economy.roblox.com' && /^\/v2\/assets\/\d+\/details$/.test(p)) {
    const id = Number(p.split('/')[3]);
    return { AssetId: id, TargetId: id, ProductId: id * 10, AssetTypeId: 8, Name: 'Valkyrie Helm', Description: 'Classic item', Creator: { Id: 1, CreatorTargetId: 1, Name: 'ROBLOX', CreatorType: 'User' }, PriceInRobux: 500, IsForSale: true, Sales: 100, Created: '2012-01-01T00:00:00Z', Updated: '2016-01-01T00:00:00Z' };
  }
  if (host === 'catalog.roblox.com' && p === '/v1/catalog/items/details') {
    return { data: [{ id: 1365767, assetType: 8, name: 'Valkyrie Helm', description: 'Classic item', creatorTargetId: 1, creatorType: 'User', creatorName: 'ROBLOX', price: 195000, itemRestrictions: ['Limited'], isForSale: true }] };
  }
  if (host === 'games.roblox.com' && p === '/v1/games/multiget-place-details') {
    return [{ placeId: 192800, name: 'Work at a Pizza Place', description: 'Classic game', builder: 'Dued1', builderId: 82471, isPlayable: true, universeId: 47545, universeRootPlaceId: 192800, price: 0 }];
  }
  if (host === 'games.roblox.com' && p === '/v1/games') {
    return { data: [{ id: 47545, rootPlaceId: 192800, name: 'Work at a Pizza Place', description: 'Classic game', creator: { id: 82471, name: 'Dued1', type: 'User' }, price: null, playing: 15000, visits: 5000000000, maxPlayers: 12, created: '2008-03-28T00:00:00Z', updated: '2026-10-01T00:00:00Z', genre: 'Town and City' }] };
  }
  if (host === 'groups.roblox.com' && /^\/v1\/groups\/\d+$/.test(p)) {
    return { id: 7, name: 'Roblox', description: 'Official group', owner: { userId: 156, username: 'builderman' }, memberCount: 1000000, publicEntryAllowed: true };
  }
  if (host === 'groups.roblox.com' && p.includes('/roles')) {
    if (p.includes('/groups/roles')) return { data: [{ group: { id: 7, name: 'Roblox', memberCount: 1000000 }, role: { id: 1, name: 'Member', rank: 1 } }] };
    return { roles: [{ id: 1, name: 'Member', rank: 1, memberCount: 1000000 }] };
  }
  if (host === 'accountsettings.roblox.com' && p === '/v1/themes/user') {
    return { themeType: data?.themeType || 'Light' };
  }
  if (host === 'accountinformation.roblox.com' && p.includes('/roblox-badges')) return [];
  return {};
}

const recordedApiCalls = [];
const storageData = {};
const storageListeners = [];

const dom = new JSDOM(
  `<!doctype html>
  <html>
    <head>
      <meta name="csrf-token" data-token="csrf-live-token-777" />
      <meta name="user-data" data-userid="261" data-name="Shedletsky" data-displayname="Shedletsky" />
      <title>Modern Roblox</title>
    </head>
    <body class="rbx-body dark-theme">
      <div id="modern-roblox-shell">MODERN ROBLOX NATIVE HTML</div>
    </body>
  </html>`,
  { url: 'https://www.roblox.com/home', runScripts: 'outside-only', pretendToBeVisual: true }
);

const win = dom.window;
const runtimeErrors = [];
win.addEventListener('error', (ev) => runtimeErrors.push(ev.error?.stack || ev.message || String(ev)));
win.addEventListener('unhandledrejection', (ev) =>
  runtimeErrors.push(ev.reason?.stack || ev.reason?.message || String(ev.reason))
);

win.scrollTo = () => {};
win.matchMedia = () => ({ matches: false, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {} });
win.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
win.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
win.HTMLCanvasElement.prototype.getContext = () => null;

win.fetch = async (url) => {
  const strUrl = String(url);
  if (strUrl.startsWith('chrome-extension://')) {
    const rel = strUrl.replace(/^chrome-extension:\/\/[^/]+\//, '');
    const diskPath = path.join(extDir, rel);
    return new Response(fs.existsSync(diskPath) ? fs.readFileSync(diskPath, 'utf8') : '', { status: 200 });
  }
  return new Response(JSON.stringify(mockRobloxApiResponse(strUrl, 'GET')), { status: 200 });
};

win.chrome = {
  runtime: {
    id: 'testedgeextensionid',
    lastError: null,
    getURL: (p) => `chrome-extension://testedgeextensionid/${String(p).replace(/^\/+/, '')}`,
    sendMessage: (msg, cb) => {
      if (msg && msg.type === 'ROBLOX_API_FETCH') {
        recordedApiCalls.push({ method: msg.method, url: msg.url, data: msg.data });
        const resp = mockRobloxApiResponse(msg.url, msg.method, msg.data);
        Promise.resolve().then(() =>
          cb({ status: 200, headers: {}, data: resp, csrfToken: 'csrf-live-token-777' })
        );
      }
    },
  },
  storage: {
    local: {
      get: (keys, cb) => {
        const res = {};
        const arr = Array.isArray(keys) ? keys : Object.keys(keys || {});
        for (const k of arr) if (k in storageData) res[k] = storageData[k];
        cb(res);
      },
      set: (patch, cb) => {
        const changes = {};
        for (const [k, v] of Object.entries(patch)) {
          changes[k] = { oldValue: storageData[k], newValue: v };
          storageData[k] = v;
        }
        for (const fn of storageListeners) fn(changes, 'local');
        if (cb) cb();
      },
    },
    onChanged: {
      addListener: (fn) => storageListeners.push(fn),
      removeListener: () => {},
    },
  },
};

win.eval(earlyMainSrc);
win.eval(vendorSrc);
win.eval(contentUiSrc);
await new Promise((r) => setTimeout(r, 150));

assert.equal(win.document.getElementById('modern-roblox-shell'), null);
assert.ok(win.document.getElementById('__next'));

win.history.pushState({}, '', '/My/Account');
win.dispatchEvent(new win.PopStateEvent('popstate'));
await new Promise((r) => setTimeout(r, 100));

const themeSelectEl = win.document.getElementById('rbx-settings-theme-select');
assert.ok(themeSelectEl, 'Expected #rbx-settings-theme-select in /My/Account Settings');
themeSelectEl.value = 'dark2019';
themeSelectEl.dispatchEvent(new win.Event('change', { bubbles: true }));
await new Promise((r) => setTimeout(r, 80));

assert.equal(win.document.body.dataset.rbxTheme, 'dark2019');
assert.ok(
  recordedApiCalls.some(
    (c) =>
      c.method === 'PATCH' &&
      c.url === 'https://accountsettings.roblox.com/v1/themes/user' &&
      c.data?.themeType === 'Dark'
  ),
  'Expected PATCH https://accountsettings.roblox.com/v1/themes/user when changing theme in /My/Account!'
);
console.log('  [OK] Theme changes exclusively in /My/Account and syncs via PATCH accountsettings.roblox.com/v1/themes/user');

const testRoutes = [
  '/?landing=1',
  '/home',
  '/games',
  '/games/192800/Work-at-a-Pizza-Place',
  '/catalog',
  '/catalog/1365767/Valkyrie-Helm',
  '/library',
  '/library/10472779/Bloxy-Cola',
  '/users/friends',
  '/users/261/profile',
  '/users/261/friends',
  '/users/261/inventory',
  '/users/261/favorites',
  '/User.aspx?ID=261',
  '/My/Avatar',
  '/My/Character.aspx',
  '/My/Groups.aspx',
  '/Groups/7/Roblox',
  '/Groups/Audit.aspx?groupid=7',
  '/My/GroupAdmin.aspx?gid=7',
  '/My/CreateGroup.aspx',
  '/search/groups?keyword=Roblox',
  '/My/Account',
  '/My/Messages',
  '/messages/compose?recipientId=156',
  '/My/Money.aspx',
  '/My/Trades.aspx',
  '/Trade/TradeWindow.aspx?TradePartnerID=156',
  '/My/Item.aspx?id=10472779',
  '/My/CurrencyExchange.aspx',
  '/collectibles',
  '/BuildersClub/Upgrade.ashx',
  '/Badges.aspx',
  '/Forum/Default.aspx',
  '/Forum/ShowForum.aspx?ForumID=13',
  '/Forum/ShowPost.aspx?PostID=1',
  '/Forum/AddPost.aspx?ForumID=13',
  '/Forum/MyForums.aspx',
  '/promocodes',
  '/search/users?keyword=Shedletsky',
  '/internal/report-center',
  '/download',
  '/download/thankyou',
  '/request-error',
  '/login',
];

for (const era of ['2019', '2016']) {
  win.history.pushState({}, '', '/My/Account');
  win.dispatchEvent(new win.PopStateEvent('popstate'));
  await new Promise((r) => setTimeout(r, 60));

  const eraSel = win.document.getElementById('rbx-settings-era-select');
  eraSel.value = era;
  eraSel.dispatchEvent(new win.Event('change', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 60));
  assert.equal(win.document.body.dataset.rbxEra, era);

  for (const route of testRoutes) {
    if (process.env.VERBOSE) console.log(`    -> [${era}] ${route}`);
    win.__RBX_LAST_RENDER_ERROR__ = null;
    win.history.pushState({}, '', route);
    win.dispatchEvent(new win.PopStateEvent('popstate'));
    await new Promise((r) => setTimeout(r, 45));
    if (win.__RBX_LAST_RENDER_ERROR__) {
      throw new Error(
        `React render error on [${era}] ${route}: ${
          win.__RBX_LAST_RENDER_ERROR__.stack || win.__RBX_LAST_RENDER_ERROR__
        }`
      );
    }
    const nextNode = win.document.getElementById('__next');
    assert.ok(nextNode.innerHTML.length > 50, `Empty render on [${era}] ${route}`);
    assert.ok(!nextNode.textContent.includes('Something went wrong'), `ErrorBoundary on [${era}] ${route}`);
  }
  console.log(`  [OK] Verified all ${testRoutes.length} routes cleanly in ${era} Era!`);
}

assert.deepEqual(runtimeErrors, [], `Runtime errors:\n${runtimeErrors.join('\n')}`);
dom.window.close();

console.log('\n✅ ALL EXTENSION VERIFICATIONS PASSED WITH ZERO ERRORS!');
process.exit(0);
