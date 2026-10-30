/**
 * Rollimons — the roll pipeline.
 *
 * Goal: pick ONE random item that is
 *   - gear, a face or an accessory
 *   - made by Roblox
 *   - created between 2008 and 2019
 *   - buyable right now, and not a limited
 *
 * Strategy, cheapest checks first:
 *   1. Roblox catalog searches, walked category by category (gear, face,
 *      accessories) with shuffled keywords/sorts/price caps for variety.
 *   2. Rolimons' item feed as a second pool (it powers the "on Rolimons" link).
 *   3. Last resort: random asset ids inside the historical id window for the
 *      chosen years, plus a burst of neighbouring ids.
 *
 * Every candidate is verified against economy.roblox.com/v2/assets/{id}/details.
 * If nothing qualifies we say so — nothing is silently downgraded.
 */

import {
  DEFAULT_OPTIONS,
  buildItemView,
  createdYear,
  evaluateEntity,
  isRobloxMade,
  randomInt,
  assetTypeGroup,
} from './core.js';

export const CONCURRENCY = 5;

/** Roblox catalog categories: 2 = gear, 4 = faces, 5/11 = accessories. */
export const SEARCH_CATEGORIES = [2, 4, 5, 11];

/**
 * @param {object} args
 * @param {object} args.api
 * @param {object} [args.options]
 * @param {(stats: object) => void} [args.onProgress]
 * @param {(msg: string, level?: string) => void} [args.onLog]
 * @param {() => number} [args.rng]
 * @param {() => boolean} [args.isCancelled]
 */
