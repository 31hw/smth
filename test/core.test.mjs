import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildItemView,
  createdYear,
  evaluateEntity,
  formatRobux,
  normalizeEntity,
  orderRolimonsCandidates,
  parseRolimonsEntry,
  parseRolimonsPayload,
  qualificationSentence,
  rolimonsLooksLimited,
  rolimonsUrl,
  thumbnailUrl,
  DEFAULT_OPTIONS,
} from '../js/core.js';

const base = {
  id: 123,
  name: 'Test Cap',
  createdIso: '2015-06-01T00:00:00Z',
  year: 2015,
  price: 25,
  isForSale: true,
  isOffSale: false,
  limited: false,
  assetTypeId: 8,
  creatorName: 'Roblox',
  source: 'economy',
};

test('createdYear handles ISO strings, epochs and junk', () => {
  assert.equal(createdYear('2014-03-02T10:00:00Z'), 2014);
  assert.equal(createdYear('2019-12-31'), 2019);
  assert.equal(createdYear(new Date('2011-01-01T00:00:00Z')), 2011);
  assert.equal(createdYear(Date.UTC(2013, 4, 1)), 2013);
  assert.equal(createdYear(''), null);
  assert.equal(createdYear(null), null);
  assert.equal(createdYear('not a date'), null);
});

test('normalizeEntity reads Roblox economy details', () => {
  const entity = normalizeEntity(
    {
      AssetId: 555,
      Name: '  Blue Beanie ',
      Created: '2017-02-03T00:00:00Z',
      PriceInRobux: 15,
      IsLimited: false,
      IsForSale: true,
      AssetTypeId: 8,
      Creator: { Name: 'Roblox' },
    },
    'economy',
  );
  assert.equal(entity.id, 555);
  assert.equal(entity.name, 'Blue Beanie');
  assert.equal(entity.year, 2017);
  assert.equal(entity.price, 15);
  assert.equal(entity.creatorName, 'Roblox');
  assert.equal(entity.isOffSale, false);
});

test('normalizeEntity flags null price as off sale', () => {
  const entity = normalizeEntity({ AssetId: 1, Name: 'Gone', PriceInRobux: null, Created: '2012-01-01T00:00:00Z' });
  assert.equal(entity.isOffSale, true);
  assert.equal(entity.isForSale, false);
});

test('normalizeEntity returns null without an id', () => {
  assert.equal(normalizeEntity({ Name: 'x' }), null);
  assert.equal(normalizeEntity(null), null);
});

test('eligible item passes every rule', () => {
  const verdict = evaluateEntity(base, DEFAULT_OPTIONS);
  assert.equal(verdict.ok, true, verdict.reasons.join(','));
});

test('limiteds are always rejected', () => {
  const verdict = evaluateEntity({ ...base, limited: true }, DEFAULT_OPTIONS);
  assert.equal(verdict.ok, false);
  assert.ok(verdict.reasons.includes('limited'));
});

test('off sale items are always rejected (even when free)', () => {
  const offSale = evaluateEntity({ ...base, isOffSale: true, isForSale: false }, DEFAULT_OPTIONS);
  assert.equal(offSale.ok, false);
  assert.ok(offSale.reasons.includes('off-sale'));

  const freeNoSale = evaluateEntity({ ...base, price: 0, isForSale: false }, DEFAULT_OPTIONS);
  assert.equal(freeNoSale.ok, false);
  assert.ok(freeNoSale.reasons.includes('off-sale'));
});

test('items newer than the cutoff are rejected', () => {
  const verdict = evaluateEntity({ ...base, year: 2021, createdIso: '2021-04-04T00:00:00Z' }, { ...DEFAULT_OPTIONS, year: 2019 });
  assert.equal(verdict.ok, false);
  assert.ok(verdict.reasons.includes('too-new'));
});

test('exactly mode rejects other years but keeps the chosen one', () => {
  const opts = { ...DEFAULT_OPTIONS, yearMode: 'exactly', year: 2019 };
  assert.equal(evaluateEntity({ ...base, year: 2019 }, opts).ok, true);
  assert.equal(evaluateEntity({ ...base, year: 2018 }, opts).ok, false);
  assert.ok(evaluateEntity({ ...base, year: 2018 }, opts).reasons.includes('not-exact-year'));
});

test('unknown creation date is rejected rather than guessed', () => {
  const verdict = evaluateEntity({ ...base, year: null, createdIso: null }, DEFAULT_OPTIONS);
  assert.equal(verdict.ok, false);
  assert.ok(verdict.reasons.includes('unknown-created'));
});

