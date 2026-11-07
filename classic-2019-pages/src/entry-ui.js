import '../public/fonts/gotham1.css';
import './styles/bootstrap-pruned.css';
import './styles/globals.css';
import './styles/helpers/textHelpers.css';
import './styles/roblox/icons.css';

import React from 'react';
import ReactDOM from 'react-dom';
import { jss } from 'react-jss';
import AppRouter from './AppRouter';
import ChromeShell from './components/chromeShell';
import { shouldInterceptLocation, shouldMountChrome } from './routeMeta';
import { setCsrfToken } from './lib/request';
import { getAssetUrl } from './lib/assetUrl';
import { applyChromeTheme } from './services/chromeTheme';

const CHROME_HOST_ID = 'rbx-classic-chrome';

function captureRobloxSSRMetadata() {
  try {
    const ds = document.documentElement?.dataset || {};
    const csrfMeta = document.querySelector('meta[name="csrf-token"]');
    const tok =
      ds.rbxCsrf ||
      csrfMeta?.getAttribute('data-token') ||
      csrfMeta?.getAttribute('content') ||
      window.__RBX_INITIAL_CSRF__;
    if (tok) {
      setCsrfToken(tok);
    }

    if (!window.__RBX_INITIAL_USER__) {
      const userMeta = document.querySelector('meta[name="user-data"]');
      const uid = ds.rbxUserId || userMeta?.getAttribute('data-userid');
      const uname = ds.rbxUserName || userMeta?.getAttribute('data-name');
      const dname = ds.rbxDisplayName || userMeta?.getAttribute('data-displayname');
      if (uid && uname) {
        window.__RBX_INITIAL_USER__ = {
          id: Number(uid),
          name: uname,
          displayName: dname || uname,
        };
      }
    }

    if (document.body && document.documentElement) {
      if (document.body.classList.contains('dark-theme')) {
        document.documentElement.dataset.rbxSsrTheme = 'Dark';
      } else if (document.body.classList.contains('light-theme')) {
        document.documentElement.dataset.rbxSsrTheme = 'Light';
      }
    }
  } catch (_) {
    // ignore SSR metadata read errors
  }
}

async function syncExtensionSettingsToLocalStorage() {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const keys = [
        'rbx_ext_enabled_v1',
        'rbx_era_v1',
        'rbx_theme_v1',
        'rbx_theme_user_set_v1',
        'rbx_av_page_style_v1',
        'rbx_cat_page_style_v1',
        'rbx_game_page_style_v1',
        'rbx_font_style_v1',
        'rbx_logo_style_v1',
        'rbx_accent_color_v1',
      ];
      const stored = await new Promise((resolve) => {
        chrome.storage.local.get(keys, (items) => resolve(items || {}));
      });
      if (stored.rbx_ext_enabled_v1 === false || stored.rbx_ext_enabled_v1 === 'false') {
        return false;
      }
      for (const k of keys) {
        if (typeof stored[k] !== 'undefined' && stored[k] !== null) {
          localStorage.setItem(k, String(stored[k]));
        }
      }
    }
  } catch (_) {
    // ignore
  }
  return true;
}

function unhideNativePage() {
  const hideStyle = document.getElementById('rbx-classic-prehide');
  if (hideStyle) hideStyle.remove();
  if (document.documentElement) {
    document.documentElement.style.visibility = '';
    document.documentElement.style.opacity = '';
  }
}

function injectStylesheet(href) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

function injectChromeLayoutStyle() {
  if (document.getElementById('rbx-classic-chrome-layout')) return;
  const style = document.createElement('style');
  style.id = 'rbx-classic-chrome-layout';
  style.textContent = `
html[data-rbx-classic-chrome="1"] body {
  padding-top: var(--rbx-chrome-top, 40px) !important;
  padding-left: var(--rbx-chrome-left, 0px) !important;
  padding-bottom: var(--rbx-chrome-footer, 0px) !important;
  box-sizing: border-box !important;
}
html[data-rbx-classic-chrome="1"][data-rbx-chrome-host="www"] body > header,
html[data-rbx-classic-chrome="1"][data-rbx-chrome-host="www"] header[role="banner"],
html[data-rbx-classic-chrome="1"][data-rbx-chrome-host="www"] #header,
html[data-rbx-classic-chrome="1"][data-rbx-chrome-host="www"] .rbx-header,
html[data-rbx-classic-chrome="1"][data-rbx-chrome-host="www"] #navigation,
html[data-rbx-classic-chrome="1"][data-rbx-chrome-host="www"] body > footer,
html[data-rbx-classic-chrome="1"][data-rbx-chrome-host="www"] footer,
html[data-rbx-classic-chrome="1"][data-rbx-chrome-host="www"] #footer,
html[data-rbx-classic-chrome="1"][data-rbx-chrome-host="www"] .container-footer {
  display: none !important;
}
#rbx-classic-chrome {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 1030;
  pointer-events: none;
  overflow: visible;
}
`;
  (document.head || document.documentElement).appendChild(style);
}

