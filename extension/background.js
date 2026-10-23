let _bgCsrfToken = '';

function isAllowedHost(rawUrl) {
  try {
    const u = new URL(rawUrl);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
    const h = u.hostname.toLowerCase();
    return (
      h === 'roblox.com' ||
      h.endsWith('.roblox.com') ||
      h === 'rbxcdn.com' ||
      h.endsWith('.rbxcdn.com')
    );
  } catch (_) {
    return false;
  }
}

async function doRobloxFetch({ method, url, data, csrfToken, headers = {} }, retried = false) {
  if (!isAllowedHost(url)) {
    return { status: 400, headers: {}, data: {}, networkError: 'Blocked non-Roblox URL' };
  }

  const upperMethod = String(method || 'GET').toUpperCase();
  const reqHeaders = {
    Accept: 'application/json, text/plain, */*',
    ...headers,
  };

  const activeCsrf = csrfToken || _bgCsrfToken;
  if (activeCsrf && upperMethod !== 'GET' && upperMethod !== 'HEAD') {
    reqHeaders['x-csrf-token'] = activeCsrf;
  }

  let body = undefined;
  if (upperMethod !== 'GET' && upperMethod !== 'HEAD' && typeof data !== 'undefined') {
    if (typeof data === 'string') {
      body = data;
    } else {
      body = JSON.stringify(data);
    }
    if (!reqHeaders['content-type'] && !reqHeaders['Content-Type']) {
      reqHeaders['Content-Type'] = 'application/json';
    }
  }

  try {
    const resp = await fetch(url, {
      method: upperMethod,
      headers: reqHeaders,
      body,
      credentials: 'include',
    });

    const respHeaders = {};
    resp.headers.forEach((val, key) => {
      respHeaders[key.toLowerCase()] = val;
    });

    if (respHeaders['x-csrf-token']) {
      _bgCsrfToken = respHeaders['x-csrf-token'];
    }

    if (resp.status === 403 && respHeaders['x-csrf-token'] && !retried) {
      return doRobloxFetch(
        {
          method: upperMethod,
          url,
          data,
          csrfToken: respHeaders['x-csrf-token'],
          headers,
        },
        true
      );
    }

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
      csrfToken: _bgCsrfToken,
    };
  } catch (err) {
    return {
      status: 0,
      headers: {},
      data: null,
      networkError: err?.message || 'Network request failed',
    };
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== 'ROBLOX_API_FETCH') {
    return false;
  }
  doRobloxFetch(message).then(sendResponse);
  return true; // keep channel open for async response
});
