const ROBLOX_LOCALE_CODES = new Set([
  'ar', 'de', 'en', 'en-us', 'en-gb', 'es', 'es-es', 'es-mx',
  'fr', 'id', 'it', 'ja', 'ko', 'pl', 'pt', 'pt-br',
  'ru', 'th', 'tr', 'uk', 'vi', 'zh', 'zh-cn', 'zh-tw', 'zh-cjv',
]);

export function stripLocalePrefix(pathname) {
  if (!pathname || typeof pathname !== 'string') return '/';
  const cleaned = pathname.startsWith('/') ? pathname : '/' + pathname;
  const parts = cleaned.split('/');
  // parts[0] === ''
  const maybeLocale = (parts[1] || '').toLowerCase();
  if (ROBLOX_LOCALE_CODES.has(maybeLocale)) {
    const rest = '/' + parts.slice(2).join('/');
    return rest === '/' ? '/' : rest.replace(/\/+$/, '') || '/';
  }
  return cleaned.length > 1 ? cleaned.replace(/\/+$/, '') : '/';
}

const CREATE_PATH_PREFIXES = [
  '/create',
  '/develop',
  '/build',
  '/places/',
  '/universes/',
  '/game-pass/configure',
  '/ide/',
  '/my/createuserad.aspx',
];

// Native Roblox endpoints/flows we should never hijack as UI pages (including native Upgrade / Plus / Payment / Agreement pages)
const NATIVE_PASSTHROUGH_PREFIXES = [
  '/games/start',
  '/game/placelauncher',
  '/game/join',
  '/login/negotiate',
  '/plus',
  '/premium',
  '/upgrade',
  '/upgrades/paymentmethods',
  '/upgrades/redeem',
  '/modcreditagreement',
];

export function isNativePassthroughRoute(urlOrPath) {
  if (!urlOrPath || typeof urlOrPath !== 'string') return false;
  if (urlOrPath.includes('rbx_native=1')) return true;
  try {
    if (/^https?:\/\//i.test(urlOrPath)) {
      const u = new URL(urlOrPath);
      const host = u.hostname.toLowerCase();
      if (host && host !== 'www.roblox.com' && host !== 'web.roblox.com' && host !== 'roblox.com') {
        return true;
      }
      const p = stripLocalePrefix(u.pathname).toLowerCase();
      return NATIVE_PASSTHROUGH_PREFIXES.some((prefix) => p === prefix || p.startsWith(prefix + '/'));
    }
  } catch (_) {
    // ignore malformed URL
  }
  const pathOnly = urlOrPath.split('?')[0].split('#')[0];
  const p = stripLocalePrefix(pathOnly).toLowerCase();
  return NATIVE_PASSTHROUGH_PREFIXES.some((prefix) => p === prefix || p.startsWith(prefix + '/'));
}

export function isCreateRoute(urlOrPath) {
  if (!urlOrPath || typeof urlOrPath !== 'string') return false;
  try {
    if (/^https?:\/\//i.test(urlOrPath)) {
      const u = new URL(urlOrPath);
      if (u.hostname.toLowerCase() === 'create.roblox.com') return true;
      return isCreatePathname(u.pathname);
    }
  } catch (_) {
    // ignore malformed URL
  }
  const pathOnly = urlOrPath.split('?')[0].split('#')[0];
  return isCreatePathname(pathOnly);
}

export function isCreatePathname(rawPathname) {
  const p = stripLocalePrefix(rawPathname).toLowerCase();
  if (CREATE_PATH_PREFIXES.some((prefix) => p === prefix || p.startsWith(prefix.endsWith('/') ? prefix : prefix + '/'))) {
    return true;
  }
  if (/^\/users\/\d+\/canmanage(\/|$)/i.test(p)) return true;
  return false;
}

