import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ALLOWED_ASSET_TYPE_IDS,
  DEFAULT_OPTIONS,
  MAX_YEAR,
  MIN_YEAR,
  assetTypeGroup,
  buildItemView,
  createdYear,
  evaluateEntity,
  isRobloxMade,
  normalizeEntity,
  orderRolimonsCandidates,
  parseRolimonsEntry,
  parseRolimonsPayload,
  robloxUrl,
  rolimonsLooksLimited,
  rolimonsUrl,
  thumbnailUrl,
} from '../js/core.js';

/** A fully eligible item: Roblox-made gear from 2014, on sale, not limited. */
const base = {
  id: 123,
  name: 'Linked Sword',
  createdIso: '2014-06-01T00:00:00Z',
  year: 2014,
  price: 100,
  isForSale: true,
  isOffSale: false,
  limited: false,
  assetTypeId: 19,
  creatorName: 'Roblox',
  source: 'economy',
};

test('the year window is 2008–2019', () => {
  assert.equal(MIN_YEAR, 2008);
  assert.equal(MAX_YEAR, 2019);
  assert.equal(DEFAULT_OPTIONS.minYear, 2008);
  assert.equal(DEFAULT_OPTIONS.maxYear, 2019);
});

test('createdYear handles ISO strings, epochs and junk', () => {
  assert.equal(createdYear('2014-03-02T10:00:00Z'), 2014);
  assert.equal(createdYear('2019-12-31'), 2019);
  assert.equal(createdYear(new Date('2011-01-01T00:00:00Z')), 2011);
  assert.equal(createdYear(Date.UTC(2013, 4, 1)), 2013);
  assert.equal(createdYear(''), null);
  assert.equal(createdYear(null), null);
  assert.equal(createdYear('not a date'), null);
});

test('asset types map to gear / face / accessory', () => {
  assert.equal(assetTypeGroup(19), 'gear');
  assert.equal(assetTypeGroup(18), 'face');
  assert.equal(assetTypeGroup(8), 'accessory');
  assert.equal(assetTypeGroup(41), 'accessory');
  assert.equal(assetTypeGroup(47), 'accessory');
  assert.equal(assetTypeGroup(11), null, 'shirts are not gear/face/accessory');
  assert.equal(assetTypeGroup(null), null);
  assert.deepEqual(ALLOWED_ASSET_TYPE_IDS, [8, 18, 19, 41, 42, 43, 44, 45, 46, 47]);
});

test('normalizeEntity reads Roblox economy details', () => {
  const entity = normalizeEntity(
    {
      AssetId: 555,
      Name: '  Classic Fedora ',
      Created: '2012-02-03T00:00:00Z',
      PriceInRobux: 15,
      IsLimited: false,
      IsForSale: true,
      AssetTypeId: 8,
      Creator: { Name: 'Roblox' },
    },
    'economy',
  );
  assert.equal(entity.id, 555);
  assert.equal(entity.name, 'Classic Fedora');
  assert.equal(entity.year, 2012);
  assert.equal(entity.price, 15);
  assert.equal(entity.assetTypeId, 8);
  assert.equal(entity.creatorName, 'Roblox');
  assert.equal(entity.isOffSale, false);
});

test('normalizeEntity flags a null price as off sale', () => {
  const entity = normalizeEntity({ AssetId: 1, Name: 'Gone', PriceInRobux: null, Created: '2012-01-01T00:00:00Z' });
  assert.equal(entity.isOffSale, true);
  assert.equal(entity.isForSale, false);
});

test('normalizeEntity returns null without an id', () => {
  assert.equal(normalizeEntity({ Name: 'x' }), null);
  assert.equal(normalizeEntity(null), null);
});

test('an eligible item passes', () => {
  const verdict = evaluateEntity(base, DEFAULT_OPTIONS);
  assert.equal(verdict.ok, true, verdict.reasons.join(','));
});

test('only gear, faces and accessories are allowed', () => {
  for (const assetTypeId of [19, 18, 8, 41, 42, 43, 44, 45, 46, 47]) {
    assert.equal(evaluateEntity({ ...base, assetTypeId }, DEFAULT_OPTIONS).ok, true, `type ${assetTypeId}`);
  }
  for (const assetTypeId of [2, 3, 11, 12, 17, 24, 1]) {
    const verdict = evaluateEntity({ ...base, assetTypeId }, DEFAULT_OPTIONS);
    assert.equal(verdict.ok, false, `type ${assetTypeId} should be rejected`);
    assert.ok(verdict.reasons.includes('not-allowed-type'));
  }
  // an unknown type is rejected rather than guessed
  assert.equal(evaluateEntity({ ...base, assetTypeId: null }, DEFAULT_OPTIONS).ok, false);
});

