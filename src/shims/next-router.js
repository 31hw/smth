import { useEffect, useMemo, useState } from 'react';
import { isCreateRoute, isNativePassthroughRoute, matchRoute } from '../routeMeta';

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

  // Global delegated link interceptor so plain <a href="/..."> links also navigate cleanly
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return;
    }
    const anchor = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!anchor) return;
    if (anchor.target && anchor.target !== '_self') return;
    if (anchor.hasAttribute('download')) return;

    const rawHref = anchor.getAttribute('href');
    if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('javascript:')) return;
    if (/^(roblox|roblox-player|mailto|tel):/i.test(rawHref)) return;

    // Route Roblox Create links straight to official Roblox Creator Hub (not replaced!)
    if (isCreateRoute(rawHref)) {
      e.preventDefault();
      if (typeof window !== 'undefined' && window.location.hostname.endsWith('roblox.com')) {
        window.location.href = 'https://create.roblox.com/';
      } else {
        window.open('https://create.roblox.com/', '_blank', 'noopener');
      }
      return;
    }

    // Route native Upgrade / Roblox Premium (Plus) / Buy Robux links straight to Roblox's native page
    if (isNativePassthroughRoute(rawHref)) {
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
    if (window.location.hostname.endsWith('roblox.com')) {
      window.location.href = 'https://create.roblox.com/';
    } else {
      window.open('https://create.roblox.com/', '_blank', 'noopener');
    }
    return Promise.resolve(true);
  }

  if (isNativePassthroughRoute(url)) {
    window.location.href = url;
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
