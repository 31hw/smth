(function () {
  'use strict';

  const LOCALE_CODES = new Set([
    'ar', 'de', 'en', 'en-us', 'en-gb', 'es', 'es-es', 'es-mx',
    'fr', 'id', 'it', 'ja', 'ko', 'pl', 'pt', 'pt-br',
    'ru', 'th', 'tr', 'uk', 'vi', 'zh', 'zh-cn', 'zh-tw', 'zh-cjv',
  ]);

  function stripLocale(pathname) {
    const cleaned = (pathname || '/').startsWith('/') ? pathname : '/' + pathname;
    const parts = cleaned.split('/');
    if (LOCALE_CODES.has((parts[1] || '').toLowerCase())) {
      const rest = '/' + parts.slice(2).join('/');
      return rest === '/' ? '/' : rest.replace(/\/+$/, '') || '/';
    }
    return cleaned.length > 1 ? cleaned.replace(/\/+$/, '') : '/';
  }

  function shouldIntercept() {
    const loc = window.location;
    if (!loc) return false;
    const host = (loc.hostname || '').toLowerCase();
    // Never replace Roblox Create!
    if (host === 'create.roblox.com') return false;
    if ((loc.search || '').includes('rbx_native=1')) return false;

    try {
      if (window.localStorage && window.localStorage.getItem('rbx_ext_enabled_v1') === 'false') {
        return false;
      }
    } catch (_) {
      // ignore storage access issues
    }

    const p = stripLocale(loc.pathname).toLowerCase();
    const createPrefixes = [
      '/create',
      '/develop',
      '/build',
      '/places/',
      '/universes/',
      '/game-pass/',
      '/ide/',
      '/my/createuserad.aspx',
    ];
    for (const prefix of createPrefixes) {
      if (p === prefix || p.startsWith(prefix.endsWith('/') ? prefix : prefix + '/')) {
        return false;
      }
    }
    if (/^\/users\/\d+\/canmanage(\/|$)/i.test(p)) return false;

    const passthrough = [
      '/games/start',
      '/game/placelauncher',
      '/game/join',
      '/login/negotiate',
      '/upgrades/paymentmethods',
    ];
    for (const prefix of passthrough) {
      if (p === prefix || p.startsWith(prefix + '/')) return false;
    }

    return true;
  }

  if (!shouldIntercept()) {
    return;
  }

  // Hide modern Roblox HTML immediately so there is zero flash of modern UI
  const prehide = document.createElement('style');
  prehide.id = 'rbx-classic-prehide';
  prehide.textContent = 'html { opacity: 0 !important; }';
  (document.head || document.documentElement).appendChild(prehide);

  // Capture SSR CSRF & User metadata and neutralize modern Roblox scripts/CSS before they execute
  const observer = new MutationObserver((mutations) => {
    // Once content-ui.js has mounted #__next, stop observing
    if (document.getElementById('__next')) {
      observer.disconnect();
      return;
    }

    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (!node || node.nodeType !== 1) continue;
        const tag = node.tagName;

        if (tag === 'META') {
          const name = (node.getAttribute('name') || '').toLowerCase();
          if (name === 'csrf-token') {
            const tok = node.getAttribute('data-token') || node.getAttribute('content');
            if (tok && document.documentElement) {
              document.documentElement.dataset.rbxCsrf = tok;
            }
          } else if (name === 'user-data') {
            const uid = node.getAttribute('data-userid');
            const uname = node.getAttribute('data-name');
            const dname = node.getAttribute('data-displayname');
            if (uid && document.documentElement) {
              document.documentElement.dataset.rbxUserId = uid;
              if (uname) document.documentElement.dataset.rbxUserName = uname;
              if (dname) document.documentElement.dataset.rbxDisplayName = dname;
            }
          }
        } else if (tag === 'SCRIPT') {
          const src = node.getAttribute('src') || '';
          if (!src.startsWith('chrome-extension://')) {
            node.type = 'javascript/blocked';
            node.removeAttribute('src');
            node.textContent = '';
            node.remove();
          }
        } else if (tag === 'LINK') {
          const rel = (node.getAttribute('rel') || '').toLowerCase();
          const href = node.getAttribute('href') || '';
          if (rel === 'stylesheet' && !href.startsWith('chrome-extension://')) {
            node.remove();
          }
        }
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  // Safety fallback: ensure observer disconnects and visibility is restored within 4s
  setTimeout(() => {
    observer.disconnect();
    const s = document.getElementById('rbx-classic-prehide');
    if (s) s.remove();
  }, 4000);
})();