function setupChromeLayout(host, shadow) {
  let lastSignature = '';

  const measure = () => {
    if (!document.body || !document.documentElement) return;

    const nav = shadow.querySelector('nav.navbar, [data-rbx-chrome="navbar"]');
    let navHeight = nav ? Math.round(nav.getBoundingClientRect().height) : 0;
    if (!navHeight) navHeight = 40;

    const footer = shadow.querySelector('[data-rbx-chrome="footer"]');
    let footerHeight = 0;
    if (footer) {
      const rect = footer.getBoundingClientRect();
      let margins = 0;
      try {
        const styles = window.getComputedStyle(footer);
        margins = (parseFloat(styles.marginTop) || 0) + (parseFloat(styles.marginBottom) || 0);
      } catch (_) {
        margins = 0;
      }
      footerHeight = Math.round(rect.height + margins);
    }

    // The sidebar only exists for signed-in users, and below 1325px it opens
    // as an overlay (exactly like classic Roblox), so the page is only offset
    // when the fixed sidebar is actually visible.
    const sidebarCard = shadow.querySelector('[data-rbx-chrome="sidebar-card"]');
    let sidebarWidth = 0;
    if (sidebarCard && (window.innerWidth || 0) > 1324) {
      const rect = sidebarCard.getBoundingClientRect();
      if (rect.width > 0) sidebarWidth = Math.round(rect.width);
    }

    const docHeight = Math.max(
      document.documentElement.scrollHeight || 0,
      document.body.scrollHeight || 0,
      window.innerHeight || 0
    );

    const signature = `${navHeight}|${footerHeight}|${sidebarWidth}|${docHeight}|${window.innerWidth}`;
    if (signature === lastSignature) return;
    lastSignature = signature;

    document.documentElement.style.setProperty('--rbx-chrome-top', `${navHeight}px`);
    document.documentElement.style.setProperty('--rbx-chrome-left', `${sidebarWidth}px`);
    document.documentElement.style.setProperty('--rbx-chrome-footer', `${footerHeight}px`);
    host.style.height = `${docHeight}px`;
  };

  let frame = 0;
  const schedule = () => {
    if (frame) return;
    const raf = window.requestAnimationFrame || ((fn) => window.setTimeout(fn, 16));
    frame = raf(() => {
      frame = 0;
      measure();
    });
  };

  window.addEventListener('resize', schedule);

  try {
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(schedule);
      observer.observe(document.body);
    }
  } catch (_) {
    // ignore
  }

  try {
    const observer = new MutationObserver(schedule);
    observer.observe(shadow, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class'],
    });
  } catch (_) {
    // ignore
  }

  schedule();
  window.setTimeout(schedule, 120);
  window.setTimeout(schedule, 600);
  window.setTimeout(schedule, 1800);
}

function watchChromeRoute(host) {
  let lastHref = window.location.href;
  const timer = window.setInterval(() => {
    const href = window.location.href;
    if (href !== lastHref) {
      lastHref = href;
      if (!shouldMountChrome(window.location)) {
        window.clearInterval(timer);
        window.location.reload();
        return;
      }
    }
    if (!host.isConnected && document.body) {
      document.body.appendChild(host);
    }
  }, 700);
}

function rewriteCreateLinks(shadow) {
  const rewrite = () => {
    const anchors = shadow.querySelectorAll('a[href^="/"]');
    for (const anchor of anchors) {
      const href = anchor.getAttribute('href');
      if (href && href.charAt(0) === '/') {
        anchor.setAttribute('href', `https://www.roblox.com${href}`);
      }
    }
  };
  rewrite();
  try {
    const observer = new MutationObserver(rewrite);
    observer.observe(shadow, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['href'],
    });
  } catch (_) {
    // ignore
  }
}

