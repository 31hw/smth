import config from './config';
import { getAssetUrl } from './assetUrl';

let _csrf =
  typeof document !== 'undefined' && document.documentElement?.dataset?.rbxCsrf
    ? document.documentElement.dataset.rbxCsrf
    : '';

export const getCsrfToken = () => _csrf;
export const setCsrfToken = (token) => {
  if (token) _csrf = token;
};

export const getFullUrl = (service, url) => {
  return config.publicRuntimeConfig.backend.apiFormat
    .replace(/\{0\}/g, service)
    .replace(/\{1\}/g, url);
};

export const getBaseUrl = () => {
  return config.publicRuntimeConfig.backend.baseUrl;
};

export const getBaseUrl2 = (str) => {
  return (
    config.publicRuntimeConfig.backend.baseUrl +
    (str.charAt(0) === '/' ? str : '/' + str)
  );
};

export const getUrlWithProxy = (url) => {
  return url;
};

function isExtensionContext() {
  return (
    typeof chrome !== 'undefined' &&
    Boolean(chrome.runtime) &&
    typeof chrome.runtime.sendMessage === 'function' &&
    Boolean(chrome.runtime.id)
  );
}

function sendViaBackground(payload) {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(payload, (resp) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (!resp) {
          reject(new Error('Empty response from extension background worker'));
          return;
        }
        resolve(resp);
      });
    } catch (err) {
      reject(err);
    }
  });
}

async function performRawRequest(method, url, data, extraHeaders = {}) {
  const upperMethod = String(method || 'GET').toUpperCase();

  if (typeof url === 'string' && /^\/(img|fonts|js|markdown)\//.test(url)) {
    url = getAssetUrl(url);
  }

  // Route Roblox & rbxcdn API calls through the Edge MV3 background service worker
  // (attaches .ROBLOSECURITY cookies, Origin/Referer headers, and handles CSRF retries)
  if (
    isExtensionContext() &&
    !(typeof FormData !== 'undefined' && data instanceof FormData) &&
    /^https?:\/\/([a-z0-9-]+\.)*(roblox\.com|rbxcdn\.com)(\/|$)/i.test(url)
  ) {
    const bgResp = await sendViaBackground({
      type: 'ROBLOX_API_FETCH',
      method: upperMethod,
      url,
      data,
      csrfToken: _csrf,
      headers: extraHeaders,
    });
    if (bgResp.csrfToken) {
      _csrf = bgResp.csrfToken;
    }
    if (bgResp.networkError) {
      throw new Error(bgResp.networkError);
    }
    return {
      status: bgResp.status,
      headers: bgResp.headers || {},
      data: bgResp.data,
    };
  }

  const headers = { ...extraHeaders };
  if (_csrf) {
    headers['x-csrf-token'] = _csrf;
  }

  let body = undefined;
  if (upperMethod !== 'GET' && upperMethod !== 'HEAD' && typeof data !== 'undefined') {
    if (typeof FormData !== 'undefined' && data instanceof FormData) {
      body = data;
    } else if (typeof data === 'string') {
      body = data;
      if (!headers['content-type']) headers['content-type'] = 'application/json';
    } else {
      body = JSON.stringify(data);
      if (!headers['content-type']) headers['content-type'] = 'application/json';
    }
  }

  const resp = await fetch(url, {
    method: upperMethod,
    headers,
    body,
    credentials: 'include',
  });

  const respHeaders = {};
  resp.headers.forEach((v, k) => {
    respHeaders[k.toLowerCase()] = v;
  });

  const text = await resp.text();
  let parsed = text;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch (_) {
    parsed = text;
  }

  return {
    status: resp.status,
    headers: respHeaders,
    data: parsed,
  };
}

const request = async (method, url, data, verbose = false, _retried = false) => {
  const result = await performRawRequest(method, url, data);

  if (result.status === 403 && result.headers['x-csrf-token'] && !_retried) {
    _csrf = result.headers['x-csrf-token'];
    return request(method, url, data, verbose, true);
  }

  if (result.status >= 200 && result.status < 300) {
    return result;
  }

  const err = new Error(`Request failed with status code ${result.status}`);
  err.response = result;

  if (result.data && Array.isArray(result.data.errors) && result.data.errors.length > 0) {
    const first = result.data.errors[0];
    err.message = `${err.message}: ${first.code}: ${first.message}`;
    if (verbose && String(result.status)[0] !== '5') {
      return result;
    }
  }

  throw err;
};

export default request;
