import test from 'node:test';
import assert from 'node:assert/strict';

import { ALLOWED_ASSET_TYPE_IDS, DEFAULT_OPTIONS, MAX_YEAR, MIN_YEAR, normalizeEntity, parseRolimonsPayload } from '../js/core.js';
import { SEARCH_CATEGORIES, rejectionSummary, roll } from '../js/roll.js';

const OPTIONS = {
  ...DEFAULT_OPTIONS,
  minYear: MIN_YEAR,
  maxYear: MAX_YEAR,
  robloxCreatedOnly: true,
  allowedAssetTypes: ALLOWED_ASSET_TYPE_IDS,
};

function asset({
  id,
  name,
  created,
  price = 100,
  limited = false,
  offSale = false,
  assetTypeId = 19,
  creator = 'Roblox',
}) {
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
    'economy',
  );
}

const GOOD = asset({ id: 1001, name: 'Linked Sword', created: '2008-06-11T00:00:00Z' });

const POOL = [
  asset({ id: 1, name: 'Limited Crown', created: '2015-01-01T00:00:00Z', assetTypeId: 8, limited: true, price: 5000 }),
  asset({ id: 2, name: 'Offsale Hoodie', created: '2015-01-01T00:00:00Z', assetTypeId: 8, offSale: true }),
  asset({ id: 3, name: 'Too New Cap', created: '2021-08-08T00:00:00Z', assetTypeId: 8 }),
  asset({ id: 4, name: 'Too Old Cap', created: '2007-08-08T00:00:00Z', assetTypeId: 8 }),
  asset({ id: 5, name: 'Striped Shirt', created: '2015-01-01T00:00:00Z', assetTypeId: 11 }),
  asset({ id: 6, name: 'Community Gear', created: '2015-01-01T00:00:00Z', assetTypeId: 19, creator: 'SomeBuilder' }),
  GOOD,
  asset({ id: 1002, name: 'Chill Face', created: '2019-10-30T00:00:00Z', assetTypeId: 18 }),
];

function makeApi({ pool = POOL, rolimons = [], catalogBatches = 2 } = {}) {
  const state = { detailsCalls: [], catalogCalls: 0, categories: [] };
  const byId = new Map(pool.map((entity) => [entity.id, entity]));

  return {
    state,
    async searchCatalog(options = {}) {
      state.catalogCalls += 1;
      state.categories.push(options.category);
      if (state.catalogCalls > catalogBatches) return { data: [], url: 'test' };
      return { data: pool, url: 'test' };
    },
    async getAssetDetails(id) {
      state.detailsCalls.push(id);
      const entity = byId.get(Number(id));
      if (!entity) throw new Error('not found');
      return { entity };
    },
    async rolimonsItems() {
      return parseRolimonsPayload({ items: rolimons });
    },
    sampleIds({ count = 4 } = {}) {
      return Array.from({ length: count }, (_, i) => 900 + i);
    },
    async sleep() {},
  };
}

test('a roll only ever returns Roblox-made gear/face/accessory from 2008–2019', async () => {
  const api = makeApi({ catalogBatches: 1 });
  const result = await roll({ api, options: OPTIONS });

  assert.equal(result.ok, true);
  const item = result.item;
  assert.ok([19, 18, 8, 41, 42, 43, 44, 45, 46, 47].includes(item.assetTypeId), `got type ${item.assetTypeId}`);
  assert.ok(item.year >= 2008 && item.year <= 2019, `got year ${item.year}`);
  assert.equal(item.creator, 'Roblox');
  assert.equal(item.isLimited, false);
  assert.match(item.thumbnail, /asset-thumbnail/);
  assert.match(item.title, /Linked Sword|Chill Face/);
});

test('every rule actually fires on the decoys', async () => {
  const api = makeApi({ catalogBatches: 1 });
  const result = await roll({ api, options: OPTIONS });
  assert.equal(result.ok, true);

  const rejected = result.stats.rejected;
  assert.ok(rejected.limited >= 1, 'limited decoy');
  assert.ok(rejected['off-sale'] >= 1, 'off sale decoy');
  assert.ok(rejected['too-new'] >= 1, '2021 decoy');
  assert.ok(rejected['too-old'] >= 1, '2007 decoy');
  assert.ok(rejected['not-allowed-type'] >= 1, 'shirt decoy');
  assert.ok(rejected['not-roblox'] >= 1, 'community decoy');
});

test('the catalog is searched per category (gear, face, accessories)', async () => {
  // empty catalog: every round is walked, so the category order is visible
  const api = makeApi({ catalogBatches: 0 });
  await roll({ api, options: OPTIONS });
  assert.deepEqual(SEARCH_CATEGORIES, [2, 4, 5, 11]);
  assert.deepEqual(api.state.categories.slice(0, 4), [2, 4, 5, 11]);
  assert.ok(api.state.categories.every((category) => SEARCH_CATEGORIES.includes(category)));
});

test('rolimons ids are verified too, and can supply the answer', async () => {
  const api = makeApi({
    pool: [asset({ id: 4242, name: 'Rolimons Gear', created: '2013-03-03T00:00:00Z', assetTypeId: 19 })],
    rolimons: [[4242, 'Rolimons Gear', 'RG', 0, 0, 0, 0, 0, 0, 0, 0]],
    catalogBatches: 0,
  });
  const result = await roll({ api, options: OPTIONS });
  assert.equal(result.ok, true);
  assert.equal(result.item.trackedOnRolimons, true);
  assert.equal(result.item.source, 'rolimons');
  assert.equal(result.item.href, 'https://www.rolimons.com/item/4242');
});

test('nothing eligible means an honest failure, not a fallback item', async () => {
  const api = makeApi({
    pool: [asset({ id: 7, name: 'Only A 2021 Hat', created: '2021-02-02T00:00:00Z', assetTypeId: 8 })],
    catalogBatches: 1,
  });
  const result = await roll({ api, options: OPTIONS });
  assert.equal(result.ok, false);
  assert.equal(result.item, null);
  assert.match(result.message, /No item matched/);
});

test('total API failure still ends with a clear message', async () => {
  const api = {
    async searchCatalog() {
      throw new Error('CORS blocked');
    },
    async rolimonsItems() {
      throw new Error('CORS blocked');
    },
    async getAssetDetails() {
      throw new Error('CORS blocked');
    },
    sampleIds: () => [1, 2, 3],
    async sleep() {},
  };
  const result = await roll({ api, options: OPTIONS });
  assert.equal(result.ok, false);
  assert.match(result.message, /No item matched/);
  assert.ok(result.stats.rejected['no-details'] >= 3);
});

test('progress is reported while rolling', async () => {
  const api = makeApi({ catalogBatches: 1 });
  const progress = [];
  const logs = [];
  await roll({ api, options: OPTIONS, onProgress: (s) => progress.push(s), onLog: (m) => logs.push(m) });
  assert.ok(progress.length > 0);
  assert.ok(progress.at(-1).seen > 0);
  assert.ok(logs.some((line) => line.includes('Linked Sword')));
});

test('rejectionSummary sorts most common reason first', () => {
  const summary = rejectionSummary({ rejected: { 'no-details': 2, limited: 5, 'off-sale': 3 } });
  assert.deepEqual(summary[0], ['limited', 5]);
});
