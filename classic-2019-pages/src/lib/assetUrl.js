const ASSET_PREFIX_RE = /^\/(img|fonts|js|markdown)\//;
const CSS_URL_RE = /url\(\s*(['"]?)(\/(?:img|fonts|js|markdown)\/[^'")]+)\1\s*\)/g;

export function getAssetUrl(path) {
  if (!path || typeof path !== 'string') return path;
  if (!ASSET_PREFIX_RE.test(path)) return path;

  const cleanPath = path.split('?')[0];
  if (
    typeof chrome !== 'undefined' &&
    chrome.runtime &&
    typeof chrome.runtime.getURL === 'function'
  ) {
    try {
      return chrome.runtime.getURL('public' + cleanPath);
    } catch (_) {
      return path;
    }
  }
  return path;
}

export function rewriteCssAssetUrls(cssValue) {
  if (typeof cssValue !== 'string' || !cssValue.includes('/')) return cssValue;
  return cssValue.replace(CSS_URL_RE, (_match, _quote, assetPath) => {
    return `url("${getAssetUrl(assetPath)}")`;
  });
}

export function createAssetUrlJssPlugin() {
  return {
    onProcessStyle(style) {
      if (!style || typeof style !== 'object') return style;
      for (const key of Object.keys(style)) {
        const val = style[key];
        if (typeof val === 'string') {
          style[key] = rewriteCssAssetUrls(val);
        }
      }
      return style;
    },
    onChangeValue(value) {
      if (typeof value === 'string') {
        return rewriteCssAssetUrls(value);
      }
      return value;
    },
  };
}
