/**
 * Rollimons — pure logic.
 *
 * No DOM, no network, no globals: everything in here is a plain function so it
 * can be unit-tested in Node and reused by both the UI and the roll pipeline.
 */

export const APP_NAME = 'Rollimons';
export const DEFAULT_YEAR = 2019;

/**
 * @typedef {Object} RollOptions
 * @property {'up-to'|'exactly'} yearMode  "2019 or earlier" vs "exactly 2019"
 * @property {number} year                 the cutoff / exact year
 * @property {boolean} rolimonsOnly        only accept items Rolimons actually tracks
 * @property {boolean} robloxCreatedOnly   only accept items made by Roblox itself
 */

/** @type {RollOptions} */
export const DEFAULT_OPTIONS = Object.freeze({
  yearMode: 'up-to',
  year: DEFAULT_YEAR,
  rolimonsOnly: false,
  robloxCreatedOnly: false,
});

/**
 * Asset types that are not worn on an avatar (audio, scripts, models, decals,
 * game passes…). They are skipped so a random sample always lands on something
 * that has a real catalog thumbnail.
 */
export const NON_VISUAL_ASSET_TYPES = new Set([1, 3, 4, 5, 6, 7, 9, 10, 13, 18, 19, 20, 29, 30, 31, 32, 33, 34, 38]);

export const REASON_LABELS = {
  invalid: 'no usable data',
  'no-details': 'the catalog returned no details',
  unnamed: 'missing a name',
  'unknown-created': 'unknown creation date',
  'too-new': 'created after the cutoff year',
  'not-exact-year': 'not created in the chosen year',
  limited: 'limited or limited unique',
  'off-sale': 'off sale',
  'not-wearable': 'not an avatar item',
  'not-roblox': 'not made by Roblox',
  'no-rolimons-items': 'Rolimons returned no usable items',
};

/* -------------------------------------------------------------------------- */
/* small helpers                                                              */
/* -------------------------------------------------------------------------- */

export function toNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function firstDefined(...values) {
  for (const value of values) if (value !== undefined && value !== null) return value;
  return undefined;
}

function has(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function bool(value) {
  if (value === true || value === 1) return true;
  if (typeof value === 'string') return value.toLowerCase() === 'true' || value === '1';
  return false;
}

/**
 * Turn any date-ish value into a 4 digit year, or null.
 * Accepts ISO strings, epoch milliseconds and Date objects.
 */
export function createdYear(value) {
  if (value instanceof Date) {
    const year = value.getUTCFullYear();
    return Number.isFinite(year) ? year : null;
  }
  if (typeof value === 'number') {
    const date = new Date(value);
    const year = date.getUTCFullYear();
    return Number.isFinite(year) && year > 2000 && year < 3000 ? year : null;
  }
  if (typeof value === 'string') {
    const match = value.match(/(\d{4})-\d{2}-\d{2}/) || value.match(/^(\d{4})/);
    if (match) {
      const year = Number(match[1]);
      return Number.isFinite(year) && year > 2000 && year < 3000 ? year : null;
    }
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return createdYear(parsed);
  }
  return null;
}

export function isVisibleAssetType(assetTypeId) {
  if (assetTypeId == null) return true; // unknown -> don't reject on this alone
  return !NON_VISUAL_ASSET_TYPES.has(Number(assetTypeId));
}

/** Deterministic-ish Fisher–Yates shuffle with an injectable RNG (tests). */
export function shuffle(list, rng = Math.random) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function randomInt(min, max, rng = Math.random) {
  return min + Math.floor(rng() * (max - min + 1));
}

export function pick(list, rng = Math.random) {
  if (!list.length) return undefined;
  return list[Math.floor(rng() * list.length)];
}

/** Random integer inside [min, max] using crypto when available. */
export function randomIdBetween(min, max) {
  const span = max - min + 1;
  const cryptoObj = globalThis.crypto;
  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    const buf = new Uint32Array(1);
    cryptoObj.getRandomValues(buf);
    return min + (buf[0] % span);
  }
  return min + Math.floor(Math.random() * span);
}

export function formatNumber(value) {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  return Number(value).toLocaleString('en-US');
}

export function formatRobux(value) {
  if (value == null || !Number.isFinite(Number(value)) || Number(value) <= 0) return 'Free / unknown';
  return `R$ ${formatNumber(value)}`;
}