function bootstrapChrome() {
  if (document.getElementById(CHROME_HOST_ID) || !document.body) return;

  captureRobloxSSRMetadata();

  const isCreateHost = (window.location.hostname || '').toLowerCase() === 'create.roblox.com';

  document.documentElement.dataset.rbxClassicChrome = '1';
  document.documentElement.dataset.rbxChromeHost = isCreateHost ? 'create' : 'www';

  injectChromeLayoutStyle();

  const host = document.createElement('div');
  host.id = CHROME_HOST_ID;
  host.setAttribute('data-rbx-chrome-host', isCreateHost ? 'create' : 'www');
  host.style.cssText =
    'position:absolute;top:0;left:0;width:100%;z-index:1030;pointer-events:none;visibility:hidden;';
  document.body.appendChild(host);

  let shadow = null;
  try {
    shadow = host.attachShadow({ mode: 'open' });
  } catch (_) {
    shadow = null;
  }
  if (!shadow) {
    host.remove();
    return;
  }

  if (typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.getURL === 'function') {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL('bundles/content-ui.css');
    shadow.appendChild(link);

    const reveal = () => {
      host.style.visibility = 'visible';
    };
    link.addEventListener('load', reveal, { once: true });
    link.addEventListener('error', reveal, { once: true });
    window.setTimeout(reveal, 120);
  }

  const baseStyle = document.createElement('style');
  baseStyle.textContent = `
:host { pointer-events: none; }
nav.navbar,
[data-rbx-chrome="navbar"],
[data-rbx-chrome="sidebar"],
[data-rbx-chrome="sidebar-card"],
[data-rbx-chrome="sidebar-toggle"],
[data-rbx-chrome="footer"] {
  pointer-events: auto !important;
}
a, button, input, select, textarea, [role="button"] {
  pointer-events: auto;
}
`;
  shadow.appendChild(baseStyle);

  // JSS inserts generated <style> nodes right after its insertion point, so
  // anchor it to a real element inside the shadow root (a ShadowRoot itself is
  // not a valid insertion point).
  const jssPoint = document.createElement('span');
  jssPoint.id = 'rbx-chrome-jss';
  shadow.appendChild(jssPoint);

  const rootEl = document.createElement('div');
  rootEl.id = 'rbx-chrome-app';
  // The host has a definite pixel height (document height), so give the app a
  // definite 100% height. This lets ChromeShell's flex spacer push the classic
  // footer all the way to the bottom of the page instead of right below the
  // navbar.
  rootEl.style.cssText = 'height:100%;min-height:100%;';
  shadow.appendChild(rootEl);

  applyChromeTheme(host);

  // react-jss must inject its generated styles inside the shadow root so the
  // classic styles can never touch the original page.
  try {
    jss.setup({ insertionPoint: jssPoint });
  } catch (_) {
    // ignore; chrome still renders with the bundled stylesheet
  }

  ReactDOM.render(<ChromeShell host={host} />, rootEl);

  if (!host.style.visibility || host.style.visibility === 'hidden') {
    window.setTimeout(() => {
      host.style.visibility = 'visible';
    }, 120);
  }

  setupChromeLayout(host, shadow);
  watchChromeRoute(host);

  if (isCreateHost) {
    rewriteCreateLinks(shadow);
  }

  window.__RBX_CLASSIC_ACTIVE__ = true;
  window.__RBX_CLASSIC_CHROME__ = true;
}

async function bootstrapClassicUI() {
  if (!document.body) return;

  captureRobloxSSRMetadata();

  window.__RBX_CLASSIC_ACTIVE__ = true;

  // Wipe modern Roblox HTML (<head> and <body>) and mount the classic UI shell
  document.head.innerHTML = '';

  const charsetMeta = document.createElement('meta');
  charsetMeta.setAttribute('charset', 'utf-8');
  document.head.appendChild(charsetMeta);

  const vpMeta = document.createElement('meta');
  vpMeta.name = 'viewport';
  vpMeta.content = 'width=device-width, initial-scale=1';
  document.head.appendChild(vpMeta);

  const titleEl = document.createElement('title');
  titleEl.textContent = 'ROBLOX';
  document.head.appendChild(titleEl);

  const favEl = document.createElement('link');
  favEl.rel = 'icon';
  favEl.href = getAssetUrl('/img/logo_R.svg');
  document.head.appendChild(favEl);

  if (typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.getURL === 'function') {
    injectStylesheet(chrome.runtime.getURL('bundles/content-ui.css'));
  }

  document.documentElement.className = '';
  document.documentElement.removeAttribute('style');
  document.body.className = '';
  document.body.removeAttribute('style');
  document.body.innerHTML = '<div id="__next"></div>';

  const rootEl = document.getElementById('__next');
  ReactDOM.render(<AppRouter />, rootEl);
}

async function bootstrap() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const location = window.location;
  const chromeMode = shouldMountChrome(location);
  const fullClassicMode = shouldInterceptLocation(location);

  if (!chromeMode && !fullClassicMode) {
    unhideNativePage();
    return;
  }

  const isEnabled = await syncExtensionSettingsToLocalStorage();
  if (!isEnabled) {
    unhideNativePage();
    return;
  }

  if (!document.body) {
    await new Promise((resolve) => {
      if (document.readyState !== 'loading') return resolve();
      document.addEventListener('DOMContentLoaded', resolve, { once: true });
    });
  }

  // Re-check after the async settings read: Roblox's client-side router may
  // have changed the URL in the meantime.
  if (shouldMountChrome(location)) {
    bootstrapChrome();
    return;
  }
  if (!shouldInterceptLocation(location)) {
    unhideNativePage();
    return;
  }

  await bootstrapClassicUI();
}

bootstrap();
