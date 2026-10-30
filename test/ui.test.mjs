import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

import { normalizeEntity, parseRolimonsPayload } from '../js/core.js';
import { boot } from '../js/app.js';

const html = await readFile(fileURLToPath(new URL('../index.html', import.meta.url)), 'utf8');
const css = await readFile(fileURLToPath(new URL('../styles.css', import.meta.url)), 'utf8');

function installDom() {
  const dom = new JSDOM(html, {
    url: 'http://localhost/?demo=1',
    pretendToBeVisual: true,
    runScripts: 'outside-only',
  });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.localStorage = dom.window.localStorage;
  globalThis.location = dom.window.location;
  globalThis.Event = dom.window.Event;
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.Node = dom.window.Node;
  return dom;
}

function asset({ id, name, created, price = 100, limited = false, offSale = false, assetTypeId = 19, creator = 'Roblox' }) {
  return normalizeEntity(
    {
      AssetId: id,
      Name: name,
      Created: created,
      PriceInRobux: offSale ? null : price,
      IsLimited: limited,
      IsForSale: !offSale && price > 0,
      AssetTypeId: assetTypeId,
      Creator: { Name: creator },
    },
    'test',
  );
}

function fakeApi(pool, rolimonsIds = []) {
  const byId = new Map(pool.map((entity) => [entity.id, entity]));
  let search = 0;
  return {
    async searchCatalog() {
      // the pipeline asks for one page and picks one item from it
      const row = pool[Math.min(search++, pool.length - 1)];
      return { data: row ? [row] : [], url: 'test' };
    },
    async getAssetDetails(id) {
      const entity = byId.get(Number(id));
      if (!entity) throw new Error('nope');
      return { entity };
    },
    async rolimonsItems() {
      return parseRolimonsPayload({
        items: rolimonsIds.map((id) => [id, `Tracked ${id}`, 'TR', 0, 0, 0, 0, 0, 0, 0, 0]),
      });
    },
    sampleIds: () => [],
    async sleep() {},
  };
}