test('items outside 2008–2019 are rejected, the edges are kept', () => {
  assert.equal(evaluateEntity({ ...base, year: 2008 }, DEFAULT_OPTIONS).ok, true);
  assert.equal(evaluateEntity({ ...base, year: 2019 }, DEFAULT_OPTIONS).ok, true);

  const tooOld = evaluateEntity({ ...base, year: 2007 }, DEFAULT_OPTIONS);
  assert.equal(tooOld.ok, false);
  assert.ok(tooOld.reasons.includes('too-old'));

  const tooNew = evaluateEntity({ ...base, year: 2020 }, DEFAULT_OPTIONS);
  assert.equal(tooNew.ok, false);
  assert.ok(tooNew.reasons.includes('too-new'));
});

test('unknown creation dates are rejected rather than guessed', () => {
  const verdict = evaluateEntity({ ...base, year: null, createdIso: null }, DEFAULT_OPTIONS);
  assert.equal(verdict.ok, false);
  assert.ok(verdict.reasons.includes('unknown-created'));
});

test('limiteds are always rejected', () => {
  const verdict = evaluateEntity({ ...base, limited: true }, DEFAULT_OPTIONS);
  assert.equal(verdict.ok, false);
  assert.ok(verdict.reasons.includes('limited'));
});

test('off sale items are always rejected', () => {
  const offSale = evaluateEntity({ ...base, isOffSale: true, isForSale: false }, DEFAULT_OPTIONS);
  assert.equal(offSale.ok, false);
  assert.ok(offSale.reasons.includes('off-sale'));

  const freeNoSale = evaluateEntity({ ...base, price: 0, isForSale: false }, DEFAULT_OPTIONS);
  assert.equal(freeNoSale.ok, false);
  assert.ok(freeNoSale.reasons.includes('off-sale'));
});

test('only Roblox-made items are accepted', () => {
  assert.equal(isRobloxMade('Roblox'), true);
  assert.equal(isRobloxMade(' roblox '), true);
  assert.equal(isRobloxMade('SomeBuilder'), false);
  assert.equal(isRobloxMade(null), false);

  assert.equal(evaluateEntity({ ...base, creatorName: 'SomeBuilder' }, DEFAULT_OPTIONS).ok, false);
  assert.ok(evaluateEntity({ ...base, creatorName: 'SomeBuilder' }, DEFAULT_OPTIONS).reasons.includes('not-roblox'));
  assert.equal(evaluateEntity({ ...base, creatorName: 'Roblox' }, DEFAULT_OPTIONS).ok, true);
});

test('buildItemView: title, picture, year and a non-dead link', () => {
  const view = buildItemView(base, { trackedOnRolimons: false });
  assert.equal(view.title, 'Linked Sword');
  assert.equal(view.year, 2014);
  assert.equal(view.group, 'gear');
  assert.equal(view.thumbnail, thumbnailUrl(123));
  assert.match(view.thumbnail, /assetId=123/);
  // not on Rolimons -> never link to a 404
  assert.equal(view.href, robloxUrl(123));
  assert.equal(view.href, 'https://www.roblox.com/catalog/123');

  const tracked = buildItemView(base, { trackedOnRolimons: true });
  assert.equal(tracked.href, rolimonsUrl(123));
  assert.equal(tracked.trackedOnRolimons, true);
});

test('parseRolimonsEntry understands the positional feed', () => {
  const item = parseRolimonsEntry([1234, 'Sparkle Time Fedora', 'STF', 100000, 120000, 0, 4, 2, 130000, 1, 1]);
  assert.equal(item.id, 1234);
  assert.equal(item.name, 'Sparkle Time Fedora');
  assert.equal(item.acronym, 'STF');
  assert.equal(item.rap, 100000);
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
  assert.deepEqual(
    items.map((i) => i.id),
    [111, 222],
  );
  assert.equal(items[0].name, 'Alpha Cap');
});

test('parseRolimonsPayload tolerates junk', () => {
  assert.equal(parseRolimonsPayload(null).length, 0);
  assert.equal(parseRolimonsPayload({}).length, 0);
  const items = parseRolimonsPayload([
    [9, 'Thing', 'TH', 1, 2, 3, 0, 0, 0, 0, 0],
    ['bad'],
    [10, ''],
  ]);
  assert.equal(items.length, 1);
  assert.equal(items[0].id, 9);
});

test('rolimonsLooksLimited uses trading signals', () => {
  assert.equal(rolimonsLooksLimited({ rap: 100 }), true);
  assert.equal(rolimonsLooksLimited({ value: 50 }), true);
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
