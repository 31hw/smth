import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const extDir = rootDir;

assert.ok(!fs.existsSync(path.join(rootDir, 'extension')), 'Extension must live directly at repo root (no extension/ subfolder)');

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
  for (const jsRel of cs.js) {
    assert.ok(fs.existsSync(path.join(extDir, jsRel)), `Missing content script ${jsRel}`);
  }
}

const chromeScript = manifest.content_scripts.find((cs) => cs.js.includes('bundles/content-ui.js'));
assert.ok(chromeScript, 'Expected the classic UI content script');
assert.ok(
  chromeScript.matches.includes('https://create.roblox.com/*'),
  'bundles/content-ui.js must run on create.roblox.com to mount the classic chrome'
);
const excludedChromePaths = chromeScript.exclude_matches || [];
assert.ok(
  !excludedChromePaths.some(
    (pattern) =>
      pattern.includes('create.roblox.com') ||
      pattern.includes('/develop') ||
      pattern.includes('/places') ||
      pattern.includes('/plus') ||
      pattern.includes('/upgrades')
  ),
  'Native purchase / Plus / Creator Hub pages must not be excluded from the classic chrome'
);
assert.ok(
  excludedChromePaths.some((pattern) => pattern.includes('/game/join')),
  'Game-launch endpoints should stay excluded from the content scripts'
);
const cspRule = rules.find((r) =>
  r.action?.responseHeaders?.some((h) => h.header === 'content-security-policy')
);
assert.ok(
  cspRule && cspRule.condition.requestDomains.includes('create.roblox.com'),
  'DNR CSP rule must cover create.roblox.com so the classic chrome can mount there'
);

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
console.log(`  [OK] All ${cssUrlMatches.length} CSS asset URLs resolve to real files in public/`);

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
      caller === 'src/services/themeSync.js' ||
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
console.log('  [OK] popup.html & popup.js verified (overlay toggle only; theme directed to /My/Account)');

console.log('\n=== 2. Verifying Original HTML + Classic Chrome Wrapping ===');

const earlyMainSrc = fs.readFileSync(path.join(extDir, 'early-main.js'), 'utf8');
const vendorSrc = fs.readFileSync(path.join(extDir, 'bundles', 'vendor-3d.js'), 'utf8');
const contentUiSrc = fs.readFileSync(path.join(extDir, 'bundles', 'content-ui.js'), 'utf8');

function createNativeDom(url, { evalEarly = true } = {}) {
  const dom = new JSDOM(
    '<!doctype html><html><head><title>Modern Roblox</title></head><body><div id="modern-roblox-native">MODERN ROBLOX NATIVE HTML</div></body></html>',
    { url, runScripts: 'outside-only', pretendToBeVisual: true }
  );
  const win = dom.window;
  Object.defineProperty(win, 'innerWidth', { configurable: true, value: 1440 });
  Object.defineProperty(win, 'innerHeight', { configurable: true, value: 900 });
  win.scrollTo = () => {};
  win.matchMedia = () => ({
    matches: false,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
  });
  win.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  win.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  win.fetch = async () => new Response('', { status: 200 });
  const nativeRect = win.Element.prototype.getBoundingClientRect;
  win.Element.prototype.getBoundingClientRect = function () {
    const base = nativeRect.call(this);
    const match = (selector) => {
      try {
        return typeof this.matches === 'function' && this.matches(selector);
      } catch (_) {
        return false;
      }
    };
    if (match('[data-rbx-chrome="navbar"]')) {
      return { ...base, width: 1440, height: 40, top: 0, left: 0, right: 1440, bottom: 40 };
    }
    if (match('[data-rbx-chrome="footer"]')) {
      return { ...base, width: 1440, height: 100, top: 800, left: 0, right: 1440, bottom: 900 };
    }
    if (match('[data-rbx-chrome="sidebar-card"]')) {
      return { ...base, width: 175, height: 900, top: 0, left: 0, right: 175, bottom: 900 };
    }
    return base;
  };
  win.chrome = {
    runtime: {
      id: 'testedgeextensionid',
      lastError: null,
      getURL: (p) => `chrome-extension://testedgeextensionid/${String(p).replace(/^\/+/, '')}`,
      sendMessage: (msg, cb) => {
        const data =
          msg && msg.url === 'https://users.roblox.com/v1/users/authenticated'
            ? { id: 261, name: 'Shedletsky', displayName: 'Shedletsky' }
            : {};
        Promise.resolve().then(() =>
          cb({ status: 200, headers: {}, data, csrfToken: 'csrf-native-token' })
        );
      },
    },
    storage: {
      local: {
        get: (_keys, cb) => cb({}),
        set: (_patch, cb) => {
          if (cb) cb();
        },
      },
      onChanged: {
        addListener: () => {},
        removeListener: () => {},
      },
    },
  };
  if (evalEarly) win.eval(earlyMainSrc);
  win.eval(contentUiSrc);
  return dom;
}

