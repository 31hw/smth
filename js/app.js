/**
 * Rollimons — UI wiring. Keeps all DOM knowledge in one place.
 */

import { APP_NAME, DEFAULT_OPTIONS, DEFAULT_YEAR, formatNumber, qualificationSentence } from './core.js';
import { createApi, createDemoApi } from './api.js';
import { roll } from './roll.js';

const STORAGE_KEY = 'rollimons:history:v1';
const OPTIONS_KEY = 'rollimons:options:v1';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const state = {
  rolling: false,
  cancelled: false,
  history: [],
  lastItemId: null,
  api: null,
};

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode */
  }
}

function readOptions() {
  const saved = readJson(OPTIONS_KEY, {}) || {};
  return {
    yearMode: saved.yearMode === 'exactly' ? 'exactly' : 'up-to',
    year: Number.isFinite(Number(saved.year)) ? Number(saved.year) : DEFAULT_YEAR,
    rolimonsOnly: Boolean(saved.rolimonsOnly),
    robloxCreatedOnly: Boolean(saved.robloxCreatedOnly),
  };
}

/* -------------------------------------------------------------------------- */
/* boot                                                                       */
/* -------------------------------------------------------------------------- */

export function boot({ params = new URLSearchParams(location.search), api = null } = {}) {
  const demo = params.get('demo') === '1';
  state.api = api;

  document.documentElement.dataset.mode = demo ? 'demo' : 'live';
  $('#mode-badge').textContent = demo ? 'Demo data' : 'Live';
  $('#mode-badge').title = demo
    ? 'Running against bundled sample data (?demo=1). Real items need rolimons.com + roblox.com, which this sandbox cannot reach.'
    : 'Fetching live items from rolimons.com and economy.roblox.com';
  if (demo) document.body.classList.add('is-demo');

  state.history = readJson(STORAGE_KEY, []).filter((entry) => entry && entry.id);
  renderOptions(readOptions());
  renderHistory();

  $('#roll-form').addEventListener('submit', (event) => {
    event.preventDefault();
    doRoll();
  });
  $('#again').addEventListener('click', () => doRoll());
  $('#cancel').addEventListener('click', () => {
    state.cancelled = true;
  });
  $('#copy-link').addEventListener('click', copyLink);
  $('#copy-embed').addEventListener('click', () => {
    const item = currentItem();
    if (!item) return;
    const url = item.trackedOnRolimons ? item.rolimonsUrl : item.robloxUrl;
    copyText(
      `<a href="${url}" target="_blank" rel="noopener"><img src="${item.thumbnail}" alt="${escapeAttr(item.title)}" width="200" height="200"></a>`,
      'Embed code copied',
    );
  });
  $('#dismiss-error').addEventListener('click', () => {
    $('#error').hidden = true;
  });
  $('#history-list').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-id]');
    if (button) showItem(Number(button.dataset.id), { fromHistory: true });
  });
  $('#clear-history').addEventListener('click', () => {
    state.history = [];
    writeJson(STORAGE_KEY, state.history);
    renderHistory();
    toast('History cleared');
  });

  for (const control of $$('#options input, #options select')) {
    control.addEventListener('change', () => {
      // persist first, then re-render (which normalises the year field)
      collectOptions();
      renderOptions(readOptions());
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'r' && !event.metaKey && !event.ctrlKey && !/input|select|textarea/i.test(document.activeElement.tagName)) {
      doRoll();
    }
  });

  return { demo, roll: doRoll };
}

/* -------------------------------------------------------------------------- */
/* options                                                                    */
/* -------------------------------------------------------------------------- */

function renderOptions(options) {
  const yearInput = $('#year');
  const yearMode = $('#year-mode');
  if (document.activeElement !== yearMode) yearMode.value = options.yearMode;
  if (document.activeElement !== yearInput) yearInput.value = String(options.year);
  $('#rolimons-only').checked = options.rolimonsOnly;
  $('#roblox-only').checked = options.robloxCreatedOnly;
  $('#year-label').textContent = yearMode.value === 'exactly' ? 'Year (exactly)' : 'Year (or earlier)';
  writeJson(OPTIONS_KEY, options);
}

function collectOptions() {
  const yearMode = $('#year-mode').value === 'exactly' ? 'exactly' : 'up-to';
  const rawYear = Number($('#year').value);
  const year = Number.isFinite(rawYear) && rawYear >= 2006 && rawYear <= 2026 ? rawYear : DEFAULT_YEAR;
  const options = {
    yearMode,
    year,
    rolimonsOnly: $('#rolimons-only').checked,
    robloxCreatedOnly: $('#roblox-only').checked,
  };
  writeJson(OPTIONS_KEY, options);
  return { ...DEFAULT_OPTIONS, ...options };
}