test('audio and other non-wearables are rejected', () => {
  assert.equal(evaluateEntity({ ...base, assetTypeId: 3 }, DEFAULT_OPTIONS).ok, false);
  assert.equal(evaluateEntity({ ...base, assetTypeId: 1 }, DEFAULT_OPTIONS).ok, false);
  assert.equal(evaluateEntity({ ...base, assetTypeId: 8 }, DEFAULT_OPTIONS).ok, true);
});

test('robloxCreatedOnly skips community uploads', () => {
  const opts = { ...DEFAULT_OPTIONS, robloxCreatedOnly: true };
  assert.equal(evaluateEntity({ ...base, creatorName: 'SomeUser' }, opts).ok, false);
  assert.equal(evaluateEntity({ ...base, creatorName: 'Roblox' }, opts).ok, true);
});

test('buildItemView exposes title, thumbnail and both links', () => {
  const view = buildItemView(base, { trackedOnRolimons: true, source: 'economy' });
  assert.equal(view.title, 'Test Cap');
  assert.equal(view.thumbnail, thumbnailUrl(123));
  assert.match(view.thumbnail, /assetId=123/);
  assert.equal(view.rolimonsUrl, rolimonsUrl(123));
  assert.equal(view.robloxUrl, 'https://www.roblox.com/catalog/123');
  assert.equal(view.priceLabel, 'R$ 25');
  assert.equal(view.trackedOnRolimons, true);
  assert.match(qualificationSentence(view), /2015 or earlier/);
});

test('formatRobux is kind to free/unknown prices', () => {
  assert.equal(formatRobux(0), 'Free / unknown');
  assert.equal(formatRobux(null), 'Free / unknown');
  assert.equal(formatRobux(1000), 'R$ 1,000');
});

test('parseRolimonsEntry understands the positional feed', () => {
  const item = parseRolimonsEntry([1234, 'Sparkle Time Fedora', 'STF', 100000, 120000, 0, 4, 2, 130000, 1, 1]);
  assert.equal(item.id, 1234);
  assert.equal(item.name, 'Sparkle Time Fedora');
  assert.equal(item.acronym, 'STF');
  assert.equal(item.rap, 100000);
  assert.equal(item.value, 120000);
  assert.equal(item.hyped, true);
  assert.equal(item.rare, true);
});

test('parseRolimonsPayload accepts the {items:{id:[...]}} wrapper', () => {
  const payload = {
    success: true,
    items: {
      111: [111, 'Alpha Cap', 'AC', 50, 60, 0, 1, 0, 0, 0, 0],
      222: [222, 'Beta Fedora', 'BF', 0, 0, 30, 0, 0, 0, 0, 0],
      333: [333, '', 'X'],
    },
  };
  const items = parseRolimonsPayload(payload);
  assert.deepEqual(items.map((i) => i.id), [111, 222]);
  assert.equal(items[0].name, 'Alpha Cap');
});

test('parseRolimonsPayload also accepts plain arrays and junk safely', () => {
  assert.equal(parseRolimonsPayload(null).length, 0);
  assert.equal(parseRolimonsPayload({}).length, 0);
  const items = parseRolimonsPayload([[9, 'Thing', 'TH', 1, 2, 3, 0, 0, 0, 0, 0], ['bad'], [10, '']]);
  assert.equal(items.length, 1);
  assert.equal(items[0].id, 9);
});

test('rolimonsLooksLimited uses trading signals', () => {
  assert.equal(rolimonsLooksLimited({ rap: 100 }), true);
  assert.equal(rolimonsLooksLimited({ value: 50 }), true);
  assert.equal(rolimonsLooksLimited({ demand: 2 }), true);
  assert.equal(rolimonsLooksLimited({ rare: true }), true);
  assert.equal(rolimonsLooksLimited({ rap: null, value: null, demand: 0 }), false);
});

test('orderRolimonsCandidates puts non-tradables first', () => {
  const items = [
    { id: 1, rap: 900 },
    { id: 2, rap: null },
    { id: 3, value: 12 },
    { id: 4, rap: null },
  ];
  const order = orderRolimonsCandidates(items, () => 0.5);
  assert.deepEqual(order.slice(2).sort(), [1, 3]);
  assert.deepEqual(order.slice(0, 2).sort(), [2, 4]);
});
