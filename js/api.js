/**
 * Rollimons — network layer.
 *
 * Everything here runs in the browser, so it has to cope with two annoying
 * facts of life:
 *   1. rolimons.com and economy.roblox.com do not send permissive CORS headers.
 *   2. the browser cannot proxy through the dev server (that would only work
 *      when the server is on the same machine).
 *
 * So: try the direct request first (some Roblox endpoints do allow it), then a
 * short list of public read-only CORS relays. The relay that worked last time
 * for a given host is remembered and tried first, which keeps subsequent
 * requests fast.
 */

import { parseRolimonsPayload, normalizeEntity, randomInt, pick } from './core.js';

const ROLIMONS_ITEMS = 'https://www.rolimons.com/itemapi/itemdetails';
const CATALOG_SEARCH = 'https://catalog.roblox.com/v1/search/items/details';
const ECONOMY_ASSET = (id) => `https://economy.roblox.com/v2/assets/${id}/details`;
const THUMBNAIL_API = (id) => `https://thumbnails.roblox.com/v1/assets?assetIds=${id}&size=420x420&format=Png`;

/** Public CORS relays, tried in order. `id` is used for the "remember" cache. */
export const RELAYS = [
  { id: 'direct', build: (url) => url },
  { id: 'allorigins', build: (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}` },
  { id: 'corsproxy', build: (url) => `https://corsproxy.io/?url=${encodeURIComponent(url)}` },
  { id: 'codetabs', build: (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}` },
  { id: 'thingproxy', build: (url) => `https://thingproxy.freeboard.io/fetch/${url}` },
];

const CATALOG_KEYWORDS = [
  '', '', '', 'classic', 'hat', 'cap', 'hair', 'face', 'shades', 'sunglasses', 'fedora', 'crown',
  'wings', 'cape', 'sword', 'armor', 'hoodie', 'suit', 'tie', 'ears', 'horn', 'halo', 'sparkle',
  'rainbow', 'gold', 'neon', 'retro', 'pizza', 'cake', 'dragon', 'knight', 'ninja', 'wizard', 'pet',
];

// Kept conservative on purpose: categories are a numeric enum that Roblox has
// changed before, but these values have been stable for a long time. When a
// query 400s, roll.js retries with the simplest possible search.
const CATALOG_CATEGORIES = [1, 4, 5, 6, 7];
const CATALOG_SORTS = [0, 2, 4, 5];
const PRICE_CEILINGS = [5, 10, 25, 50, 100, 250, 1000];

/**
 * Rough Roblox asset-id windows per year. Used only as a last-resort candidate
 * generator when the catalog search gives us nothing: every candidate still has
 * to pass the same verification, so a bad guess is simply thrown away.
 */
const ID_RANGES = {
  2009: [200_000, 900_000],
  2010: [900_000, 1_600_000],
  2011: [1_600_000, 2_600_000],
  2012: [2_600_000, 4_200_000],
  2013: [4_200_000, 7_500_000],
  2014: [7_500_000, 13_000_000],
  2015: [13_000_000, 22_000_000],
  2016: [22_000_000, 45_000_000],
  2017: [45_000_000, 160_000_000],
  2018: [160_000_000, 1_100_000_000],
  2019: [1_100_000_000, 4_200_000_000],
};

export class HttpError extends Error {
  constructor(message, { status = 0, url = '', relay = '' } = {}) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.url = url;
    this.relay = relay;
  }
}

/* -------------------------------------------------------------------------- */
/* cache                                                                      */
/* -------------------------------------------------------------------------- */

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
  };
}

export function createCache(storage, prefix = 'rollimons:') {
  const store = storage || memoryStorage();
  return {
    get(key, ttlMs) {
      try {
        const raw = store.getItem(prefix + key);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || !('t' in parsed)) return null;
        if (ttlMs != null && Date.now() - parsed.t > ttlMs) return null;
        return parsed.v;
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        store.setItem(prefix + key, JSON.stringify({ t: Date.now(), v: value }));
      } catch {
        /* quota or private mode: caching is a nice-to-have */
      }
      return value;
    },
    clear() {
      try {
        for (const key of Object.keys(store)) {
          if (key.startsWith(prefix)) store.removeItem(key);
        }
      } catch {
        /* ignore */
      }
    },
  };
}