/* -------------------------------------------------------------------------- */
/* rolling                                                                    */
/* -------------------------------------------------------------------------- */

async function doRoll() {
  if (state.rolling) return;
  state.rolling = true;
  state.cancelled = false;
  state.lastItemId = null;
  const api = currentRollApi();

  setBusy(true);
  hideError();
  $('#result').classList.add('is-loading');
  setStatus('Rolling…', 'spinner');
  renderProgress({ seen: 0, requests: 0, rejected: {} });
  $('#log').innerHTML = '';

  try {
    const result = await roll({
      api,
      options: collectOptions(),
      isCancelled: () => state.cancelled,
      onProgress: (stats) => {
        setStatus(rollingLabel(stats), 'spinner');
        renderProgress(stats);
      },
      onLog: (message, level) => appendLog(message, level),
      onCandidate: () => {},
    });

    if (result.ok) {
      setStatus(`Found it in ${result.stats.seen} checks`, 'good');
      renderProgress(result.stats);
      showItem(result.item, { fresh: true });
    } else {
      setStatus('Nothing matched', 'warn');
      renderProgress(result.stats);
      showError(result.message);
      $('#result').classList.remove('has-item');
    }
  } catch (error) {
    setStatus('Roll failed', 'bad');
    showError(error.message || String(error));
  } finally {
    state.rolling = false;
    setBusy(false);
    $('#result').classList.remove('is-loading');
  }
}

function rollingLabel(stats) {
  const stage = stats.stage || 'catalog';
  if (stage === 'rolimons') return 'Asking Rolimons…';
  if (stage === 'sampling') return 'Digging through the old catalog…';
  return 'Browsing the catalog…';
}

/* api is resolved at roll time so demo mode stays a single switch */
function currentRollApi() {
  if (state.api) return state.api;
  return document.documentElement.dataset.mode === 'demo' ? demoApiSingleton() : apiSingleton();
}

let _demoApi = null;
function demoApiSingleton() {
  if (!_demoApi) _demoApi = createDemoApi();
  return _demoApi;
}

let _api = null;
function apiSingleton() {
  if (!_api) _api = createApi({ log: (message) => appendLog(message, 'muted') });
  return _api;
}

function setBusy(busy) {
  const button = $('#roll');
  button.disabled = busy;
  button.classList.toggle('is-busy', busy);
  $('#roll-label').textContent = busy ? 'Rolling…' : 'Roll a random item';
  $('#cancel').hidden = !busy;
  $('#again').disabled = busy;
}

function setStatus(text, tone = 'idle') {
  const el = $('#status-text');
  el.textContent = text;
  el.dataset.tone = tone;
}

function renderProgress(stats) {
  $('#stat-seen').textContent = formatNumber(stats.seen || 0);
  $('#stat-requests').textContent = formatNumber(stats.requests || 0);
  const rejected = Object.values(stats.rejected || {}).reduce((sum, n) => sum + n, 0);
  $('#stat-rejected').textContent = formatNumber(rejected);
}

function appendLog(message, level = 'muted') {
  const log = $('#log');
  const row = document.createElement('div');
  row.className = `log-row log-${level}`;
  row.textContent = message;
  log.prepend(row);
  while (log.children.length > 40) log.lastElementChild.remove();
}

/* -------------------------------------------------------------------------- */
/* result card                                                                */
/* -------------------------------------------------------------------------- */

let currentView = null;

function currentItem() {
  return currentView;
}

