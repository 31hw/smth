import { useEffect, useMemo, useState } from 'react';
import {
  isChromeOnlyRoute,
  isCreateRoute,
  isHardPassthroughRoute,
  matchRoute,
} from '../routeMeta';


function isChromeMode() {
  return (
    typeof document !== 'undefined' &&
    document.documentElement &&
    document.documentElement.dataset.rbxClassicChrome === '1'
  );
}

function isCreateHost() {
  return (
    typeof window !== 'undefined' &&
    (window.location.hostname || '').toLowerCase() === 'create.roblox.com'
  );
}

function isClassicAnchorEvent(e) {
  if (!e) return false;
  let path = [];
  try {
    path = typeof e.composedPath === 'function' ? e.composedPath() : [];
  } catch (_) {
    path = [];
  }
  if (path.some((node) => node && node.id === 'rbx-classic-chrome')) return true;
  if (path.some((node) => node && node.id === '__next')) return true;
  const target = e.target;
  if (target && typeof target.closest === 'function') {
    if (target.closest('#__next')) return true;
  }
  return false;
}

function findAnchor(e) {
  let path = [];
  try {
    path = typeof e.composedPath === 'function' ? e.composedPath() : [];
  } catch (_) {
    path = [];
  }
  for (const node of path) {
    if (node && node.nodeType === 1 && node.tagName === 'A' && node.hasAttribute('href')) {
      return node;
    }
  }
  const target = e.target;
  if (target && typeof target.closest === 'function') {
    return target.closest('a[href]');
  }
  return null;
}

function navigateWholePage(href) {
  if (typeof window === 'undefined' || !href) return;
  if (isCreateHost() && typeof href === 'string' && href.charAt(0) === '/') {
    window.location.href = 'https://www.roblox.com' + href;
    return;
  }
  window.location.href = href;
}

function resolveCreateTarget(href) {
  if (/^https?:\/\/create\.roblox\.com/i.test(href)) return href;
  return 'https://create.roblox.com/';
}

const listeners = new Set();
const eventHandlers = {
  routeChangeStart: new Set(),
  routeChangeComplete: new Set(),
  routeChangeError: new Set(),
};

function emitEvent(type, ...args) {
  const set = eventHandlers[type];
  if (!set) return;
  for (const fn of set) {
    try {
      fn(...args);
    } catch (err) {
      console.error('[router] event error', err);
    }
  }
}

function getLocationState() {
  if (typeof window === 'undefined') {
    return matchRoute('/home', '');
  }
  return matchRoute(window.location.pathname, window.location.search);
}

let currentState = getLocationState();

function notifyListeners() {
  currentState = getLocationState();
  for (const fn of listeners) {
    try {
      fn(currentState);
    } catch (err) {
      console.error('[router] listener error', err);
    }
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    notifyListeners();
    emitEvent('routeChangeComplete', window.location.pathname + window.location.search);
  });

  // Global delegated link interceptor so plain <a href="/..."> links also navigate cleanly.
  // It only acts on clicks that originate inside the classic UI (#__next) or the
  // classic chrome shadow root, so native Roblox pages keep every one of their
  // own links / SPA handlers untouched.
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return;
    }
    if (!isClassicAnchorEvent(e)) return;

    const anchor = findAnchor(e);
    if (!anchor) return;
    if (anchor.target && anchor.target !== '_self') return;
    if (anchor.hasAttribute('download')) return;

    const rawHref = anchor.getAttribute('href');
    if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('javascript:')) return;
    if (/^(roblox|roblox-player|mailto|tel):/i.test(rawHref)) return;

    // Links into Roblox Creator Hub open Creator Hub (now wrapped with the
    // classic chrome, never replaced).
    if (isCreateRoute(rawHref)) {
      if (isCreateHost()) return; // let Creator Hub handle its own navigation
      e.preventDefault();
      navigateWholePage(resolveCreateTarget(rawHref));
      return;
    }

    // Plus / payment / Robux purchase / place configuration pages keep their
    // original HTML, so they need a real top-level navigation to get the
    // classic chrome mounted around them.
    if (isChromeOnlyRoute(rawHref) || isHardPassthroughRoute(rawHref)) {
      e.preventDefault();
      navigateWholePage(rawHref);
      return;
    }

    // Inside the classic chrome every navigation is a real page load.
    if (isChromeMode()) {
      e.preventDefault();
      navigateWholePage(rawHref);
      return;
    }

    if (/^https?:\/\//i.test(rawHref)) {
      try {
        const u = new URL(rawHref);
        if (u.origin !== window.location.origin) return;
        if (u.search.includes('rbx_native=1')) return;
        e.preventDefault();
        navigateInternal(u.pathname + u.search + u.hash, false);
      } catch (_) {
        return;
      }
      return;
    }

    if (rawHref.startsWith('/')) {
      if (rawHref.includes('rbx_native=1')) return;
      e.preventDefault();
      navigateInternal(rawHref, false);
    }
  });
}

