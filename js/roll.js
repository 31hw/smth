/**
 * Rollimons — the roll pipeline.
 *
 * Goal: pick ONE random, currently-purchasable, non-limited Roblox item that
 * was created on/before (or exactly in) a chosen year, and never lie about it.
 *
 * Strategy, cheapest checks first:
 *   1. Randomised Roblox catalog searches (keyword / category / sort / price
 *      shuffle) give fresh candidates — brand new items are usually cheap and
 *      off-sale filtering happens for free in the search itself.
 *   2. Rolimons' item list adds another pool. Rolimons has no creation dates,
 *      so those ids still go through the same verification.
 *   3. Last resort: random asset ids inside the historical id window for the
 *      requested year, plus a burst of sequential ids ("catalog crawling").
 *
 * Every candidate is verified with economy.roblox.com/v2/assets/{id}/details.
 * If nothing qualifies we say so — no silent fallback to a newer limited.
 */

import {
  DEFAULT_OPTIONS,
  buildItemView,
  createdYear,
  evaluateEntity,
  isVisibleAssetType,
  orderRolimonsCandidates,
  randomInt,
} from './core.js';

export const CONCURRENCY = 5;

/**
 * @param {object} args
 * @param {object} args.api
 * @param {object} [args.options]
 * @param {() => number} [args.onProgress]
 * @param {(msg: string, level?: string) => void} [args.onLog]
 * @param {() => number} [args.rng]
 * @param {() => boolean} [args.isCancelled]
 */
export async function roll({
  api,
  options = DEFAULT_OPTIONS,
  onProgress = () => {},
  onLog = () => {},
  onCandidate = () => {},
  rng = Math.random,
  isCancelled = () => false,
} = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const stats = {
    seen: 0,
    queries: 0,
    requests: 0,
    rejected: {},
    recent: [],
    ignored: 0,
    checkedRolimons: 0,
  };

  /** Rolimons' list, loaded in the background so it never delays stage 1. */
  let rolimonsItems = [];

  const started = Date.now();
  const tried = new Set();
  const deadline = started + 48_000;

  /** @param {string} reason */
  function reject(reason) {
    stats.rejected[reason] = (stats.rejected[reason] || 0) + 1;
    stats.recent.push(reason);
    if (stats.recent.length > 6) stats.recent.shift();
  }

  function progress(patch = {}) {
    onProgress({ ...stats, elapsedMs: Date.now() - started, ...patch });
  }

  function expired() {
    return Date.now() > deadline || isCancelled();
  }

  /**
   * Verify + score one candidate id. Returns the item view when it qualifies.
   */
  async function consider(id, source) {
    if (!Number.isFinite(id) || id <= 0 || tried.has(id)) return null;
    tried.add(id);
    stats.seen += 1;
    stats.requests += 1;

    let entity;
    try {
      const result = await api.getAssetDetails(id);
      entity = result.entity;
    } catch (error) {
      reject('no-details');
      onLog(`${id}: ${error.message}`, 'muted');
      return null;
    }

    const verdict = evaluateEntity(entity, opts);
    onCandidate({ id, source, entity, verdict, ok: verdict.ok });
    if (verdict.ok) {
      onLog(`${id}: ✓ ${entity.name} (${entity.year})`, 'good');
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

  /* --------------------------- background: rolimons ---------------------------- */

  // Kick the Rolimons feed off in the background: the catalog stage is usually
  // faster, and we only need the list to badge items as "tracked on Rolimons".
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

  /* ------------------------------ stage 1: catalog ----------------------------- */

  const queryCount = 6;
  for (let i = 0; i < queryCount; i += 1) {
    if (expired()) break;
    // Alternate between Roblox-made and community items so the pool stays big,
    // unless the user explicitly asked for Roblox-made only.
    const creator = opts.robloxCreatedOnly ? 'roblox' : i % 2 === 0 ? 'roblox' : 'any';
    let batch;
    try {
      stats.queries += 1;
      progress({ stage: 'catalog' });
      batch = await api.searchCatalog({ creator });
      onLog(`catalog query ${i + 1}: ${batch.data.length} candidates`, 'muted');
    } catch (error) {
      onLog(`catalog query ${i + 1} failed: ${error.message}`, 'warn');
      try {
        // Simplest search that exists: one keyword, no category, cheapest items.
        batch = await api.searchCatalog({ creator, keyword: 'hat', category: null, sortType: 0, maxPrice: 25 });
        onLog(`fallback query: ${batch.data.length} candidates`, 'muted');
      } catch (fallbackError) {
        onLog(`fallback query failed: ${fallbackError.message}`, 'warn');
        await api.sleep?.(250);
        continue;
      }
    }

    const usable = batch.data.filter((entity) => {
      if (tried.has(entity.id)) return false;
      if (!isVisibleAssetType(entity.assetTypeId)) {
        stats.ignored += 1;
        return false;
      }
      return true;
    });

    const hit = await runPool(
      usable.map((entity) => entity.id),
      'catalog',
    );
    if (hit) return await finish(hit, 'catalog');
  }

  /* ------------------------------ stage 2: rolimons ---------------------------- */

  progress({ stage: 'rolimons' });
  await rolimonsReady;

  if (opts.rolimonsOnly && rolimonsItems.length) {
    // Rolimons shows no creation dates, so verify a slice of its order.
    const ids = orderRolimonsCandidates(rolimonsItems, rng).slice(0, 40);
    stats.checkedRolimons = ids.length;
    const hit = await runPool(ids, 'rolimons');
    if (hit) return await finish(hit, 'rolimons');
  } else if (rolimonsItems.length) {
    // Cheap win: Rolimons sometimes already knows the item by an id we sampled.
    const sample = orderRolimonsCandidates(rolimonsItems, rng).slice(0, 12);
    stats.checkedRolimons = sample.length;
    const hit = await runPool(sample, 'rolimons');
    if (hit) return await finish(hit, 'rolimons');
  }

  /* ------------------------- stage 3: id-space crawling ------------------------ */

  for (let round = 0; round < 3 && !expired(); round += 1) {
    progress({ stage: 'sampling' });
    const sampled = api.sampleIds ? api.sampleIds({ year: opts.year, count: 20, span: 2 }) : [];
    const hit = await runPool(sampled, 'sampled', 5);
    if (hit) return await finish(hit, 'sampled');
  }

  return {
    ok: false,
    item: null,
    stats,
    elapsedMs: Date.now() - started,
    message:
      'No matching item this time — the catalog API refused every candidate or every one that came back was limited, off sale or too new. Try again.',
  };

  /* ------------------------------- helpers ----------------------------------- */

  async function finish(entity, source) {
    // Best effort: give the list a moment so the item can be flagged as on
    // Rolimons, but never let a slow feed delay the result for long.
    if (!rolimonsItems.length) {
      await Promise.race([rolimonsReady, wait(1500)]);
    }
    const tracked = rolimonsItems.some((row) => row.id === entity.id);
    const item = buildItemView(entity, {
      source: api.demo ? 'demo' : source,
      trackedOnRolimons: tracked,
      yearMode: opts.yearMode,
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

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Shared helper so the UI + tests agree on the "why" a roll failed. */
export function rejectionSummary(stats) {
  const entries = Object.entries(stats.rejected || {}).sort((a, b) => b[1] - a[1]);
  return entries;
}

export { randomInt, createdYear };