export async function roll({
  api,
  options = DEFAULT_OPTIONS,
  onProgress = () => {},
  onLog = () => {},
  rng = Math.random,
  isCancelled = () => false,
} = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const stats = {
    seen: 0,
    queries: 0,
    requests: 0,
    details: 0, // candidates the catalog API actually answered for
    catalogOk: 0, // catalog searches that returned something
    rejected: {},
  };

  /** Rolimons' list, loaded in the background so it never delays stage 1. */
  let rolimonsItems = [];

  const started = Date.now();
  const tried = new Set();
  const deadline = started + 45_000;

  function reject(reason) {
    stats.rejected[reason] = (stats.rejected[reason] || 0) + 1;
  }

  function progress(patch = {}) {
    onProgress({ ...stats, elapsedMs: Date.now() - started, ...patch });
  }

  function expired() {
    return Date.now() > deadline || isCancelled();
  }

  /** Verify one candidate id; returns the entity when it qualifies. */
  async function consider(id, source) {
    if (!Number.isFinite(id) || id <= 0 || tried.has(id)) return null;
    tried.add(id);
    stats.seen += 1;
    stats.requests += 1;

    let entity;
    try {
      const result = await api.getAssetDetails(id);
      entity = result.entity;
      stats.details += 1;
    } catch (error) {
      reject('no-details');
      onLog(`${id}: ${error.message}`, 'muted');
      return null;
    }

    const verdict = evaluateEntity(entity, opts);
    if (verdict.ok) {
      onLog(`${id}: ${entity.name} (${entity.year})`, 'good');
      return entity;
    }

    for (const reason of verdict.reasons) reject(reason);
    onLog(`${id}: rejected — ${verdict.labels.join(', ')}`, 'muted');
    return null;
  }

  async function runPool(ids, source, concurrency = CONCURRENCY) {
    const queue = [...ids];
    const workers = Array.from({ length: Math.min(concurrency, Math.max(1, queue.length)) }, async () => {
      while (queue.length) {
        if (expired()) return null;
        const id = queue.shift();
        progress();
        const hit = await consider(id, source);
        if (hit) return hit;
      }
      return null;
    });
    const results = await Promise.all(workers);
    return results.find(Boolean) || null;
  }

  /* --------------------------- background: rolimons --------------------------- */

  const rolimonsReady = (async () => {
    try {
      const items = await api.rolimonsItems();
      rolimonsItems = Array.isArray(items) ? items : [];
      onLog(`rolimons list: ${rolimonsItems.length} documented items`, 'muted');
    } catch (error) {
      onLog(`rolimons unavailable: ${error.message}`, 'warn');
    }
    return rolimonsItems;
  })();

  /* ------------------------------ stage 1: catalog ---------------------------- */

  const rounds = 8;
  for (let i = 0; i < rounds; i += 1) {
    if (expired()) break;

    const category = SEARCH_CATEGORIES[i % SEARCH_CATEGORIES.length];
    let batch;
    try {
      stats.queries += 1;
      progress({ stage: 'catalog' });
      batch = await api.searchCatalog({ category });
      if (batch.data.length) stats.catalogOk += 1;
      onLog(`catalog category ${category}: ${batch.data.length} candidates`, 'muted');
    } catch (error) {
      onLog(`catalog query failed: ${error.message}`, 'warn');
      await api.sleep?.(200);
      continue;
    }

    // Cheap local pre-filter: skip candidates the search row already proves
    // are wrong, but still verify anything with missing metadata (a search row
    // may not carry the creation date, and that's the whole point of the year
    // window). Rules that fire here are counted like any other rejection.
    const usable = batch.data.filter((entity) => {
      if (!entity || tried.has(entity.id)) return false;
      const verdict = evaluateEntity(entity, opts);
      if (verdict.ok) return true;
      if (verdict.reasons.includes('unknown-created')) return true;
      for (const reason of verdict.reasons) reject(reason);
      return false;
    });

    const hit = await runPool(
      usable.map((entity) => entity.id),
      'catalog',
    );
    if (hit) return await finish(hit, 'catalog');
  }

  /* ------------------------------ stage 2: rolimons --------------------------- */

  progress({ stage: 'rolimons' });
  await rolimonsReady;

  if (rolimonsItems.length) {
    const limiteds = new Set(rolimonsItems.filter((row) => row.rap || row.value).map((row) => row.id));
    const plain = rolimonsItems.filter((row) => !limiteds.has(row.id)).map((row) => row.id);
    const sample = [...plain.slice(0, 30), ...rolledPick(plain, 10, rng)];
    const hit = await runPool(sample, 'rolimons');
    if (hit) return await finish(hit, 'rolimons');
  }

  /* ------------------------- stage 3: id-space crawling ----------------------- */

  for (let round = 0; round < 3 && !expired(); round += 1) {
    progress({ stage: 'sampling' });
    const sampled = api.sampleIds ? api.sampleIds({ count: 24 }) : [];
    const hit = await runPool(sampled, 'sampled', 5);
    if (hit) return await finish(hit, 'sampled');
  }

  return {
    ok: false,
    item: null,
    stats,
    elapsedMs: Date.now() - started,
    message: 'No item matched this time. Roll again.',
  };

  /* -------------------------------- helpers --------------------------------- */

  async function finish(entity, source) {
    // Give the Rolimons list a moment so the link can point at its item page,
    // but never let a slow feed delay the result for long.
    if (!rolimonsItems.length) await Promise.race([rolimonsReady, wait(1200)]);

    const tracked = rolimonsItems.some((row) => row.id === entity.id);
    const item = buildItemView(entity, {
      source: api.demo ? 'demo' : source,
      trackedOnRolimons: tracked,
    });

    // Demo mode has no reachable Roblox CDN, so it hands us inline SVG art.
    if (api.demo && typeof api.resolveThumbnail === 'function') {
      try {
        const localThumb = await api.resolveThumbnail(entity.id);
        if (localThumb) item.thumbnail = localThumb;
      } catch {
        /* keep the Roblox CDN url */
      }
    }

    return { ok: true, item, stats, elapsedMs: Date.now() - started };
  }
}

function rolledPick(list, count, rng) {
  if (!list.length) return [];
  const out = [];
  for (let i = 0; i < count; i += 1) out.push(list[Math.floor(rng() * list.length)]);
  return out;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Shared helper so the UI + tests agree on the "why" a roll failed. */
export function rejectionSummary(stats) {
  return Object.entries(stats.rejected || {}).sort((a, b) => b[1] - a[1]);
}

export { randomInt, createdYear, assetTypeGroup };
