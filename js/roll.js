/**
 * Rollimons — the roll pipeline.
 *
 * Goal: pick ONE random item that is
 *   - gear, a face or an accessory
 *   - made by Roblox
 *   - created between 2008 and 2019
 *   - buyable right now, and not a limited
 *
 * Deliberately gentle on the APIs: each attempt grabs ONE small search page,
 * picks ONE random item out of it, and verifies that single item before moving
 * on. Nothing is fired in parallel, so a roll is a handful of requests in a
 * row rather than a burst.
 *
 * Sources, in order:
 *   1. Roblox catalog, cycling gear -> faces -> accessories.
 *   2. Rolimons' item feed (one id at a time).
 *   3. Random asset ids from the 2008–2019 id windows.
 *
 * If the APIs can't be reached at all the roll reports "unavailable"; if they
 * answer but nothing fits the rules it reports "no item matched". Either way
 * there is no fake fallback item.
 */

import { DEFAULT_OPTIONS, buildItemView, evaluateEntity } from './core.js';

/** Roblox catalog categories: 2 = gear, 4 = faces, 5/11 = accessories. */
export const SEARCH_CATEGORIES = [2, 4, 5, 11];

/** How many single-item attempts a roll makes before giving up. */
export const MAX_ATTEMPTS = 14;

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
    attempts: 0,
    requests: 0,
    details: 0, // items the details API actually answered for
    catalogOk: 0, // searches that came back with something
    rejected: {},
  };

  /** Rolimons' list — one request, loaded at most once per roll. */
  let rolimonsItems = [];
  let rolimonsPromise = null;

  const started = Date.now();
  const deadline = started + 40_000;
  const tried = new Set();

  function reject(reason) {
    stats.rejected[reason] = (stats.rejected[reason] || 0) + 1;
  }

  function progress(patch = {}) {
    onProgress({ ...stats, elapsedMs: Date.now() - started, ...patch });
  }

  function expired() {
    return Date.now() > deadline || isCancelled();
  }

  /* ---------------------------- one candidate -------------------------------- */

  /** Verify a single candidate id. Returns the entity when it qualifies. */
  async function consider(entity, source) {
    if (!entity || tried.has(entity.id) || expired()) return null;
    tried.add(entity.id);
    stats.details += 1;
    stats.requests += 1;

    const verdict = evaluateEntity(entity, opts);
    if (verdict.ok) {
      onLog(`${entity.id}: ${entity.name} (${entity.year})`, 'good');
      return entity;
    }

    for (const reason of verdict.reasons) reject(reason);
    onLog(`${entity.id}: rejected — ${verdict.labels.join(', ')}`, 'muted');
    return null;
  }

  /** Fetch the details for one id, then verify it. */
  async function considerId(id, source) {
    if (!Number.isFinite(id) || id <= 0 || tried.has(id) || expired()) return null;
    stats.requests += 1;
    try {
      const { entity } = await api.getAssetDetails(id);
      return await consider(entity, source);
    } catch (error) {
      reject('no-details');
      onLog(`${id}: ${error.message}`, 'muted');
      return null;
    }
  }

  // One request, started once and reused everywhere below (it also decides
  // where the picture links). It never blocks the roll.
  void loadRolimons();

  /* ------------------------- stage 1: catalog, one at a time ------------------ */

  const catalogAttempts = 8;
  let blankSearches = 0;

  for (let i = 0; i < catalogAttempts && !expired(); i += 1) {
    const category = SEARCH_CATEGORIES[i % SEARCH_CATEGORIES.length];
    stats.attempts += 1;
    progress({ stage: 'catalog' });

    let batch;
    try {
      stats.requests += 1;
      batch = await api.searchCatalog({ category });
    } catch (error) {
      blankSearches += 1;
      onLog(`catalog search failed: ${error.message}`, 'warn');
      // Two dead searches in a row means the network is blocking us, not
      // that this particular category is empty.
      if (blankSearches >= 2 && stats.catalogOk === 0) break;
      await api.sleep?.(150);
      continue;
    }

    const rows = (batch.data || []).filter((entity) => entity && !tried.has(entity.id));
    if (!rows.length) {
      onLog(`catalog category ${category}: nothing returned`, 'muted');
      continue;
    }
    stats.catalogOk += 1;
    blankSearches = 0;
    onLog(`catalog category ${category}: ${rows.length} results`, 'muted');

    // ONE item per page: take a random row, and at most two more rows from the
    // same page if the first ones are already disqualified by their own data.
    for (let pickIndex = 0; pickIndex < 3 && rows.length; pickIndex += 1) {
      const index = Math.floor(rng() * rows.length);
      const [entity] = rows.splice(index, 1);

      const verdict = evaluateEntity(entity, opts);
      if (!verdict.ok && !verdict.reasons.includes('unknown-created')) {
        // The search row already proves it's wrong (wrong kind, wrong year,
        // limited, off sale, community upload) — no details call needed.
        for (const reason of verdict.reasons) reject(reason);
        tried.add(entity.id);
        continue;
      }

      const hit = await consider(entity, 'catalog');
      if (hit) return await finish(hit, 'catalog');
      break;
    }
  }

  /* ------------------------- stage 2: Rolimons, one id at a time -------------- */

  if (!expired()) {
    progress({ stage: 'rolimons' });
    await loadRolimons();
  }

  // Rolimons rows carry trading numbers for limiteds; skip those first.
  const rolimonsIds = shuffle(
    rolimonsItems.filter((row) => !(row.rap > 0 || row.value > 0 || row.demand > 0)).map((row) => row.id),
    rng,
  );

  for (const id of rolimonsIds.slice(0, 4)) {
    if (expired()) break;
    stats.attempts += 1;
    progress({ stage: 'rolimons' });
    const hit = await considerId(id, 'rolimons');
    if (hit) return await finish(hit, 'rolimons');
  }

  /* ---------------------- stage 3: id sampling, one at a time ----------------- */

  // If neither the catalog nor Rolimons answered anything, the details API is
  // almost certainly blocked too — don't make the user wait for it.
  const silent = stats.catalogOk === 0 && rolimonsItems.length === 0;
  if (!silent) {
    const sampled = api.sampleIds ? api.sampleIds({ count: 6 }) : [];
    for (const id of sampled) {
      if (expired()) break;
      stats.attempts += 1;
      progress({ stage: 'sampling' });
      const hit = await considerId(id, 'sampled');
      if (hit) return await finish(hit, 'sampled');
    }
  }

  /* -------------------------------- verdict --------------------------------- */

  const answered = stats.catalogOk > 0 || stats.details > 0;

  return {
    ok: false,
    item: null,
    stats,
    elapsedMs: Date.now() - started,
    reason: answered ? 'no-match' : 'unavailable',
    message: answered ? 'No item matched. Try again.' : 'Unavailable.',
  };

  /* -------------------------------- helpers --------------------------------- */

  /** One request, memoised, and never allowed to stall a finished roll. */
  function loadRolimons() {
    if (!rolimonsPromise) {
      rolimonsPromise = (async () => {
        try {
          const list = await api.rolimonsItems();
          rolimonsItems = Array.isArray(list) ? list : [];
          onLog(`rolimons list: ${rolimonsItems.length} items`, 'muted');
        } catch (error) {
          rolimonsItems = [];
          onLog(`rolimons unavailable: ${error.message}`, 'warn');
        }
        return rolimonsItems;
      })();
    }
    return rolimonsPromise;
  }

  async function finish(entity, source) {
    // Whether Rolimons knows the item decides where the picture links, so give
    // the list a short window — but don't let a slow feed hold up the result.
    if (!rolimonsItems.length) await Promise.race([loadRolimons(), wait(2500)]);
    const tracked = rolimonsItems.some((row) => row.id === entity.id);
    const item = buildItemView(entity, {
      source: api.demo ? 'demo' : source,
      trackedOnRolimons: tracked,
    });

    // Sample mode has no reachable CDN, so it hands us inline art instead.
    if (api.demo && typeof api.resolveThumbnail === 'function') {
      try {
        const local = await api.resolveThumbnail(entity.id);
        if (local) item.thumbnail = local;
      } catch {
        /* keep the CDN url */
      }
    }

    return { ok: true, item, stats, elapsedMs: Date.now() - started };
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shuffle(list, rng = Math.random) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Shared helper so the UI + tests agree on the "why" a roll failed. */
export function rejectionSummary(stats) {
  return Object.entries(stats.rejected || {}).sort((a, b) => b[1] - a[1]);
}
