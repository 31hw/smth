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
    const result = await roll({
      api: state.api,
      options: OPTIONS,
      onLog: () => {},
      onProgress: () => {},
    });

    if (result.ok) {
      render(result.item);
      setStatus(status, '');
    } else {
      // "Unavailable" = the APIs never answered. "No item matched" = they did,
      // but nothing passed the rules. No stand-in items either way.
      setStatus(status, result.reason === 'unavailable' ? 'Unavailable' : 'No item matched. Try again.');
    }
  } catch {
    setStatus(status, 'Unavailable');
  } finally {
    state.rolling = false;
    button.disabled = false;
  }
}

/** A neutral grey square, used when the real thumbnail can't be loaded. */
const PLACEHOLDER_THUMB =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="250" height="250"><rect width="250" height="250" fill="#e9e9e9"/></svg>',
  );

/**
 * Show the name, the picture, the creation year and the Rolimons link —
 * nothing else.
 */
function render(item) {
  state.item = item;

  const title = document.querySelector('#item-title');
  const link = document.querySelector('#item-link');
  const thumb = document.querySelector('#item-thumb');
  const year = document.querySelector('#item-year');
  const rolimonsLink = document.querySelector('#item-rolimons');
  const section = document.querySelector('#item');

  title.textContent = item.title;
  title.hidden = false;

  // This used to be attached after `src`, which meant an instantly-loading
  // image (a cached one, or the inline SVG the demo data returns) fired its
  // load event before the handler existed — so the picture stayed invisible.
  // The element is simply visible now, with a grey square as the fallback.
  thumb.onerror = () => {
    thumb.onerror = null;
    thumb.src = PLACEHOLDER_THUMB;
  };
  thumb.alt = item.title;
  thumb.src = item.thumbnail;

  link.href = item.href;
  link.hidden = false;

  year.textContent = item.year ? `(${item.year})` : '';
  year.hidden = !item.year;

  // The plain Rolimons address, under the year, opening in a new tab.
  rolimonsLink.href = item.rolimonsUrl;
  rolimonsLink.textContent = `www.rolimons.com/item/${item.id}`;
  rolimonsLink.hidden = false;

  section.classList.add('has-item');
}

function setStatus(el, message) {
  el.textContent = message;
  el.hidden = !message;
}

export { OPTIONS };
