import axios from 'axios';
import config from './config';

let _csrf = '';

/**
 * @param {string} service
 * @param {string} url
 * @returns {string}
 */
export const getFullUrl = (service, url) => {
    return config.publicRuntimeConfig.backend.apiFormat.replace(/\{0\}/g, service).replace(/\{1\}/g, url);
}

/**
 * @returns {string}
 */
export const getBaseUrl = () => {
    const backend = config.publicRuntimeConfig.backend;
    // In localhost mode use the origin the browser actually opened. This keeps
    // same-origin links working in local runs and in reverse-proxied previews.
    if (backend.connectionMode === 'localhost' && typeof window !== 'undefined') {
        return window.location.origin;
    }
    return backend.baseUrl;
}

/**
 * @param {string} str
 * @returns {string}
 */
export const getBaseUrl2 = (str) => {
    return getBaseUrl() + (str.charAt(0) === '/' ? str : '/' + str);
}

/**
 * @param {string} url
 * @returns {string}
 */
export const getUrlWithProxy = (url) => {
    const backend = config.publicRuntimeConfig.backend;
    if (backend.proxyEnabled) {
        let targetUrl = url;
        try {
            const webOrigin = new URL(backend.baseUrl).origin;
            const target = new URL(url, backend.baseUrl);
            // Older pages build a few service URLs from the site base URL.
            // Route those through the same local API prefix as getFullUrl().
            if (backend.connectionMode === 'localhost' && target.origin === webOrigin) {
                const apiOrigin = new URL(backend.apiOrigin);
                const apiPath = target.pathname.startsWith('/api/') ? target.pathname : `/api${target.pathname}`;
                targetUrl = new URL(`${apiPath}${target.search}${target.hash}`, apiOrigin).toString();
            }
        } catch {
            // Keep the original URL so the server-side proxy can reject it.
        }
        const prefix = typeof window !== 'undefined' ? '' : backend.baseUrl;
        return prefix + '/api/proxy?url=' + encodeURIComponent(targetUrl);
    }
    return url;
}

/**
 * @param {string} method
 * @param {string} url
 * @param {any?} data
 * @param {boolean?} verbose
 * @returns {Promise<axios.AxiosResponse<any>>}
 */
const request = async (method, url, data, verbose = false) => {
    const isBrowser = typeof window !== 'undefined';
    try {
        let headers = {
            'x-csrf-token': _csrf,
        }
        if (!isBrowser) {
            // Auth header, if required
            const authHeaderValue = config.serverRuntimeConfig.backend.authorization;
            if (typeof authHeaderValue === 'string')
                headers[config.serverRuntimeConfig.backend.authorizationHeader || 'authorization'] = authHeaderValue;
            // Custom user agent
            headers['user-agent'] = 'Roblox2016/1.0';
        }
        return await axios.request({
            method,
            url: getUrlWithProxy(url),
            data: data,
            headers: headers,
            maxRedirects: 0,
            timeout: 120000,
        });
    } catch (e) {
        if (e.response) {
            let resp = e.response;
            console.log(resp.headers)
            if (resp.status === 403 && resp.headers['x-csrf-token']) {
                _csrf = resp.headers['x-csrf-token'];
                return request(method, url, data);
            }
        }
        if (isBrowser) {
            // attempt to make errors easier to diagnose
            if (e.response) {
                // check for regular
                if (e.response.data && e.response.data.errors && e.response.data.errors.length) {
                    let err = e.response.data.errors[0]
                    e.message = e.message + ': ' + (err.code + ': ' + err.message);
                    // TODO: confirm this is causing issues
                    if (verbose && Number(String(e.response.status, "Could not parse response status")[0]) !== 5) {
                        return Promise.resolve(e.response);
                    }
                }
            }
            throw e;
        } else {
            throw new Error(e.message);
        }
    }
}

export default request;