/* -------------------------------------------------------------------------- */
/* http                                                                       */
/* -------------------------------------------------------------------------- */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function createApi({
  fetchImpl,
  storage,
  timeoutMs = 12_000,
  ttl = { asset: 6 * 60 * 60 * 1000, catalog: 10 * 60 * 1000, rolimons: 12 * 60 * 60 * 1000 },
  log = () => {},
  rng = Math.random,
} = {}) {
  const doFetch = fetchImpl || ((...args) => globalThis.fetch(...args));
  const cache = createCache(storage);
  const relayPreference = new Map(Object.entries(cache.get('relay-prefs', Infinity) || {}));

  function rememberRelay(host, relayId) {
    relayPreference.set(host, relayId);
    const obj = Object.fromEntries(relayPreference);
    cache.set('relay-prefs', obj);
  }

  function relayOrder(host) {
    const preferred = relayPreference.get(host);
    if (!preferred) return RELAYS;
    const preferredRelay = RELAYS.find((r) => r.id === preferred);
    return preferredRelay ? [preferredRelay, ...RELAYS.filter((r) => r.id !== preferred)] : RELAYS;
  }

  async function fetchWithTimeout(url, options = {}) {
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
    try {
      return await doFetch(url, { ...options, signal: controller ? controller.signal : options.signal });
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  /**
   * GET a URL as JSON, walking the relay list until one of them answers.
   * @returns {Promise<{data:any, relay:string}>}
   */
  async function getJson(url) {
    const host = safeHost(url);
    const errors = [];

    for (const relay of relayOrder(host)) {
      const target = relay.build(url);
      try {
        const response = await fetchWithTimeout(target, { headers: { Accept: 'application/json' } });
        if (!response.ok) {
          errors.push(`${relay.id}: HTTP ${response.status}`);
          // A real answer from the upstream API — trying more relays won't help.
          if (response.status === 404 || (response.status >= 400 && response.status < 500 && response.status !== 429)) {
            // A relay can also produce its own 4xx, so fall through to the next
            // relay exactly once before giving up on the whole request.
            if (relay.id === 'direct') continue;
            throw new HttpError(`HTTP ${response.status}`, { status: response.status, url, relay: relay.id });
          }
          continue;
        }
        const text = await response.text();
        const data = safeParse(text);
        if (data == null) {
          errors.push(`${relay.id}: not JSON (${text.slice(0, 48).replace(/\s+/g, ' ')})`);
          continue;
        }
        rememberRelay(host, relay.id);
        if (relay.id !== 'direct') log(`relay ${relay.id} used for ${host}`);
        return { data, relay: relay.id };
      } catch (error) {
        if (error instanceof HttpError) throw error;
        errors.push(`${relay.id}: ${error && error.message ? error.message : 'failed'}`);
      }
    }

    throw new HttpError(`Could not reach ${host}. ${errors.slice(0, 3).join(' | ')}`, { status: 0, url });
  }

  /* ------------------------------ Rolimons ------------------------------- */

  let rolimonsPromise = null;

  /** All items Rolimons tracks (cached for 12h, ~10k rows). */
  async function rolimonsItems() {
    if (rolimonsPromise) return rolimonsPromise;
    const cached = cache.get('rolimons-items', ttl.rolimons);
    if (cached) {
      rolimonsPromise = Promise.resolve(cached);
      return rolimonsPromise;
    }
    rolimonsPromise = (async () => {
      const { data } = await getJson(ROLIMONS_ITEMS);
      const items = parseRolimonsPayload(data);
      if (!items.length) throw new HttpError('Rolimons payload had no items', { url: ROLIMONS_ITEMS });
      cache.set('rolimons-items', items);
      log(`rolimons: ${items.length} items`);
      return items;
    })();
    try {
      return await rolimonsPromise;
    } catch (error) {
      rolimonsPromise = null;
      throw error;
    }
  }

  /* ------------------------------- catalog ------------------------------- */

  /**
   * Roblox catalog search. Returns normalised entities (no creation date —
   * the economy API is what tells us how old something is).
   *
   * At least one of Keyword / Category has to be present; keyword-only searches
   * are the most flexible, so they're used whenever a keyword was picked.
   */
  async function searchCatalog(options = {}) {
    const keyword = options.keyword ?? pick(CATALOG_KEYWORDS, rng);
    const category = options.category ?? (keyword ? null : pick(CATALOG_CATEGORIES, rng));
    const sortType = options.sortType ?? pick(CATALOG_SORTS, rng);
    const maxPrice = options.maxPrice ?? pick(PRICE_CEILINGS, rng);
    const limit = options.limit ?? 30;
    const creator = options.creator ?? 'roblox';

    const params = new URLSearchParams({
      Limit: String(limit),
      SortType: String(sortType),
      MinPrice: '1',
      MaxPrice: String(maxPrice),
      salesTypeFilter: '1',
    });
    if (keyword) params.set('Keyword', keyword);
    if (category != null) params.set('Category', String(category));
    // CreatorTargetId 1 = the Roblox account. Leaving it out pulls in
    // community uploads too, which is a much bigger (and weirder) pool.
    if (creator === 'roblox') {
      params.set('CreatorTargetId', '1');
      params.set('CreatorType', 'User');
    }

    const url = `${CATALOG_SEARCH}?${params.toString()}`;
    const cacheKey = `catalog:${url}`;
    const cached = cache.get(cacheKey, ttl.catalog);
    if (cached) return { data: cached, url, cached: true };

    const { data } = await getJson(url);
    const rows = Array.isArray(data?.data) ? data.data : Array.isArray(data?.items) ? data.items : [];
    const entities = rows.map((row) => normalizeEntity(row, 'catalog')).filter(Boolean);

    cache.set(cacheKey, entities);
    return { data: entities, url, cached: false, cursor: data?.nextPageCursor || null };
  }

  /* ------------------------------- economy ------------------------------- */

  /** Authoritative per-item details: name, creator, created date, price, limited flags. */
  async function getAssetDetails(id) {
    const numericId = Number(id);
    const cacheKey = `asset:${numericId}`;
    const cached = cache.get(cacheKey, ttl.asset);
    if (cached) return { entity: cached, cached: true };

    const { data } = await getJson(ECONOMY_ASSET(numericId));
    const entity = normalizeEntity(data, 'economy');
    if (!entity) throw new HttpError('Asset details were empty', { url: ECONOMY_ASSET(numericId) });
    cache.set(cacheKey, entity);
    return { entity, cached: false };
  }

  /** Higher quality thumbnail via the thumbnail JSON API; optional upgrade. */
  async function resolveThumbnail(id) {
    try {
      const { data } = await getJson(THUMBNAIL_API(id));
      const row = Array.isArray(data?.data) ? data.data[0] : null;
      return row && row.state === 'Completed' && row.imageUrl ? row.imageUrl : null;
    } catch {
      return null;
    }
  }

  function sampleIds({ year = 2019, count = 12, span = 3 } = {}) {
    const ids = [];
    for (let i = 0; i < count; i += 1) {
      const y = Math.max(2009, year - randomInt(0, span, rng));
      const range = ID_RANGES[Math.min(2019, y)] || ID_RANGES[2019];
      ids.push(randomInt(range[0], range[1], rng));
    }
    return ids;
  }

  return {
    getJson,
    rolimonsItems,
    searchCatalog,
    getAssetDetails,
    resolveThumbnail,
    sampleIds,
    cache,
    relays: RELAYS,
    sleep,
  };
}

function safeHost(url) {
  try {
    return new URL(url).host;
  } catch {
    return 'unknown';
  }
}

function safeParse(text) {
  if (typeof text !== 'string') return null;
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    // allorigins' `/get` endpoint wraps payloads in {contents: "..."}
    const match = trimmed.match(/"contents"\s*:\s*"([\s\S]*)"\s*}/);
    if (match) {
      try {
        return JSON.parse(match[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\'));
      } catch {
        return null;
      }
    }
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* demo mode                                                                  */
/* -------------------------------------------------------------------------- */

const DEMO_ROLIMONS = {
  items: [
    [1001, 'Classic Fedora', 'CF', 0, 0, 50, 0, 0, 0, 0, 0],
    [2002, 'Tradable Sparkle Bucket', 'TSB', 4200, 5100, 0, 3, 1, 4800, 1, 1],
    [3003, 'Striped Beanie', 'SB', 0, 0, 25, 0, 0, 0, 0, 0],
  ],
};

const DEMO_ASSETS = [
  { id: 1028595, name: 'Roblox Baseball Cap', created: '2007-05-30T00:00:00Z', price: 25, sandbox: false },
  { id: 1365767, name: 'Classic Fedora', created: '2012-04-12T00:00:00Z', price: 50, sandbox: false },
  { id: 2603079, name: 'Vintage Denim Jacket', created: '2014-09-03T00:00:00Z', price: 15, sandbox: false },
  { id: 4807763, name: 'Silly Spring Shoes', created: '2016-03-21T00:00:00Z', price: 80, sandbox: false },
  { id: 91234567, name: 'Retro Neon Shades', created: '2018-07-04T00:00:00Z', price: 120, sandbox: false },
  { id: 1234567890, name: 'Pixel Wizard Hat', created: '2019-10-14T00:00:00Z', price: 35, sandbox: false },
  { id: 2345678901, name: 'Gingerbread Hoodie', created: '2019-12-02T00:00:00Z', price: 65, sandbox: false },
  { id: 3456789012, name: 'Lucky Green Fedora', created: '2018-03-17T00:00:00Z', price: 45, sandbox: false },
  { id: 4567890123, name: 'Strawberry Ice Cream Hair', created: '2017-08-11T00:00:00Z', price: 90, sandbox: false },
  { id: 5678901234, name: 'Night Vision Goggles', created: '2015-11-19T00:00:00Z', price: 110, sandbox: false },
  { id: 6789012345, name: 'Cosmic Cape', created: '2013-07-07T00:00:00Z', price: 200, sandbox: false },
  { id: 7890123456, name: 'Pizza Party Hat', created: '2011-02-14T00:00:00Z', price: 30, sandbox: false },
  { id: 2000000001, name: 'Old Limited Crown', created: '2015-02-02T00:00:00Z', price: 9999, sandbox: true, limited: true },
  { id: 2000000002, name: 'Retired Offsale Hoodie', created: '2017-05-05T00:00:00Z', price: null, sandbox: true, offSale: true },
  { id: 2000000003, name: 'Modern 2023 Cap', created: '2023-01-09T00:00:00Z', price: 60, sandbox: true },
];

function demoThumbnail(id, name) {
  const hue = (Number(id) * 7) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="420" viewBox="0 0 420 420">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="hsl(${hue} 70% 32%)"/>
      <stop offset="1" stop-color="hsl(${(hue + 60) % 360} 80% 12%)"/>
    </linearGradient></defs>
    <rect width="420" height="420" fill="url(#g)"/>
    <circle cx="210" cy="185" r="95" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="3"/>
    <text x="210" y="300" text-anchor="middle" font-family="system-ui,sans-serif" font-size="26" fill="rgba(255,255,255,.9)">${escapeXml(name)}</text>
    <text x="210" y="98" text-anchor="middle" font-family="system-ui,sans-serif" font-size="20" fill="rgba(255,255,255,.55)">DEMO ITEM</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function escapeXml(value) {
  return String(value).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
}

/**
 * Offline stand-in for the real APIs. Powers `?demo=1`, the unit tests and the
 * README screenshots — no network, same pipeline, deliberately includes
 * limited / off-sale / too-new items so the filtering is visible.
 */
export function createDemoApi({ rng = Math.random } = {}) {
  const attempts = new Map();

  return {
    demo: true,
    async rolimonsItems() {
      await sleep(120);
      return parseRolimonsPayload(DEMO_ROLIMONS);
    },
    async searchCatalog() {
      await sleep(140);
      // intentionally a mixed bag, shuffled: limiteds, off-sale items and
      // too-new items are in here so the demo shows the filter doing its job.
      const shuffled = [...DEMO_ASSETS];
      for (let i = shuffled.length - 1; i > 0; i -= 1) {
        const j = Math.floor(rng() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return { data: shuffled.slice(0, 9).map(toDemoEntity), url: 'demo://catalog', cached: false };
    },
    async getAssetDetails(id) {
      await sleep(220);
      const numericId = Number(id);
      attempts.set(numericId, (attempts.get(numericId) || 0) + 1);
      const hit = DEMO_ASSETS.find((asset) => asset.id === numericId);
      if (!hit) throw new Error(`demo: unknown asset ${numericId}`);
      return { entity: toDemoEntity(hit), cached: false };
    },
    async resolveThumbnail(id) {
      const hit = DEMO_ASSETS.find((asset) => asset.id === Number(id));
      return demoThumbnail(id, hit ? hit.name : `Item ${id}`);
    },
    sampleIds({ count = 8 }) {
      const pool = DEMO_ASSETS.filter((a) => a.sandbox).map((a) => a.id);
      const ids = [];
      for (let i = 0; i < count; i += 1) ids.push(pool[Math.floor(rng() * pool.length)]);
      return ids;
    },
    cache: { get: () => null, set: (k, v) => v, clear() {} },
    relays: RELAYS,
    attempts,
  };
}

function toDemoEntity(asset) {
  return normalizeEntity(
    {
      AssetId: asset.id,
      Name: asset.name,
      AssetTypeId: 8,
      Created: asset.created,
      PriceInRobux: asset.price,
      IsLimited: Boolean(asset.limited),
      IsLimitedUnique: Boolean(asset.limited),
      IsForSale: asset.price != null && asset.price > 0,
      Creator: { Name: 'Roblox' },
    },
    'demo',
  );
}
