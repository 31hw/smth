import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

import { parseRolimonsPayload, normalizeEntity } from '../js/core.js';
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
  globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
  try {
    Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
  } catch {
    /* node's navigator is read-only on some versions; clipboard is optional */
  }
  return dom;
}

function asset({ id, name, created, price = 25, limited = false, offSale = false, creator = 'Roblox' }) {
  return normalizeEntity(
    {
      AssetId: id,
      Name: name,
      Created: created,
      PriceInRobux: offSale ? null : price,
      IsLimited: limited,
      IsForSale: !offSale,
      AssetTypeId: 8,
      Creator: { Name: creator },
    },
    'test',
  );
}

function fakeApi(pool, rolimonsIds = []) {
  const byId = new Map(pool.map((entity) => [entity.id, entity]));
  return {
    async searchCatalog() {
      return { data: pool, url: 'test' };
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

async function rollAndWait(dom, button) {
  button.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  const result = dom.window.document.querySelector('#result');
  for (let i = 0; i < 400 && !result.classList.contains('has-item'); i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 15));
  }
  return result;
}

test('page boots in demo mode and marks itself', () => {
  const dom = installDom();
  const handle = boot({ params: new URLSearchParams('demo=1') });
  assert.equal(handle.demo, true);
  assert.equal(dom.window.document.documentElement.dataset.mode, 'demo');
  assert.equal(dom.window.document.querySelector('#mode-badge').textContent, 'Demo data');
  assert.equal(dom.window.document.querySelector('#result').classList.contains('has-item'), false);
});

test('rolling renders title, thumbnail, links and history', async () => {
  const dom = installDom();
  boot({ params: new URLSearchParams('') , api: fakeApi([
    asset({ id: 42, name: 'Limited Thing', created: '2015-01-01T00:00:00Z', limited: true }),
    asset({ id: 43, name: 'Offsale Thing', created: '2015-01-01T00:00:00Z', offSale: true }),
    asset({ id: 44, name: 'Perfectly Normal Cap', created: '2013-05-05T00:00:00Z' }),
  ]) });

  const result = await rollAndWait(dom, dom.window.document.querySelector('#roll-form'));
  assert.equal(result.classList.contains('has-item'), true);

  const doc = dom.window.document;
  assert.equal(doc.querySelector('#item-title').textContent, 'Perfectly Normal Cap');
  assert.equal(doc.querySelector('#item-year').textContent, '2013');
  assert.equal(doc.querySelector('#item-price').textContent, 'R$ 25');
  assert.match(doc.querySelector('#item-thumb').getAttribute('src'), /assetId=44/);
  assert.equal(doc.querySelector('#item-rolimons').getAttribute('href'), 'https://www.rolimons.com/item/44');
  assert.equal(doc.querySelector('#item-roblox').getAttribute('href'), 'https://www.roblox.com/catalog/44');
  assert.match(doc.querySelector('#item-qualify').textContent, /2013 or earlier/);
  // not in the (empty) Rolimons list -> no dead Rolimons link
  assert.equal(doc.querySelector('#item-rolimons').hidden, true);
  assert.equal(doc.querySelector('#tracked-pill').hidden, true);
  assert.ok(doc.querySelector('#item-roblox').classList.contains('primary-link'));

  const history = doc.querySelectorAll('#history-list li');
  assert.equal(history.length, 1);
  assert.match(history[0].textContent, /Perfectly Normal Cap/);
  assert.equal(doc.querySelector('#history-count').textContent, '1');
  assert.ok(doc.querySelector('#log').textContent.length > 0, 'log should explain rejections');
});

test('hidden pills and links really are hidden (CSS regression)', () => {
  const dom = installDom();
  const doc = dom.window.document;
  const style = doc.createElement('style');
  style.textContent = css;
  doc.head.append(style);

  // .pill / .button-link set display, which would beat the UA [hidden] rule
  const pill = doc.querySelector('#tracked-pill');
  const rolimonsLink = doc.querySelector('#item-rolimons');
  rolimonsLink.hidden = true;
  assert.equal(dom.window.getComputedStyle(pill).display, 'none');
  assert.equal(dom.window.getComputedStyle(rolimonsLink).display, 'none');
  pill.hidden = false;
  assert.notEqual(dom.window.getComputedStyle(pill).display, 'none');
});

test('items Rolimons tracks get the badge and a working Rolimons link', async () => {
  const dom = installDom();
  boot({
    params: new URLSearchParams(''),
    api: fakeApi([asset({ id: 77, name: 'Rolimons Known Cap', created: '2016-06-06T00:00:00Z' })], [77]),
  });

  await rollAndWait(dom, dom.window.document.querySelector('#roll-form'));
  const doc = dom.window.document;
  assert.equal(doc.querySelector('#item-title').textContent, 'Rolimons Known Cap');
  assert.equal(doc.querySelector('#tracked-pill').hidden, false);
  assert.equal(doc.querySelector('#item-rolimons').hidden, false);
  assert.equal(doc.querySelector('#item-rolimons').getAttribute('href'), 'https://www.rolimons.com/item/77');
});

test('real demo API end-to-end: roll, then roll again', async () => {
  const dom = installDom();
  boot({ params: new URLSearchParams('demo=1') });
  const doc = dom.window.document;

  await rollAndWait(dom, doc.querySelector('#roll-form'));
  assert.equal(doc.querySelector('#result').classList.contains('has-item'), true);
  const firstTitle = doc.querySelector('#item-title').textContent;
  assert.ok(firstTitle && firstTitle !== '—');
  assert.match(doc.querySelector('#item-thumb').getAttribute('src'), /^data:image\/svg\+xml/);
  assert.equal(doc.querySelector('#source-pill').textContent, 'demo');

  doc.querySelector('#again').click();
  await new Promise((resolve) => setTimeout(resolve, 60));
  for (let i = 0; i < 400 && doc.querySelectorAll('#history-list li').length < 2; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 15));
  }
  assert.ok(doc.querySelectorAll('#history-list li').length >= 1);
  assert.ok(doc.querySelector('#history-count').textContent !== '0');
});

test('failed roll shows an error and does not fake a result', async () => {
  const dom = installDom();
  boot({
    params: new URLSearchParams(''),
    api: fakeApi([asset({ id: 50, name: 'Too New', created: '2024-01-01T00:00:00Z' })]),
  });

  const result = await rollAndWait(dom, dom.window.document.querySelector('#roll-form'));
  const doc = dom.window.document;
  assert.equal(result.classList.contains('has-item'), false);
  assert.equal(doc.querySelector('#error').hidden, false);
  assert.match(doc.querySelector('#error-text').textContent, /No matching item/);
  assert.equal(doc.querySelectorAll('#history-list li').length, 0);
});

test('options persist to localStorage', () => {
  const dom = installDom();
  boot({ params: new URLSearchParams('') });
  const doc = dom.window.document;
  const year = doc.querySelector('#year');
  const mode = doc.querySelector('#year-mode');
  mode.value = 'exactly';
  year.value = '2015';
  year.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  mode.dispatchEvent(new dom.window.Event('change', { bubbles: true }));

  const saved = JSON.parse(dom.window.localStorage.getItem('rollimons:options:v1'));
  assert.equal(saved.yearMode, 'exactly');
  assert.equal(saved.year, 2015);
});