function showItem(itemOrId, options = {}) {
  const item = typeof itemOrId === 'object' ? itemOrId : state.history.find((entry) => entry.id === Number(itemOrId));
  if (!item) return;

  currentView = item;
  state.lastItemId = item.id;

  $('#result').classList.add('has-item');
  const img = $('#item-thumb');
  img.classList.remove('is-ready');
  img.alt = `Thumbnail of ${item.title}`;
  img.onload = () => img.classList.add('is-ready');
  img.onerror = () => {
    img.classList.remove('is-ready');
    img.src = fallbackThumb(item.title);
  };
  img.src = item.thumbnail;

  $('#item-title').textContent = item.title;
  $('#item-year').textContent = String(item.year ?? '—');
  $('#item-created').textContent = item.createdLabel || '—';
  $('#item-price').textContent = item.priceLabel || '—';
  $('#item-creator').textContent = item.creator || 'Unknown';
  $('#item-id').textContent = formatNumber(item.id);
  $('#item-qualify').textContent = qualificationSentence(item);
  // Only offer the Rolimons link when Rolimons actually tracks the item,
  // otherwise the page would 404. Roblox catalog link always works.
  const onRolimons = Boolean(item.trackedOnRolimons);
  $('#item-rolimons').href = item.rolimonsUrl;
  $('#item-rolimons').hidden = !onRolimons;
  $('#item-roblox').href = item.robloxUrl;
  $('#item-roblox').classList.toggle('primary-link', !onRolimons);
  $('#copy-link').textContent = onRolimons ? 'Copy Rolimons link' : 'Copy Roblox link';
  $('#tracked-pill').hidden = !item.trackedOnRolimons;
  $('#source-pill').textContent = sourceLabel(item.source);

  if (options.fresh) {
    pushHistory(item);
    const card = $('#result');
    card.classList.remove('pop');
    void card.offsetWidth;
    card.classList.add('pop');
  }
  if (options.fromHistory) {
    const card = $('#result');
    card.classList.remove('pop');
    void card.offsetWidth;
    card.classList.add('pop');
  }
}

function sourceLabel(source) {
  if (source === 'catalog') return 'via Roblox catalog';
  if (source === 'rolimons') return 'via Rolimons';
  if (source === 'sampled') return 'via id crawl';
  if (source === 'demo') return 'demo';
  return 'unknown source';
}

function fallbackThumb(title) {
  const hue = [...String(title)].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="420">
    <rect width="420" height="420" fill="hsl(${hue} 40% 16%)"/>
    <text x="210" y="220" text-anchor="middle" font-family="system-ui" font-size="80" fill="rgba(255,255,255,.35)">?</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function pushHistory(item) {
  const entry = {
    id: item.id,
    title: item.title,
    thumbnail: item.thumbnail,
    rolimonsUrl: item.rolimonsUrl,
    robloxUrl: item.robloxUrl,
    year: item.year,
    createdLabel: item.createdLabel,
    priceLabel: item.priceLabel,
    creator: item.creator,
    source: item.source,
    trackedOnRolimons: item.trackedOnRolimons,
    yearMode: item.yearMode,
    rolledAt: item.rolledAt,
  };
  state.history = [entry, ...state.history.filter((existing) => existing.id !== entry.id)].slice(0, 24);
  writeJson(STORAGE_KEY, state.history);
  renderHistory();
}

function renderHistory() {
  const list = $('#history-list');
  list.innerHTML = '';
  $('#history-empty').hidden = state.history.length > 0;
  $('#history-count').textContent = String(state.history.length);
  $('#clear-history').hidden = state.history.length === 0;

  for (const entry of state.history) {
    const li = document.createElement('li');
    li.className = 'history-item';
    li.innerHTML = `
      <button type="button" data-id="${entry.id}" title="Show ${escapeAttr(entry.title)} again">
        <img src="${escapeAttr(entry.thumbnail)}" alt="" width="48" height="48" loading="lazy">
        <span>
          <strong>${escapeHtml(entry.title)}</strong>
          <em>${escapeHtml(String(entry.year ?? '?'))} · ${escapeHtml(entry.priceLabel || '—')}</em>
        </span>
      </button>
      <a href="${escapeAttr(entry.rolimonsUrl)}" target="_blank" rel="noopener" aria-label="Open ${escapeAttr(entry.title)} on Rolimons">↗</a>`;
    list.append(li);
  }
}

/* -------------------------------------------------------------------------- */
/* clipboard + errors                                                         */
/* -------------------------------------------------------------------------- */

async function copyLink() {
  const item = currentItem();
  if (!item) return;
  const url = item.trackedOnRolimons ? item.rolimonsUrl : item.robloxUrl;
  const ok = await copyText(url, `${item.trackedOnRolimons ? 'Rolimons' : 'Roblox'} link copied`);
  if (!ok) showError('Could not copy — the browser blocked clipboard access.');
}

async function copyText(text, message) {
  try {
    await navigator.clipboard.writeText(text);
    toast(message);
    return true;
  } catch {
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.append(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      if (ok) toast(message);
      return ok;
    } catch {
      return false;
    }
  }
}

function showError(message) {
  const box = $('#error');
  box.hidden = false;
  $('#error-text').textContent = message;
}

function hideError() {
  $('#error').hidden = true;
}

let toastTimer = null;
function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-visible'), 2200);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function escapeAttr(value) {
  return escapeHtml(value);
}

export { APP_NAME };