function resolveHrefInput(url, as) {
  const target = as || url;
  if (typeof target === 'string') return target;
  if (target && typeof target === 'object') {
    const pathname = target.pathname || '/';
    const q = target.query ? new URLSearchParams(target.query).toString() : '';
    return pathname + (q ? '?' + q : '');
  }
  return '/';
}

export function navigateInternal(rawUrl, replace = false) {
  if (typeof window === 'undefined') return Promise.resolve(true);
  const url = resolveHrefInput(rawUrl);

  if (isCreateRoute(url)) {
    window.location.href = resolveCreateTarget(url);
    return Promise.resolve(true);
  }

  if (isChromeOnlyRoute(url) || isHardPassthroughRoute(url)) {
    navigateWholePage(url);
    return Promise.resolve(true);
  }

  // The classic chrome has no page renderer, so every link inside it must load
  // a real page (which then lets the full classic UI take over).
  if (isChromeMode()) {
    navigateWholePage(url);
    return Promise.resolve(true);
  }

  if (/^https?:\/\//i.test(url)) {
    try {
      const parsed = new URL(url);
      if (parsed.origin !== window.location.origin) {
        window.location.href = url;
        return Promise.resolve(true);
      }
      const rel = parsed.pathname + parsed.search + parsed.hash;
      return navigateInternal(rel, replace);
    } catch (_) {
      window.location.href = url;
      return Promise.resolve(true);
    }
  }

  const nextUrl = url.startsWith('/') ? url : '/' + url;
  const currentFull = window.location.pathname + window.location.search + window.location.hash;
  if (nextUrl === currentFull) {
    return Promise.resolve(true);
  }

  emitEvent('routeChangeStart', nextUrl);
  if (replace) {
    window.history.replaceState({}, '', nextUrl);
  } else {
    window.history.pushState({}, '', nextUrl);
    window.scrollTo(0, 0);
  }
  notifyListeners();
  emitEvent('routeChangeComplete', nextUrl);
  return Promise.resolve(true);
}

const Router = {
  get pathname() {
    return currentState.pathname;
  },
  get asPath() {
    return currentState.asPath;
  },
  get query() {
    return currentState.query;
  },
  isReady: true,
  push(url, as) {
    return navigateInternal(resolveHrefInput(url, as), false);
  },
  replace(url, as) {
    return navigateInternal(resolveHrefInput(url, as), true);
  },
  reload() {
    if (typeof window !== 'undefined') window.location.reload();
  },
  back() {
    if (typeof window !== 'undefined') window.history.back();
  },
  prefetch() {
    return Promise.resolve();
  },
  events: {
    on(type, fn) {
      if (eventHandlers[type]) eventHandlers[type].add(fn);
    },
    off(type, fn) {
      if (eventHandlers[type]) eventHandlers[type].delete(fn);
    },
    emit: emitEvent,
  },
};

export function useRouter() {
  const [state, setState] = useState(() => getLocationState());

  useEffect(() => {
    const handler = (next) => setState(next);
    listeners.add(handler);
    // Sync in case route changed before effect attached
    setState(getLocationState());
    return () => {
      listeners.delete(handler);
    };
  }, []);

  return useMemo(
    () => ({
      pathname: state.pathname,
      route: state.pageKey,
      asPath: state.asPath,
      query: state.query,
      isReady: true,
      basePath: '',
      push: Router.push,
      replace: Router.replace,
      reload: Router.reload,
      back: Router.back,
      prefetch: Router.prefetch,
      events: Router.events,
    }),
    [state]
  );
}

export default Router;
