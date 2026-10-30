import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_OPTIONS, normalizeEntity, parseRolimonsPayload } from '../js/core.js';
import { rejectionSummary, roll } from '../js/roll.js';

function asset({ id, name, created, price = 25, limited = false, offSale = false, assetTypeId = 8, creator = 'Roblox' }) {
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

const GOOD = asset({ id: 1001, name: 'Old Baseball Cap', created: '2009-04-01T00:00:00Z' });

const POOL = [
  asset({ id: 1, name: 'Limited Crown', created: '2016-01-01T00:00:00Z', limited: true, price: 5000 }),
  asset({ id: 2, name: 'Offsale Hoodie', created: '2015-01-01T00:00:00Z', offSale: true }),
  asset({ id: 3, name: 'Brand New Shiny Thing', created: '2023-08-08T00:00:00Z' }),
  asset({ id: 4, name: 'Background Music', created: '2012-01-01T00:00:00Z', assetTypeId: 3 }),
  GOOD,
  asset({ id: 1002, name: 'Also Fine Hat', created: '2018-09-09T00:00:00Z' }),
];

function makeApi({ pool = POOL, rolimons = [], failDetails = false, catalogBatches = 2 } = {}) {
  const state = { detailsCalls: [], catalogCalls: 0, rolimonsCalls: 0 };
  const byId = new Map(pool.map((entity) => [entity.id, entity]));

  return {
    state,
    async searchCatalog() {
      state.catalogCalls += 1;
      if (state.catalogCalls > catalogBatches) return { data: [], url: 'test' };
      return { data: pool, url: 'test' };
    },
    async getAssetDetails(id) {
      state.detailsCalls.push(id);
      if (failDetails && id === GOOD.id) throw new Error('blocked');
      const entity = byId.get(Number(id));
      if (!entity) throw new Error('not found');
      return { entity };
    },
    async rolimonsItems() {
      state.rolimonsCalls += 1;
      return parseRolimonsPayload({ items: rolimons });
    },
    sampleIds({ count = 4 } = {}) {
      return Array.from({ length: count }, (_, i) => 900 + i);
    },
    async sleep() {},
  };
}

test('roll returns a genuinely eligible item and never a limited', async () => {
  const api = makeApi({ catalogBatches: 1 });
  const result = await roll({ api, options: { ...DEFAULT_OPTIONS, year: 2019 } });

  assert.equal(result.ok, true);
  assert.equal(result.item.isLimited, false);
  assert.match(result.item.title, /Cap|Hat/);
  assert.ok(result.item.thumbnail.includes('asset-thumbnail'));
  assert.ok(result.item.rolimonsUrl.startsWith('https://www.rolimons.com/item/'));
  assert.ok(['Cap', 'Hat'].some((word) => result.item.title.includes(word)));
  assert.ok(result.stats.rejected.limited >= 1, 'limited candidate should be rejected');
  assert.ok(result.stats.rejected['off-sale'] >= 1, 'off-sale candidate should be rejected');
  assert.ok(result.stats.rejected['too-new'] >= 1, 'too-new candidate should be rejected');
});

test('roll only ever returns items at or before the cutoff year', async () => {
  const api = makeApi({ catalogBatches: 1 });
  const result = await roll({ api, options: { ...DEFAULT_OPTIONS, year: 2019 } });
  assert.equal(result.ok, true);
  assert.ok(result.item.year <= 2019);
  assert.equal(result.item.isLimited, false);
});

test('exactly mode only accepts the requested year', async () => {
  const api = makeApi({ catalogBatches: 1 });
  const result = await roll({ api, options: { ...DEFAULT_OPTIONS, yearMode: 'exactly', year: 2018 } });
  assert.equal(result.ok, true);
  assert.equal(result.item.year, 2018);
});

test('exactly mode reports failure instead of faking a match', async () => {
  const api = makeApi({
    pool: [asset({ id: 7, name: 'Only A 2020 Hat', created: '2020-02-02T00:00:00Z' })],
    catalogBatches: 1,
  });
  const result = await roll({ api, options: { ...DEFAULT_OPTIONS, yearMode: 'exactly', year: 2019 } });
  assert.equal(result.ok, false);
  assert.equal(result.item, null);
  assert.match(result.message, /No matching item/);
  assert.ok(result.stats.rejected['not-exact-year'] >= 1);
});

test('robloxCreatedOnly filters community uploads', async () => {
  const api = makeApi({
    pool: [
      asset({ id: 21, name: 'User Hat', created: '2015-01-01T00:00:00Z', creator: 'CoolUser' }),
      asset({ id: 22, name: 'Roblox Hat', created: '2015-01-01T00:00:00Z', creator: 'Roblox' }),
    ],
    catalogBatches: 1,
  });
  const result = await roll({ api, options: { ...DEFAULT_OPTIONS, robloxCreatedOnly: true } });
  assert.equal(result.ok, true);
  assert.equal(result.item.id, 22);
});

test('rolimons-only mode verifies Rolimons ids and can succeed there', async () => {
  const api = makeApi({
    pool: [asset({ id: 4242, name: 'Rolimons Verified Fedora', created: '2013-03-03T00:00:00Z' })],
    rolimons: [[4242, 'Rolimons Verified Fedora', 'RVF', 0, 0, 0, 0, 0, 0, 0, 0]],
    catalogBatches: 0,
  });
  const result = await roll({ api, options: { ...DEFAULT_OPTIONS, rolimonsOnly: true } });
  assert.equal(result.ok, true);
  assert.equal(result.item.trackedOnRolimons, true);
  assert.equal(result.item.source, 'rolimons');
});

test('roll survives total API failure with a clear message', async () => {
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
  const result = await roll({ api });
  assert.equal(result.ok, false);
  assert.match(result.message, /No matching item/);
  assert.ok(result.stats.rejected['no-details'] >= 3);
});

test('progress and logs are reported while rolling', async () => {
  const api = makeApi({ catalogBatches: 1 });
  const progress = [];
  const logs = [];
  await roll({ api, onProgress: (s) => progress.push(s), onLog: (m) => logs.push(m) });
  assert.ok(progress.length > 0);
  assert.ok(progress.at(-1).seen > 0);
  assert.ok(logs.some((line) => line.includes('✓')));
});

test('rejectionSummary sorts most common reason first', () => {
  const summary = rejectionSummary({ rejected: { 'no-details': 2, limited: 5, 'off-sale': 3 } });
  assert.deepEqual(summary[0], ['limited', 5]);
});
