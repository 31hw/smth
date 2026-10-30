/**
 * Rollimons — DOM wiring. Deliberately tiny: a button, a name, a picture,
 * a year. Everything else lives in js/roll.js (picking) and js/api.js (data).
 */

import { DEFAULT_OPTIONS, MIN_YEAR, MAX_YEAR, ALLOWED_ASSET_TYPE_IDS } from './core.js';
import { createApi, createDemoApi } from './api.js';
import { roll } from './roll.js';

const OPTIONS = {
  ...DEFAULT_OPTIONS,
  minYear: MIN_YEAR,
  maxYear: MAX_YEAR,
  robloxCreatedOnly: true,
  allowedAssetTypes: ALLOWED_ASSET_TYPE_IDS,
};

const state = {
  rolling: false,
  item: null,
  api: null,
  demo: false,
};

export function boot({ params = new URLSearchParams(globalThis.location?.search || ''), api = null } = {}) {
  const demo = params.get('demo') === '1';
  state.demo = demo;
  if (api) state.api = api;
  else state.api = demo ? createDemoApi() : createApi();

  const button = document.querySelector('#roll');
  button.addEventListener('click', () => doRoll());

  document.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() === 'r' && !event.metaKey && !event.ctrlKey && !event.altKey) {
      if (/input|textarea|select/i.test(document.activeElement?.tagName || '')) return;
      doRoll();
    }
  });

  return { demo, roll: doRoll };
}

async function doRoll() {
  if (state.rolling) return;
  state.rolling = true;

  const button = document.querySelector('#roll');
  const status = document.querySelector('#status');
  button.disabled = true;
  setStatus(status, 'Rolling…');

  try {
    let result = await roll({
      api: state.api,
      options: OPTIONS,
      onLog: () => {},
      onProgress: () => {},
    });

    // If the live APIs answered nothing at all, the browser is being blocked
    // by CORS/network rules rather than the item filters. Say so plainly and
    // roll with the bundled sample data instead of pretending it failed.
    const nothingAnswered = result.stats.catalogOk === 0 && result.stats.details === 0;
    if (!result.ok && nothingAnswered && !state.demo && !state.api?.demo) {
      state.demo = true;
      state.api = createDemoApi();
      result = await roll({ api: state.api, options: OPTIONS });
      if (result.ok) {
        render(result.item);
        setStatus(status, 'Sample data — Roblox and Rolimons were not reachable.');
        return;
      }
    }

    if (result.ok) {
      render(result.item);
      setStatus(status, '');
    } else {
      setStatus(status, 'No item matched that time. Roll again.');
    }
  } catch (error) {
    setStatus(status, error?.message || 'Something went wrong. Try again.');
  } finally {
    state.rolling = false;
    button.disabled = false;
  }
}

/** Show exactly three things: the name, the picture and the year. */
function render(item) {
  state.item = item;

  const title = document.querySelector('#item-title');
  const link = document.querySelector('#item-link');
  const thumb = document.querySelector('#item-thumb');
  const year = document.querySelector('#item-year');
  const section = document.querySelector('#item');

  title.textContent = item.title;
  title.hidden = false;

  link.href = item.href;
  link.hidden = false;
  thumb.src = item.thumbnail;
  thumb.alt = item.title;
  thumb.onerror = () => {
    // Never show a broken image icon.
    thumb.removeAttribute('src');
    thumb.alt = '';
    thumb.hidden = true;
  };
  thumb.onload = () => {
    thumb.hidden = false;
  };

  year.textContent = item.year ? `(${item.year})` : '';
  year.hidden = !item.year;

  section.classList.add('has-item');
}

function setStatus(el, message) {
  el.textContent = message;
  el.hidden = !message;
}

export { OPTIONS };
