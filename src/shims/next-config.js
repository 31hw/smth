const runtimeConfig = {
  serverRuntimeConfig: {
    backend: {},
  },
  publicRuntimeConfig: {
    backend: {
      proxyEnabled: false,
      baseUrl: 'https://www.roblox.com',
      apiFormat: 'https://{0}.roblox.com{1}',
      flags: {
        myAccountPage2016Enabled: true,
        settingsPageThemeSelectorEnabled: true,
        launchUsingEsURI: true,
        clientSideRenderingEnabled: true,
        catalogGenreFilterSupported: true,
        catalogDetailsPageOwnersTabEnabled: true,
        catalogPageLimit: 28,
        catalogSaleCountVisibleFromDetailsEndpoint: false,
        catalogDetailsPageResellerLimit: 10,
        avatarPageInventoryLimit: 10,
        inventoryPageLimit: 24,
        friendsPageLimit: 18,
        groupsPageMemberCountLimit: 12,
        tradeWindowInventoryCollectibleLimit: 10,
        gameGenreFilterSupported: true,
        gameCustomSortDropdown: true,
        gameGenreFilterMethod: 'keyword',
        accessoriesEnabled: true,
        packagesEnabled: true,
        requireLoginThroughCookie: false,
        useSignalCoreForRealTimeChat: false,
        userProfileUserStatusEnabled: false,
        assetRedirectsEnabled: false,
        get showTicketBalace() {
          try {
            return localStorage.getItem('rbx_show_tix_v1') === 'true';
          } catch (_) {
            return false;
          }
        },
      },
    },
  },
};

export default function getConfig() {
  return runtimeConfig;
}
