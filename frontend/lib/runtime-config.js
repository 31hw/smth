const defaultFlags = {
  requireLoginThroughCookie: false,
  myAccountPage2016Enabled: true,
  catalogGenreFilterSupported: false,
  catalogPageLimit: 28,
  catalogSaleCountVisibleFromDetailsEndpoint: false,
  catalogDetailsPageResellerLimit: 10,
  avatarPageInventoryLimit: 10,
  friendsPageLimit: 25,
  settingsPageThemeSelectorEnabled: true,
  tradeWindowInventoryCollectibleLimit: 10,
  moneyPagePromotionTabVisible: false,
  gameGenreFilterMethod: 'keyword',
  gameGenreFilterSupported: true,
  avatarPageOutfitCreatedAtAvailable: false,
  catalogDetailsPageOwnersTabEnabled: false,
};

const webOrigin = process.env.NEXT_PUBLIC_WEB_ORIGIN || 'http://127.0.0.1:3000';
const apiOrigin = process.env.NEXT_PUBLIC_API_ORIGIN || 'http://127.0.0.1:3001';
const requestedConnectionMode = String(process.env.REVIVAL_CONNECTION_MODE || 'localhost').toLowerCase();
const connectionMode = ['localhost', 'tunnel'].includes(requestedConnectionMode) ? requestedConnectionMode : 'localhost';
const csrfKey = typeof window === 'undefined' ? process.env.REVIVAL_CSRF_KEY || '' : '';
const backendAuthorization = typeof window === 'undefined' ? process.env.REVIVAL_BACKEND_AUTHORIZATION : undefined;
const backendAuthorizationHeader = typeof window === 'undefined' ? process.env.REVIVAL_BACKEND_AUTHORIZATION_HEADER || 'authorization' : undefined;

const publicRuntimeConfig = {
  backend: {
    connectionMode,
    proxyEnabled: true,
    baseUrl: webOrigin,
    apiOrigin,
    apiFormat: `${apiOrigin}/api/{0}{1}`,
    flags: defaultFlags,
  },
};

const serverRuntimeConfig = {
  backend: {
    csrfKey,
    authorization: backendAuthorization,
    authorizationHeader: backendAuthorizationHeader || 'authorization',
  },
};

export { publicRuntimeConfig, serverRuntimeConfig };
export default { publicRuntimeConfig, serverRuntimeConfig };