export function formatDate(iso) {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return String(iso);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export function rolimonsUrl(id) {
  return `https://www.rolimons.com/item/${id}`;
}

export function robloxUrl(id) {
  return `https://www.roblox.com/catalog/${id}`;
}

/** Direct image URL — works in an <img> tag with no API round-trip. */
export function thumbnailUrl(id, size = 420) {
  return `https://www.roblox.com/asset-thumbnail/image?assetId=${id}&width=${size}&height=${size}&format=png`;
}

/* -------------------------------------------------------------------------- */
/* Rolimons payload                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Rolimons' `itemapi/itemdetails` payload is a compact, positional JSON blob.
 * The exact column order has changed over the years, so this parser is
 * deliberately tolerant: it only trusts the columns it can validate and keeps
 * the rest as opaque extras.
 *
 * @returns {{id:number,name:string,acronym:string,rap:number|null,value:number|null,
 *            defaultValue:number|null,demand:number|null,trend:number|null,
 *            projected:number|null,hyped:boolean|null,rare:boolean|null,extras:any[]}[]}
 */
export function parseRolimonsPayload(payload) {
  const raw = payload && typeof payload === 'object' ? (payload.items ?? payload) : null;
  if (!raw) return [];

  const entries = [];
  if (Array.isArray(raw)) {
    for (const entry of raw) entries.push(entry);
  } else if (typeof raw === 'object') {
    for (const [key, value] of Object.entries(raw)) {
      if (Array.isArray(value)) entries.push([toNumber(key), ...value.slice(1)]);
      else if (value && typeof value === 'object') entries.push({ id: toNumber(key), ...value });
    }
  }

  const items = [];
  for (const entry of entries) {
    const item = parseRolimonsEntry(entry);
    if (item) items.push(item);
  }
  return items;
}

export function parseRolimonsEntry(entry) {
  if (!entry) return null;

  if (Array.isArray(entry)) {
    const id = toNumber(entry[0]);
    const name = typeof entry[1] === 'string' ? entry[1].trim() : '';
    if (!id || id <= 0 || !name) return null;
    return {
      id,
      name,
      acronym: typeof entry[2] === 'string' ? entry[2] : '',
      rap: toNumber(entry[3]),
      value: toNumber(entry[4]),
      defaultValue: toNumber(entry[5]),
      demand: toNumber(entry[6]),
      trend: toNumber(entry[7]),
      projected: toNumber(entry[8]),
      hyped: entry[9] == null ? null : bool(entry[9]),
      rare: entry[10] == null ? null : bool(entry[10]),
      extras: entry.slice(11),
    };
  }

  if (typeof entry === 'object') {
    const id = toNumber(firstDefined(entry.id, entry.item_id, entry.assetId));
    const name = typeof entry.name === 'string' ? entry.name.trim() : '';
    if (!id || id <= 0 || !name) return null;
    return {
      id,
      name,
      acronym: typeof entry.acronym === 'string' ? entry.acronym : '',
      rap: toNumber(firstDefined(entry.rap, entry.RAP)),
      value: toNumber(entry.value),
      defaultValue: toNumber(firstDefined(entry.default_value, entry.defaultValue)),
      demand: toNumber(entry.demand),
      trend: toNumber(entry.trend),
      projected: toNumber(entry.projected),
      hyped: entry.hyped == null ? null : bool(entry.hyped),
      rare: entry.rare == null ? null : bool(entry.rare),
      extras: [],
    };
  }

  return null;
}

/**
 * Rolimons is built around tradables: an item with a RAP / value / demand score
 * is (almost always) a limited. Items with no trading signals are the closest
 * thing Rolimons has to "just a normal item".
 */
export function rolimonsLooksLimited(item) {
  if (!item) return false;
  const signals = [item.rap, item.value, item.projected, item.demand];
  if (signals.some((n) => Number.isFinite(n) && n > 0)) return true;
  return item.rare === true || item.hyped === true;
}

/** Normal-items first: verifies the cheapest candidates before the limiteds. */
export function orderRolimonsCandidates(items, rng = Math.random) {
  const normal = [];
  const tradable = [];
  for (const item of items) (rolimonsLooksLimited(item) ? tradable : normal).push(item.id);
  return [...shuffle(normal, rng), ...shuffle(tradable, rng)];
}

/* -------------------------------------------------------------------------- */
/* Normalising both Roblox APIs into one shape                                */
/* -------------------------------------------------------------------------- */

/**
 * @typedef {Object} AssetEntity
 * @property {number} id
 * @property {string} name
 * @property {string|null} createdIso
 * @property {number|null} year
 * @property {number|null} price
 * @property {boolean} isForSale
 * @property {boolean} isOffSale
 * @property {boolean} limited
 * @property {number|null} assetTypeId
 * @property {string|null} creatorName
 * @property {string} source
 */

/** @returns {AssetEntity|null} */
export function normalizeEntity(raw, source = 'unknown') {
  if (!raw || typeof raw !== 'object') return null;

  const id = toNumber(firstDefined(raw.AssetId, raw.assetId, raw.id, raw.ItemId, raw.itemId, raw.targetId));
  if (!id || id <= 0) return null;

  const name = String(firstDefined(raw.Name, raw.name, '') || '').trim();
  const createdRaw = firstDefined(raw.Created, raw.created, raw.CreatedAt, raw.createdAt, raw.itemCreated, raw.ItemCreated);

  const price = toNumber(firstDefined(raw.PriceInRobux, raw.price, raw.Price, raw.LowestPrice, raw.lowestPrice));
  const explicitOffSale = raw.isOffSale ?? raw.IsOffSale;
  const priceIsNull = has(raw, 'PriceInRobux') && raw.PriceInRobux === null;

  const isForSale = bool(firstDefined(raw.IsForSale, raw.isForSale, raw.isForSaleNow, price != null && price > 0));

  return {
    id,
    name,
    createdIso: typeof createdRaw === 'string' ? createdRaw : createdRaw instanceof Date ? createdRaw.toISOString() : null,
    year: createdYear(createdRaw),
    price,
    isForSale,
    isOffSale: bool(explicitOffSale) || priceIsNull,
    limited: bool(raw.IsLimited) || bool(raw.isLimited) || bool(raw.IsLimitedUnique) || bool(raw.isLimitedUnique),
    assetTypeId: toNumber(firstDefined(raw.AssetTypeId, raw.assetType, raw.assetTypeId, raw.asset_type)),
    creatorName: stringOrNull(
      firstDefined(raw.Creator && raw.Creator.Name, raw.creatorName, raw.creator && raw.creator.name, raw.creator && raw.creator.Name),
    ),
    source,
  };
}

function stringOrNull(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

/* -------------------------------------------------------------------------- */
/* Eligibility                                                                */
/* -------------------------------------------------------------------------- */

/**
 * The whole point of the project: a random item that is genuinely buyable,
 * not a limited, and old enough.
 *
 * @returns {{ok:boolean, reasons:string[], labels:string[]}}
 */
export function evaluateEntity(entity, options = DEFAULT_OPTIONS) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const reasons = [];

  if (!entity || !Number.isFinite(entity.id)) return verdict(['invalid']);
  if (!entity.name) reasons.push('unnamed');

  if (entity.year == null) reasons.push('unknown-created');
  else if (opts.yearMode === 'exactly') {
    if (entity.year !== opts.year) reasons.push('not-exact-year');
  } else if (entity.year > opts.year) reasons.push('too-new');

  if (entity.limited) reasons.push('limited');

  const priced = Number.isFinite(entity.price) && entity.price > 0;
  if (entity.isOffSale) reasons.push('off-sale');
  else if (!priced && entity.isForSale !== true) reasons.push('off-sale');

  if (!isVisibleAssetType(entity.assetTypeId)) reasons.push('not-wearable');

  if (opts.robloxCreatedOnly && entity.creatorName && !/^roblox$/i.test(entity.creatorName)) {
    reasons.push('not-roblox');
  }

  return verdict(reasons);
}

function verdict(reasons) {
  return {
    ok: reasons.length === 0,
    reasons,
    labels: reasons.map((reason) => REASON_LABELS[reason] || reason),
  };
}

/** Turn a verified entity into everything the UI needs. */
export function buildItemView(entity, extra = {}) {
  const view = {
    id: entity.id,
    title: entity.name,
    thumbnail: thumbnailUrl(entity.id),
    rolimonsUrl: rolimonsUrl(entity.id),
    robloxUrl: robloxUrl(entity.id),
    createdIso: entity.createdIso,
    createdLabel: formatDate(entity.createdIso),
    year: entity.year,
    price: entity.price,
    priceLabel: formatRobux(entity.price),
    creator: entity.creatorName || 'Unknown creator',
    assetTypeId: entity.assetTypeId,
    isLimited: entity.limited,
    isForSale: entity.price != null && entity.price > 0,
    trackedOnRolimons: Boolean(extra.trackedOnRolimons),
    source: extra.source || entity.source || 'catalog',
    yearMode: extra.yearMode || 'up-to',
    rolledAt: extra.rolledAt || new Date().toISOString(),
  };
  return view;
}

/** Short human sentence describing how an item qualified. */
export function qualificationSentence(view) {
  const bits = [];
  bits.push(view.yearMode === 'exactly' ? `created in ${view.year}` : `created in ${view.year} or earlier`);
  if (view.isForSale) bits.push('still on sale');
  bits.push('not limited');
  return bits.join(' · ');
}