export function shouldInterceptLocation(loc) {
  if (!loc) return false;
  const host = (loc.hostname || '').toLowerCase();
  if (host === 'create.roblox.com') return false;

  const search = loc.search || '';
  if (search.includes('rbx_native=1')) return false;

  const p = stripLocalePrefix(loc.pathname || '/').toLowerCase();
  if (isCreatePathname(p)) return false;
  if (NATIVE_PASSTHROUGH_PREFIXES.some((prefix) => p === prefix || p.startsWith(prefix + '/'))) {
    return false;
  }
  return true;
}

// Ordered route definitions mapping classic + modern Roblox URLs to extracted page keys
const ROUTE_DEFS = [
  { key: '/', regex: /^\/$/i, params: [] },
  { key: '/home', regex: /^\/home$/i, params: [] },
  { key: '/login', regex: /^\/(?:login|newlogin)$/i, params: [] },

  // Games & Charts / Discover
  { key: '/games', regex: /^\/(?:games|discover|charts)(?:\/v2)?$/i, params: [] },
  { key: '/games/[assetId]/[name]', regex: /^\/games\/(\d+)(?:\/([^/?#]*))?$/i, params: ['assetId', 'name'] },
  { key: '/games', regex: /^\/(?:discover|charts)\/.+$/i, params: [] },

  // Catalog & Marketplace
  { key: '/catalog', regex: /^\/(?:catalog|marketplace)$/i, params: [] },
  { key: '/catalog/[assetId]/[name]', regex: /^\/(?:catalog|bundles|game-pass)\/(\d+)(?:\/([^/?#]*))?$/i, params: ['assetId', 'name'] },
  { key: '/library/[assetId]/[name]', regex: /^\/(?:library|marketplace\/asset)\/(\d+)(?:\/([^/?#]*))?$/i, params: ['assetId', 'name'] },

  // Users
  { key: '/users/friends', regex: /^\/users\/friends$/i, params: [] },
  { key: '/users/[userId]/profile', regex: /^\/users\/(\d+)\/profile$/i, params: ['userId'] },
  { key: '/users/[userId]/friends', regex: /^\/users\/(\d+)\/friends$/i, params: ['userId'] },
  { key: '/users/[userId]/inventory', regex: /^\/users\/(\d+)\/inventory$/i, params: ['userId'] },
  { key: '/users/[userId]/favorites', regex: /^\/users\/(\d+)\/favorites$/i, params: ['userId'] },
  { key: '/User.aspx', regex: /^\/user\.aspx$/i, params: [] },

  // My / Avatar / Account / Messages / Money / Trades
  { key: '/My/Avatar', regex: /^\/my\/avatar$/i, params: [] },
  { key: '/My/Character.aspx', regex: /^\/my\/character(?:\.aspx)?$/i, params: [] },
  { key: '/My/Account', regex: /^\/my\/account(?:\.aspx)?$/i, params: [] },
  { key: '/My/Messages', regex: /^\/my\/messages(?:\.aspx)?$/i, params: [] },
  { key: '/messages/compose', regex: /^\/messages\/compose$/i, params: [] },
  { key: '/My/Money.aspx', regex: /^\/(?:my\/money(?:\.aspx)?|transactions)$/i, params: [] },
  { key: '/My/Trades.aspx', regex: /^\/(?:my\/trades(?:\.aspx)?|trades)$/i, params: [] },
  { key: '/Trade/TradeWindow.aspx', regex: /^\/trade\/tradewindow(?:\.aspx)?$/i, params: [] },
  { key: '/My/Item.aspx', regex: /^\/my\/item(?:\.aspx)?$/i, params: [] },
  { key: '/My/CurrencyExchange.aspx', regex: /^\/my\/currencyexchange(?:\.aspx)?$/i, params: [] },

  // Groups & Communities
  { key: '/Groups/Audit.aspx', regex: /^\/(?:groups|communities)\/audit(?:\.aspx)?$/i, params: [] },
  { key: '/My/GroupAdmin.aspx', regex: /^\/(?:my\/groupadmin(?:\.aspx)?|(?:groups|communities)\/configure)$/i, params: [] },
  { key: '/My/CreateGroup.aspx', regex: /^\/(?:my\/creategroup(?:\.aspx)?|(?:groups|communities)\/create)$/i, params: [] },
  { key: '/search/groups', regex: /^\/(?:search\/(?:groups|communities)|(?:groups|communities)\/search)$/i, params: [] },
  { key: '/My/Groups.aspx', regex: /^\/(?:my\/groups(?:\.aspx)?|my\/communities|communities|groups)$/i, params: [] },
  { key: '/Groups/[id]/[name]', regex: /^\/(?:groups|communities)\/(\d+)(?:\/([^/?#]*))?$/i, params: ['id', 'name'] },

  // Search
  { key: '/search/users', regex: /^\/search\/users$/i, params: [] },

  // Badges, Collectibles, Promocodes, Robux, Upgrade, Report
  { key: '/Badges.aspx', regex: /^\/badges(?:\.aspx)?(?:\/(\d+)(?:\/([^/?#]*))?)?$/i, params: ['badgeId', 'name'] },
  { key: '/collectibles', regex: /^\/(?:collectibles|internal\/collectibles)$/i, params: [] },
  { key: '/promocodes', regex: /^\/(?:promocodes|redeem)$/i, params: [] },
  { key: '/upgrades/robux', regex: /^\/upgrades\/robux$/i, params: [] },
  { key: '/BuildersClub/Upgrade.ashx', regex: /^\/(?:buildersclub\/upgrade\.ashx|internal\/membership)$/i, params: [] },
  { key: '/internal/report-center', regex: /^\/(?:internal\/report-center|abusereport(?:\/.*)?)$/i, params: [] },

  // Forums
  { key: '/Forum/Default.aspx', regex: /^\/forum(?:\/(?:default|forumgroup)\.aspx)?$/i, params: [] },
  { key: '/Forum/ShowForum.aspx', regex: /^\/forum\/showforum\.aspx$/i, params: [] },
  { key: '/Forum/ShowPost.aspx', regex: /^\/forum\/showpost\.aspx$/i, params: [] },
  { key: '/Forum/AddPost.aspx', regex: /^\/forum\/addpost\.aspx$/i, params: [] },
  { key: '/Forum/MyForums.aspx', regex: /^\/forum\/myforums\.aspx$/i, params: [] },

  // Download & Help & Error
  { key: '/download', regex: /^\/download$/i, params: [] },
  { key: '/download/thankyou', regex: /^\/download\/thankyou$/i, params: [] },
  { key: '/request-error', regex: /^\/request-error$/i, params: [] },
];

export function parseQueryObject(search) {
  const query = {};
  if (!search) return query;
  const sp = new URLSearchParams(search.startsWith('?') ? search : '?' + search);
  for (const [k, v] of sp.entries()) {
    query[k] = v;
    const lower = k.toLowerCase();
    if (!(lower in query)) query[lower] = v;
  }
  return query;
}

export function matchRoute(rawPathname, search = '') {
  const pathname = stripLocalePrefix(rawPathname || '/');
  const query = parseQueryObject(search);

  for (const def of ROUTE_DEFS) {
    const m = pathname.match(def.regex);
    if (m) {
      def.params.forEach((paramName, idx) => {
        const val = m[idx + 1];
        if (typeof val !== 'undefined') {
          query[paramName] = decodeURIComponent(val);
        } else if (paramName === 'name') {
          query[paramName] = 'unnamed';
        }
      });
      return {
        pageKey: def.key,
        pathname: def.key,
        asPath: pathname + (search || ''),
        query,
      };
    }
  }

  return {
    pageKey: '/404',
    pathname: '/404',
    asPath: pathname + (search || ''),
    query,
  };
}
