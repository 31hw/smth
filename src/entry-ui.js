import '../extension/public/fonts/gotham1.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/globals.css';
import './styles/helpers/textHelpers.css';
import './styles/roblox/icons.css';

import React from 'react';
import ReactDOM from 'react-dom';
import AppRouter from './AppRouter';
import { shouldInterceptLocation } from './routeMeta';
import { setCsrfToken } from './lib/request';
import { getAssetUrl } from './lib/assetUrl';

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

async function bootstrapClassicUI() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // Never replace Roblox Create or passthrough routes
  if (!shouldInterceptLocation(window.location)) {
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

bootstrapClassicUI();