const wrappedNativeUrls = [
  'https://www.roblox.com/plus',
  'https://www.roblox.com/premium/membership',
  'https://www.roblox.com/upgrade',
  'https://www.roblox.com/upgrades/robux',
  'https://www.roblox.com/upgrades/paymentmethods',
  'https://www.roblox.com/upgrades/redeem',
  'https://www.roblox.com/modcreditagreement/957e398b-e2a0-49aa-aefe-c5a6ad22f3a2',
  'https://www.roblox.com/login?returnUrl=https%3A%2F%2Fapis.roblox.com%2Foauth%2Fv1%2Fauthorize%3Fclient_id%3D1',
  'https://www.roblox.com/develop',
  'https://www.roblox.com/en-us/create',
  'https://www.roblox.com/places/192800/update',
  'https://www.roblox.com/game-pass/configure?id=1234',
  'https://create.roblox.com/',
  'https://create.roblox.com/dashboard/creations',
];

for (const wrappedUrl of wrappedNativeUrls) {
  const dom = createNativeDom(wrappedUrl);
  const win = dom.window;
  const expectedHost = new URL(wrappedUrl).hostname === 'create.roblox.com' ? 'create' : 'www';
  await new Promise((r) => setTimeout(r, 220));

  assert.ok(
    win.document.getElementById('modern-roblox-native'),
    `Original native HTML must be preserved on ${wrappedUrl}`
  );
  assert.equal(win.document.getElementById('__next'), null, `Full classic UI must not replace ${wrappedUrl}`);
  assert.equal(
    win.document.documentElement.dataset.rbxClassicChrome,
    '1',
    `Expected classic chrome mode on ${wrappedUrl}`
  );

  const host = win.document.getElementById('rbx-classic-chrome');
  assert.ok(host, `Expected #rbx-classic-chrome host on ${wrappedUrl}`);
  assert.ok(host.shadowRoot, `Expected a shadow root for the classic chrome on ${wrappedUrl}`);
  assert.ok(
    host.shadowRoot.querySelector('[data-rbx-chrome="navbar"]'),
    `Expected the classic navbar inside the chrome on ${wrappedUrl}`
  );
  assert.ok(
    host.shadowRoot.querySelector('[data-rbx-chrome="footer"]'),
    `Expected the classic footer inside the chrome on ${wrappedUrl}`
  );
  assert.ok(
    host.shadowRoot.textContent.includes('Games') &&
      host.shadowRoot.textContent.includes('Catalog') &&
      host.shadowRoot.textContent.includes('Robux'),
    `Expected classic navigation links inside the chrome on ${wrappedUrl}`
  );
  assert.ok(
    host.shadowRoot.querySelector('[data-rbx-chrome="sidebar-card"]'),
    `Expected the signed-in classic sidebar inside the chrome on ${wrappedUrl}`
  );
  assert.ok(
    host.shadowRoot.textContent.includes('Shedletsky'),
    `Expected the signed-in username inside the chrome on ${wrappedUrl}`
  );
  assert.ok(
    host.shadowRoot.querySelectorAll('style[data-jss]').length > 0,
    `Expected scoped JSS styles inside the shadow root on ${wrappedUrl}`
  );
  assert.equal(
    win.document.querySelectorAll('nav.navbar').length,
    0,
    `Classic styles must stay inside the shadow root on ${wrappedUrl}`
  );
  const layoutStyle = win.document.getElementById('rbx-classic-chrome-layout');
  assert.ok(layoutStyle, `Expected the native-page offset stylesheet on ${wrappedUrl}`);
  assert.ok(
    /padding-top:\s*var\(--rbx-chrome-top/.test(layoutStyle.textContent) &&
      /padding-left:\s*var\(--rbx-chrome-left/.test(layoutStyle.textContent) &&
      /padding-bottom:\s*var\(--rbx-chrome-footer/.test(layoutStyle.textContent),
    `Expected the page to be offset by the measured chrome on ${wrappedUrl}`
  );
  assert.equal(
    win.document.documentElement.style.getPropertyValue('--rbx-chrome-top'),
    '40px',
    `Expected the classic navbar height to offset the page on ${wrappedUrl}`
  );
  assert.equal(
    win.document.documentElement.style.getPropertyValue('--rbx-chrome-left'),
    '175px',
    `Expected the classic sidebar width to offset the page on ${wrappedUrl}`
  );
  assert.ok(
    parseInt(win.document.documentElement.style.getPropertyValue('--rbx-chrome-footer'), 10) >= 100,
    `Expected the classic footer height to offset the page bottom on ${wrappedUrl}`
  );
  assert.equal(
    host.style.height,
    '900px',
    `Expected the chrome host to span the document on ${wrappedUrl}`
  );
  assert.equal(
    host.getAttribute('data-rbx-chrome-host'),
    expectedHost,
    `Unexpected chrome host kind on ${wrappedUrl}`
  );

  dom.window.close();
  console.log(`  [OK] Original HTML preserved + classic chrome mounted: ${wrappedUrl}`);
}

for (const nativeUrl of [
  'https://www.roblox.com/home?rbx_native=1',
  'https://www.roblox.com/games/start?placeId=192800',
  'https://www.roblox.com/game/join?placeId=192800',
]) {
  const dom = createNativeDom(nativeUrl);
  const win = dom.window;
  await new Promise((r) => setTimeout(r, 150));
  assert.ok(win.document.getElementById('modern-roblox-native'), `Expected untouched page on ${nativeUrl}`);
  assert.equal(win.document.getElementById('__next'), null, `Unexpected classic UI on ${nativeUrl}`);
  assert.equal(
    win.document.getElementById('rbx-classic-chrome'),
    null,
    `No classic chrome on hard-native flow ${nativeUrl}`
  );
  assert.equal(win.document.documentElement.dataset.rbxClassicChrome, undefined);
  dom.window.close();
  console.log(`  [OK] Hard-native flow left completely untouched: ${nativeUrl}`);
}

console.log('\n=== 3. Verifying DOM Replacement, Settings-Only Theme Sync & All Classic Routes ===');

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
  if (host === 'catalog.roblox.com' && p === '/v2/search/items/details') {
    const category = (u.searchParams.get('category') || 'All').toLowerCase();
    const subcategory = (u.searchParams.get('subcategory') || '').toLowerCase();
    const isEmote = category === 'avataranimations';
    const isFeatured = category === 'all' && u.searchParams.get('creatorTargetId') === '1';
    const items = isEmote
      ? [
          {
            id: 33668595,
            itemType: 'Asset',
            assetType: 61,
            name: 'Floss Dance',
            description: 'Emote',
            creatorType: 'User',
            creatorTargetId: 1,
            creatorName: 'ROBLOX',
            price: 200,
            priceStatus: 'For Sale',
            unitsAvailableForConsumption: 0,
            favoriteCount: 6000,
            itemRestrictions: [],
          },
        ]
      : [
          {
            id: isFeatured ? 10472779 : 1365767,
            itemType: 'Asset',
            assetType: isFeatured ? 19 : 8,
            name: isFeatured || subcategory === 'gear' ? 'Bloxy Cola' : 'Valkyrie Helm',
            description: 'Classic item',
            creatorType: 'User',
            creatorTargetId: 1,
            creatorName: 'ROBLOX',
            price: 500,
            priceStatus: 'For Sale',
            unitsAvailableForConsumption: 0,
            favoriteCount: 15420,
            itemRestrictions: [],
          },
        ];
    return {
      data: items,
      nextPageCursor: null,
      previousPageCursor: null,
      keyword: u.searchParams.get('keyword') || null,
    };
  }
  if (host === 'catalog.roblox.com' && p === '/v1/search/items') {
    return {
      data: [{ id: 1365767, itemType: 'Asset' }],
      nextPageCursor: null,
      previousPageCursor: null,
    };
  }
  if (host === 'friends.roblox.com' && /^\/v1\/users\/\d+\/friends$/.test(p)) {
    return {
      data: [
        { id: 156, name: 'builderman', displayName: 'builderman', hasVerifiedBadge: true },
        { id: 261, name: 'Shedletsky', displayName: 'Shedletsky', hasVerifiedBadge: true },
      ],
    };
  }
  if (host === 'users.roblox.com' && p === '/v1/users' && method === 'POST') {
    return { data: [{ id: 1, name: 'Roblox', displayName: 'Roblox' }] };
  }
  if (host === 'thumbnails.roblox.com' && p.startsWith('/v1/users/')) {
    const ids = (u.searchParams.get('userIds') || '261').split(',');
    return {
      data: ids.map((id) => ({
        targetId: Number(id),
        state: 'Completed',
        imageUrl: 'https://tr.rbxcdn.com/user-avatar-placeholder.png',
      })),
    };
  }
  if (host === 'avatar.roblox.com' && p === '/v1/avatar-inventory') {
    return {
      avatarInventoryItems: [
        { itemId: 1365767, itemName: 'Valkyrie Helm', itemCategory: { itemType: 1, itemSubType: 8 } },
        { itemId: 10472779, itemName: 'Bloxy Cola', itemCategory: { itemType: 1, itemSubType: 19 } },
        { itemId: 33668595, itemName: 'Floss Dance', itemCategory: { itemType: 1, itemSubType: 61 } },
      ],
    };
  }
  if (host === 'avatar.roblox.com' && /^\/v1\/recent-items\/[a-z]+\/list$/i.test(p)) {
    return {
      data: [{ id: 1365767, name: 'Valkyrie Helm', type: 'Asset', assetType: { id: 8, name: 'Hat' } }],
      total: 1,
    };
  }
  if (host === 'inventory.roblox.com' && /^\/v2\/users\/\d+\/inventory\/\d+$/.test(p)) {
    return {
      data: [
        { assetId: 1365767, assetName: 'Valkyrie Helm', serialNumber: null },
      ],
      nextPageCursor: null,
      previousPageCursor: null,
    };
  }
  if (host === 'catalog.roblox.com' && /^\/v1\/users\/\d+\/bundles$/.test(p)) {
    return { data: [], nextPageCursor: null, previousPageCursor: null };
  }
  if (host === 'privatemessages.roblox.com' && p === '/v1/announcements') {
    return {
      collection: [
        {
          id: 1,
          subject: 'Important account notice',
          body:
            'Hello! &lt;br&gt;&lt;br&gt; Your account is eligible for Robux credit for the items you purchased that can no longer be worn by your avatar.&lt;br&gt; To receive the credit please review and accept the terms of the: &lt;a href=&quot;https://www.roblox.com/modcreditagreement/957e398b-e2a0-49aa-aefe-c5a6ad22f3a2&quot;&gt;&lt;u&gt;Agreement&lt;/u&gt;&lt;/a&gt;.&lt;br&gt;&lt;br&gt; We apologize for any inconvenience.&lt;br&gt; &lt;br&gt; Sincerely, The Roblox Team',
          sender: { id: 1, name: 'Roblox', displayName: 'Roblox' },
          created: '2026-10-20T10:00:00Z',
          updated: '2026-10-20T10:00:00Z',
          isRead: false,
          isSystemMessage: true,
        },
      ],
      totalCollectionSize: 1,
    };
  }
  if (host === 'privatemessages.roblox.com' && p === '/v1/messages') {
    return {
      collection: [
        {
          id: 987654,
          subject: 'Welcome to ROBLOX',
          body: 'Thanks for joining!',
          sender: { id: 156, name: 'builderman', displayName: 'builder man' },
          recipient: { id: 261, name: 'Shedletsky', displayName: 'Shedletsky' },
          created: '2026-10-21T09:00:00Z',
          updated: '2026-10-21T09:00:00Z',
          isRead: false,
        },
      ],
      totalCollectionSize: 1,
      totalPages: 1,
      pageNumber: 0,
    };
  }
  if (host === 'economy.roblox.com' && p.endsWith('/currency')) return { robux: 1200 };
  if (host === 'economy.roblox.com' && /^\/v2\/assets\/\d+\/details$/.test(p)) {
    const id = Number(p.split('/')[3]);
    return {
      AssetId: id,
      TargetId: id,
      ProductId: id * 10,
      AssetTypeId: id === 10472779 ? 19 : 8,
      Name: id === 10472779 ? 'Bloxy Cola' : 'Valkyrie Helm',
      Description: 'Classic item',
      Creator: { Id: 1, CreatorTargetId: 1, Name: 'ROBLOX', CreatorType: 'User' },
      PriceInRobux: 500,
      IsForSale: true,
      Sales: 48291,
      Created: '2012-01-01T00:00:00Z',
      Updated: '2016-01-01T00:00:00Z',
    };
  }
  if (host === 'catalog.roblox.com' && p === '/v1/catalog/items/details') {
    const reqItems = Array.isArray(data?.items) ? data.items : [{ id: 1365767, itemType: 'Asset' }];
    return {
      data: reqItems.map((it) =>
        it.itemType === 'Bundle'
          ? {
              id: Number(it.id),
              itemType: 'Bundle',
              bundleType: 1,
              name: 'Korblox Deathspeaker',
              description: 'Classic bundle',
              creatorTargetId: 1,
              creatorType: 'User',
              creatorName: 'ROBLOX',
              price: 17000,
              unitsAvailableForConsumption: 0,
              favoriteCount: 92000,
              itemRestrictions: [],
            }
          : {
              id: Number(it.id),
              itemType: 'Asset',
              assetType: Number(it.id) === 10472779 ? 19 : 8,
              name: Number(it.id) === 10472779 ? 'Bloxy Cola' : 'Valkyrie Helm',
              description: 'Classic item',
              creatorTargetId: 1,
              creatorType: 'User',
              creatorName: 'ROBLOX',
              price: 500,
              // Real Roblox returns unitsAvailableForConsumption: 0 and omits isForSale & Sales!
              unitsAvailableForConsumption: 0,
              favoriteCount: 15420,
              itemRestrictions: [],
            }
      ),
    };
  }
  if (host === 'catalog.roblox.com' && /^\/v1\/bundles\/\d+\/details$/.test(p)) {
    const id = Number(p.split('/')[3]);
    return {
      id,
      name: 'Korblox Deathspeaker',
      description: 'Classic bundle',
      bundleType: 'BodyParts',
      items: [],
      creator: { id: 1, name: 'ROBLOX', type: 'User' },
      product: { id: id * 10, isForSale: true, priceInRobux: 17000 },
    };
  }
  if (host === 'apis.roblox.com' && /^\/game-passes\/v1\/game-passes\/\d+\/product-info$/.test(p)) {
    const id = Number(p.split('/')[4]);
    return {
      TargetId: id,
      ProductId: id * 10,
      AssetId: 0,
      AssetTypeId: 34,
      Name: 'VIP Game Pass',
      Description: 'VIP perks',
      Creator: { Id: 82471, CreatorTargetId: 82471, Name: 'Dued1', CreatorType: 'User' },
      PriceInRobux: 150,
      IsForSale: true,
      Sales: 9320,
      Created: '2018-05-01T00:00:00Z',
      Updated: '2020-05-01T00:00:00Z',
    };
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
assert.equal(win.document.documentElement.getAttribute('data-bs-theme'), 'dark');
assert.equal(win.document.documentElement.style.getPropertyValue('--white-color'), '#232527');
assert.ok(
  recordedApiCalls.some(
    (c) =>
      c.method === 'PATCH' &&
      c.url === 'https://accountsettings.roblox.com/v1/themes/user' &&
      c.data?.themeType === 'Dark'
  ),
  'Expected PATCH https://accountsettings.roblox.com/v1/themes/user when changing theme in /My/Account!'
);
console.log('  [OK] Theme changes exclusively in /My/Account, applies dark surface variables, and syncs via PATCH accountsettings.roblox.com/v1/themes/user');

const testRoutes = [
  '/?landing=1',
  '/home',
  '/games',
  '/games/192800/Work-at-a-Pizza-Place',
  '/catalog',
  '/catalog/1365767/Valkyrie-Helm',
  '/bundles/192/Korblox-Deathspeaker',
  '/game-pass/1234/VIP-Game-Pass',
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
    if (route === '/catalog/1365767/Valkyrie-Helm') {
      await new Promise((r) => setTimeout(r, 80));
      assert.ok(
        !nextNode.textContent.includes('This item is not currently for sale'),
        `On-sale item falsely marked off-sale on [${era}] ${route}`
      );
      assert.ok(
        nextNode.textContent.includes('48,291'),
        `Expected live economy v2 Sales count (48,291) on [${era}] ${route}; got: ${nextNode.textContent.slice(0, 300)}`
      );
    }
    if (route === '/catalog') {
      await new Promise((r) => setTimeout(r, 80));
      assert.ok(
        nextNode.textContent.includes('Featured Items on ROBLOX'),
        `Expected Featured heading on [${era}] /catalog`
      );
      assert.ok(
        nextNode.textContent.includes('Recent items by ROBLOX'),
        `Expected Featured = Recent items by Roblox on [${era}] /catalog`
      );
      assert.ok(
        nextNode.textContent.includes('Emotes') &&
          nextNode.textContent.includes('Body Parts') &&
          nextNode.textContent.includes('Clothing') &&
          nextNode.textContent.includes('Gear'),
        `Expected working catalog category navigation (Emotes / Body Parts / Clothing / Gear) on [${era}] /catalog`
      );
      assert.ok(
        win.document.getElementById('catalog_genre_fitler_13'),
        `Expected Genre filter checkboxes on [${era}] /catalog`
      );

      if (era === '2019') {
        // Click the "Emotes" category entry and verify the catalog actually re-queries
        const emotesEntry = [...win.document.querySelectorAll('p')].find(
          (el) => el.textContent.trim() === 'Emotes'
        );
        assert.ok(emotesEntry, 'Expected an Emotes entry in the catalog category navigation');
        emotesEntry.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
        await new Promise((r) => setTimeout(r, 120));
        assert.ok(
          win.document.getElementById('__next').textContent.includes('Floss Dance'),
          'Expected live Emotes results after clicking the Emotes catalog category'
        );
        // Reset back to Featured for the remaining routes
        const featuredEntry = [...win.document.querySelectorAll('p')].find(
          (el) => el.textContent.trim() === 'Featured'
        );
        if (featuredEntry) {
          featuredEntry.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
          await new Promise((r) => setTimeout(r, 80));
        }
      }
    }
    if (route === '/My/Messages') {
      await new Promise((r) => setTimeout(r, 80));
      assert.ok(
        nextNode.textContent.includes('Welcome to ROBLOX') ||
          nextNode.textContent.includes('Important account notice'),
        `Expected inbox messages to render on [${era}] /My/Messages; got: ${nextNode.textContent.slice(0, 300)}`
      );

      if (era === '2019') {
        // Open Notifications, then open the announcement and verify the escaped-HTML
        // body is sanitized into real markup with a working agreement link.
        const notifTab = [...win.document.querySelectorAll('p')].find((el) =>
          el.textContent.trim().startsWith('Notifications')
        );
        assert.ok(notifTab, 'Expected a Notifications tab on /My/Messages');
        notifTab.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
        await new Promise((r) => setTimeout(r, 120));

        const messageRow = win.document.querySelector('[class*="messageRow"]');
        assert.ok(messageRow, 'Expected an announcement message row in Notifications');
        messageRow.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
        await new Promise((r) => setTimeout(r, 80));

        const agreementLink = win.document.querySelector('a[href*="/modcreditagreement/"]');
        assert.ok(
          agreementLink,
          'Expected the escaped-HTML announcement to render a clickable modcreditagreement link'
        );
        assert.ok(
          win.document.getElementById('__next').textContent.includes('Sincerely, The Roblox Team'),
          'Expected the announcement body text to render unescaped'
        );
        const backBtn = [...win.document.querySelectorAll('button')].find(
          (el) => el.textContent.trim() === 'Back'
        );
        if (backBtn) backBtn.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
        await new Promise((r) => setTimeout(r, 60));
      }
    }
    if (route === '/users/261/friends') {
      await new Promise((r) => setTimeout(r, 80));
      assert.ok(
        nextNode.textContent.includes('builderman'),
        `Expected friend names to render on [${era}] /users/261/friends`
      );
    }
    if (route === '/My/Avatar' && era === '2019') {
      await new Promise((r) => setTimeout(r, 120));
      assert.ok(
        !nextNode.textContent.includes('You do not have any items here.'),
        'Expected the avatar editor Recent list to load owned items (not an empty list)'
      );
      const clothingTab = [...win.document.querySelectorAll('div')].find(
        (el) => el.className && /vTab/.test(el.className) && el.textContent.trim() === 'Clothing'
      );
      assert.ok(clothingTab, 'Expected a Clothing tab in the avatar editor');
      clothingTab.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 60));
      const hatEntry = [...win.document.querySelectorAll('div')].find(
        (el) => el.textContent.trim() === 'Hat' && el.className && /submenuButton/.test(el.className)
      );
      assert.ok(hatEntry, 'Expected a Hat sub-item inside the Clothing avatar editor submenu');
      hatEntry.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 150));
      assert.ok(
        win.document.getElementById('__next').textContent.includes('Valkyrie Helm'),
        'Expected avatar editor Hats list to show owned inventory items'
      );
    }
  }
  console.log(`  [OK] Verified all ${testRoutes.length} routes cleanly in ${era} Era!`);
}

assert.deepEqual(runtimeErrors, [], `Runtime errors:\n${runtimeErrors.join('\n')}`);
dom.window.close();

console.log('\n✅ ALL EXTENSION VERIFICATIONS PASSED WITH ZERO ERRORS!');
process.exit(0);