async function clickRoll(dom) {
  const button = dom.window.document.querySelector('#roll');
  button.click();
  for (let i = 0; i < 900 && button.disabled; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

test('the page shows only a heading, a roll button and an empty item area', () => {
  const dom = installDom();
  const doc = dom.window.document;

  assert.equal(doc.querySelectorAll('button').length, 1);
  assert.equal(doc.querySelector('#roll').textContent.trim(), 'Roll');
  assert.equal(doc.querySelector('#item').classList.contains('has-item'), false);
  assert.equal(doc.querySelector('#item-title').textContent, '');
  assert.equal(doc.querySelector('#item-year').textContent, '');
  assert.equal(doc.querySelector('#item-rolimons').textContent, '');
  assert.equal(doc.querySelector('#item-thumb').getAttribute('src'), null);
  assert.equal(doc.querySelector('#status').hidden, true);

  // nothing about price, creator, ids, history, options or logs
  const text = doc.body.textContent.toLowerCase();
  for (const banned of ['price', 'creator', 'asset id', 'history', 'limited', 'filter']) {
    assert.equal(text.includes(banned), false, `page should not mention "${banned}"`);
  }
  assert.equal(doc.querySelectorAll('input, select, ol, ul, dl, details').length, 0);
});

test('a roll renders the name, the picture, the year and the Rolimons link', async () => {
  const dom = installDom();
  boot({
    params: new URLSearchParams(''),
    api: fakeApi([asset({ id: 44, name: 'Linked Sword', created: '2010-05-05T00:00:00Z' })]),
  });

  await clickRoll(dom);
  const doc = dom.window.document;

  assert.equal(doc.querySelector('#item').classList.contains('has-item'), true);
  assert.equal(doc.querySelector('#item-title').textContent, 'Linked Sword');
  assert.equal(doc.querySelector('#item-year').textContent, '(2010)');
  assert.match(doc.querySelector('#item-thumb').getAttribute('src'), /assetId=44/);
  assert.equal(doc.querySelector('#item-thumb').alt, 'Linked Sword');
  assert.equal(doc.querySelector('#status').hidden, true);
  assert.equal(doc.querySelector('#roll').disabled, false);

  // the Rolimons address sits under the year and opens in a new tab
  const rolimons = doc.querySelector('#item-rolimons');
  assert.equal(rolimons.textContent, 'www.rolimons.com/item/44');
  assert.equal(rolimons.getAttribute('href'), 'https://www.rolimons.com/item/44');
  assert.equal(rolimons.getAttribute('target'), '_blank');
  assert.match(rolimons.getAttribute('rel'), /noopener/);
});

test('the picture is never left hidden (regression: load fired before the handler)', async () => {
  const dom = installDom();
  boot({
    params: new URLSearchParams(''),
    api: fakeApi([asset({ id: 48, name: 'Star Hair', created: '2017-01-01T00:00:00Z', assetTypeId: 41 })]),
  });
  await clickRoll(dom);
  const doc = dom.window.document;
  const thumb = doc.querySelector('#item-thumb');

  // an instantly-loading image (cached / inline SVG) must still be visible
  assert.notEqual(thumb.getAttribute('hidden'), '');
  assert.equal(thumb.hasAttribute('hidden'), false);
  assert.match(thumb.getAttribute('src'), /assetId=48/);

  // and a broken image degrades to a grey square instead of disappearing
  thumb.onerror?.();
  assert.equal(thumb.hasAttribute('hidden'), false);
  assert.match(thumb.getAttribute('src'), /^data:image\/svg\+xml/);
});

test('both links open in a new tab', async () => {
  const dom = installDom();
  boot({
    params: new URLSearchParams(''),
    api: fakeApi([asset({ id: 49, name: 'Classic Fedora', created: '2012-01-01T00:00:00Z', assetTypeId: 8 })]),
  });
  await clickRoll(dom);
  const doc = dom.window.document;
  for (const selector of ['#item-link', '#item-rolimons']) {
    const el = doc.querySelector(selector);
    assert.equal(el.getAttribute('target'), '_blank', selector);
    assert.match(el.getAttribute('rel'), /(noopener|noreferrer)/, selector);
  }
});

test('the picture links to a page that exists', async () => {
  const dom = installDom();
  // not tracked by Rolimons -> link the Roblox catalog, never a 404
  boot({
    params: new URLSearchParams(''),
    api: fakeApi([asset({ id: 45, name: 'Chill Face', created: '2015-01-01T00:00:00Z', assetTypeId: 18 })]),
  });
  await clickRoll(dom);
  let doc = dom.window.document;
  assert.equal(doc.querySelector('#item-link').getAttribute('href'), 'https://www.roblox.com/catalog/45');
  assert.equal(doc.querySelector('#item-year').textContent, '(2015)');

  // tracked by Rolimons -> link its item page instead
  const dom2 = installDom();
  boot({
    params: new URLSearchParams(''),
    api: fakeApi([asset({ id: 46, name: 'Classic Fedora', created: '2012-01-01T00:00:00Z', assetTypeId: 8 })], [46]),
  });
  await clickRoll(dom2);
  doc = dom2.window.document;
  assert.equal(doc.querySelector('#item-link').getAttribute('href'), 'https://www.rolimons.com/item/46');
});

test('rolling again replaces the previous item', async () => {
  const dom = installDom();
  let call = 0;
  const pool = [
    asset({ id: 100, name: 'First Item', created: '2009-01-01T00:00:00Z' }),
    asset({ id: 101, name: 'Second Item', created: '2018-01-01T00:00:00Z' }),
  ];
  boot({
    params: new URLSearchParams(''),
    api: {
      async searchCatalog() {
        const pick = [pool[call % 2]];
        call += 1;
        return { data: pick, url: 'test' };
      },
      async getAssetDetails(id) {
        const entity = pool.find((entry) => entry.id === Number(id));
        if (!entity) throw new Error('nope');
        return { entity };
      },
      async rolimonsItems() {
        return [];
      },
      sampleIds: () => [],
      async sleep() {},
    },
  });

  await clickRoll(dom);
  assert.equal(dom.window.document.querySelector('#item-title').textContent, 'First Item');
  await clickRoll(dom);
  assert.equal(dom.window.document.querySelector('#item-title').textContent, 'Second Item');
  assert.equal(dom.window.document.querySelector('#item-year').textContent, '(2018)');
});

test('nothing eligible means a quiet message, no fake item', async () => {
  const dom = installDom();
  boot({
    params: new URLSearchParams(''),
    api: fakeApi([
      asset({ id: 60, name: 'Limited Crown', created: '2015-01-01T00:00:00Z', limited: true, assetTypeId: 8 }),
      asset({ id: 61, name: 'Offsale Hat', created: '2015-01-01T00:00:00Z', offSale: true, assetTypeId: 8 }),
      asset({ id: 62, name: 'Shirt', created: '2015-01-01T00:00:00Z', assetTypeId: 11 }),
      asset({ id: 63, name: '2022 Cap', created: '2022-01-01T00:00:00Z', assetTypeId: 8 }),
      asset({ id: 64, name: 'Community Hat', created: '2015-01-01T00:00:00Z', assetTypeId: 8, creator: 'Builder' }),
    ]),
  });

  await clickRoll(dom);
  const doc = dom.window.document;
  assert.equal(doc.querySelector('#item').classList.contains('has-item'), false);
  assert.equal(doc.querySelector('#item-title').textContent, '');
  assert.equal(doc.querySelector('#status').hidden, false);
  assert.match(doc.querySelector('#status').textContent, /No item matched/);
  assert.equal(doc.querySelector('#roll').disabled, false);
});

test('when nothing answers at all it just says "Unavailable" — no stand-in item', async () => {
  const dom = installDom();
  boot({
    params: new URLSearchParams(''),
    api: {
      async searchCatalog() {
        throw new Error('Failed to fetch');
      },
      async getAssetDetails() {
        throw new Error('Failed to fetch');
      },
      async rolimonsItems() {
        throw new Error('Failed to fetch');
      },
      sampleIds: () => [1, 2, 3],
      async sleep() {},
    },
  });

  await clickRoll(dom);
  const doc = dom.window.document;
  assert.equal(doc.querySelector('#status').textContent, 'Unavailable');
  assert.equal(doc.querySelector('#item').classList.contains('has-item'), false);
  assert.equal(doc.querySelector('#item-title').textContent, '');
  assert.equal(doc.querySelector('#item-thumb').getAttribute('src'), null);
  assert.equal(doc.querySelector('#roll').disabled, false);
});

test('demo mode drives the real pipeline end to end', async () => {
  const dom = installDom();
  const handle = boot({ params: new URLSearchParams('demo=1') });
  assert.equal(handle.demo, true);

  await clickRoll(dom);
  const doc = dom.window.document;

  assert.equal(doc.querySelector('#item').classList.contains('has-item'), true);
  assert.ok(doc.querySelector('#item-title').textContent.length > 0);
  assert.match(doc.querySelector('#item-year').textContent, /^\((2008|2009|201[0-9])\)$/);
  assert.match(doc.querySelector('#item-rolimons').textContent, /^www\.rolimons\.com\/item\/\d+$/);
  assert.match(doc.querySelector('#item-thumb').getAttribute('src'), /^data:image\/svg\+xml/);
  assert.match(doc.querySelector('#item-link').getAttribute('href'), /^https:\/\/www\.(rolimons|roblox)\.com\//);
});

test('plain styling: no gradients, shadows or rounded neon anything', () => {
  const rules = css.replace(/\/\*[\s\S]*?\*\//g, ''); // comments may talk about them
  assert.doesNotMatch(rules, /gradient/i);
  assert.doesNotMatch(rules, /box-shadow/i);
  assert.doesNotMatch(rules, /text-shadow/i);
  assert.doesNotMatch(rules, /drop-shadow/i);
  assert.doesNotMatch(rules, /rgba?\(/i, 'keep it to plain hex colours');
});
