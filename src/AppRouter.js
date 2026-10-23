import React, { useEffect, useState } from 'react';
import { JssProvider, jss } from 'react-jss';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime.js';
import { useRouter } from 'next/router';
import { createAssetUrlJssPlugin, getAssetUrl } from './lib/assetUrl';

import Navbar from './components/navbar';
import Footer from './components/footer';
import MainWrapper from './components/mainWrapper';
import GlobalAlert from './components/globalAlert';
import Chat from './components/chat';

import LoginModalStore from './stores/loginModal';
import AuthenticationStore from './stores/authentication';
import NavigationStore from './stores/navigation';
import ThumbnailStore from './stores/thumbnailStore';
import FeedbackStore from './stores/feedback';

import {
  fontStyle,
  getAccentColor,
  getEra,
  getFontStyle,
  getTheme,
  themeType,
} from './services/theme';
import { syncThemeFromRobloxAccount } from './services/themeSync';
import { applyThemeCssVariables } from './services/themeCss';

// Pages
import IndexPage from './pages/index';
import HomePage from './pages/home';
import LoginPage from './pages/login';
import GamesIndexPage from './pages/games/index';
import GameDetailsPage from './pages/games/[assetId]/[name]';
import CatalogIndexPage from './pages/catalog/index';
import CatalogItemPage from './pages/catalog/[assetId]/[name]';
import LibraryItemPage from './pages/library/[assetId]/[name]';
import UserProfilePage from './pages/users/[userId]/profile';
import UserFriendsPage from './pages/users/[userId]/friends';
import MyFriendsShortcutPage from './pages/users/friends';
import UserInventoryPage from './pages/users/[userId]/inventory';
import UserFavoritesPage from './pages/users/[userId]/favorites';
import UserLegacyRedirectPage from './pages/User.aspx';
import MyAvatarPage from './pages/My/Avatar';
import MyCharacterPage from './pages/My/Character.aspx';
import MyAccountPage from './pages/My/Account';
import MyMessagesPage from './pages/My/Messages';
import ComposeMessagePage from './pages/messages/compose';
import MyMoneyPage from './pages/My/Money.aspx';
import MyTradesPage from './pages/My/Trades.aspx';
import TradeWindowPage from './pages/Trade/TradeWindow.aspx';
import MyItemPage from './pages/My/Item.aspx';
import CurrencyExchangePage from './pages/My/CurrencyExchange.aspx';
import GroupAuditPage from './pages/Groups/Audit.aspx';
import GroupAdminPage from './pages/My/GroupAdmin.aspx';
import CreateGroupPage from './pages/My/CreateGroup.aspx';
import SearchGroupsPage from './pages/search/groups';
import MyGroupsPage from './pages/My/Groups.aspx';
import GroupEmbedPage from './pages/Groups/[id]/[name]';
import SearchUsersPage from './pages/search/users';
import BadgesPage from './pages/Badges.aspx';
import CollectiblesPage from './pages/collectibles';
import PromoCodesPage from './pages/promocodes';
import BuildersClubUpgradePage from './pages/BuildersClub/Upgrade.ashx';
import ReportCenterPage from './pages/internal/report-center';
import ForumDefaultPage from './pages/Forum/Default.aspx';
import ForumShowForumPage from './pages/Forum/ShowForum.aspx';
import ForumShowPostPage from './pages/Forum/ShowPost.aspx';
import ForumAddPostPage from './pages/Forum/AddPost.aspx';
import ForumMyForumsPage from './pages/Forum/MyForums.aspx';
import DownloadPage from './pages/download';
import DownloadThankYouPage from './pages/download/thankyou';
import RequestErrorPage from './pages/request-error';
import NotFoundPage from './pages/404';

dayjs.extend(relativeTime);
jss.use(createAssetUrlJssPlugin());

const PAGE_REGISTRY = {
  '/': IndexPage,
  '/home': HomePage,
  '/login': LoginPage,
  '/games': GamesIndexPage,
  '/games/[assetId]/[name]': GameDetailsPage,
  '/catalog': CatalogIndexPage,
  '/catalog/[assetId]/[name]': CatalogItemPage,
  '/library/[assetId]/[name]': LibraryItemPage,
  '/users/friends': MyFriendsShortcutPage,
  '/users/[userId]/profile': UserProfilePage,
  '/users/[userId]/friends': UserFriendsPage,
  '/users/[userId]/inventory': UserInventoryPage,
  '/users/[userId]/favorites': UserFavoritesPage,
  '/User.aspx': UserLegacyRedirectPage,
  '/My/Avatar': MyAvatarPage,
  '/My/Character.aspx': MyCharacterPage,
  '/My/Account': MyAccountPage,
  '/My/Messages': MyMessagesPage,
  '/messages/compose': ComposeMessagePage,
  '/My/Money.aspx': MyMoneyPage,
  '/My/Trades.aspx': MyTradesPage,
  '/Trade/TradeWindow.aspx': TradeWindowPage,
  '/My/Item.aspx': MyItemPage,
  '/My/CurrencyExchange.aspx': CurrencyExchangePage,
  '/Groups/Audit.aspx': GroupAuditPage,
  '/My/GroupAdmin.aspx': GroupAdminPage,
  '/My/CreateGroup.aspx': CreateGroupPage,
  '/search/groups': SearchGroupsPage,
  '/My/Groups.aspx': MyGroupsPage,
  '/Groups/[id]/[name]': GroupEmbedPage,
  '/search/users': SearchUsersPage,
  '/Badges.aspx': BadgesPage,
  '/collectibles': CollectiblesPage,
  '/promocodes': PromoCodesPage,
  '/BuildersClub/Upgrade.ashx': BuildersClubUpgradePage,
  '/internal/report-center': ReportCenterPage,
  '/Forum/Default.aspx': ForumDefaultPage,
  '/Forum/ShowForum.aspx': ForumShowForumPage,
  '/Forum/ShowPost.aspx': ForumShowPostPage,
  '/Forum/AddPost.aspx': ForumAddPostPage,
  '/Forum/MyForums.aspx': ForumMyForumsPage,
  '/download': DownloadPage,
  '/download/thankyou': DownloadThankYouPage,
  '/request-error': RequestErrorPage,
  '/404': NotFoundPage,
};

class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error) {
    if (typeof window !== 'undefined') {
      window.__RBX_LAST_RENDER_ERROR__ = error;
    }
    console.error('[classic-ui] Unhandled render error', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="container mt-4">
          <div className="section-content">
            <h3 style={{ marginBottom: 8 }}>Something went wrong</h3>
            <p style={{ margin: 0 }}>
              Please refresh the page or navigate back to <a href="/home">Home</a>.
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function applyDocumentTheme(disableWebsiteTheming = false) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const body = document.body;
  if (!body) return;

  const era = getEra();
  const theme = getTheme();
  const font = getFontStyle();
  const accent = getAccentColor();

  root.dataset.rbxEra = era;
  root.dataset.rbxTheme = theme;
  body.dataset.rbxEra = era;
  body.dataset.rbxTheme = theme;

  // Font class
  Object.values(fontStyle).forEach((f) => body.classList.remove(`font-${f.replace(/\s+/g, '-')}`));
  body.classList.add(`font-${font.replace(/\s+/g, '-')}`);

  // Theme CSS variables (shared with the native-page classic chrome)
  applyThemeCssVariables(root, { theme, era, accent });

  // Body background & color
  if (disableWebsiteTheming) {
    body.style.background = '#0d2231';
    body.style.color = '#ffffff';
  } else if (theme === themeType.obc2016) {
    const obcBg = getAssetUrl('/img/Unofficial/obc_theme_2016_bg.png');
    body.style.background = `url("${obcBg}") repeat-x #222224`;
    body.style.color = '#ffffff';
  } else if (theme === themeType.dark2019) {
    body.style.background = '#191b1d';
    body.style.color = '#ffffff';
  } else {
    body.style.background = era === '2019' ? '#f2f4f5' : '#e3e3e3';
    body.style.color = era === '2019' ? '#393b3d' : '#191919';
  }
}

export default function AppRouter() {
  const router = useRouter();
  const [themeRevision, setThemeRevision] = useState(0);

  const ActiveComponent = PAGE_REGISTRY[router.route] || NotFoundPage;
  const disableWebsiteTheming = Boolean(ActiveComponent.disableWebsiteTheming);

  useEffect(() => {
    applyDocumentTheme(disableWebsiteTheming);
  }, [router.asPath, themeRevision, disableWebsiteTheming]);

  // Sync initial theme from real Roblox account (SSR class + accountsettings.roblox.com/v1/themes/user) if not manually overridden in Settings
  useEffect(
    () =>
      syncThemeFromRobloxAccount(() => {
        applyDocumentTheme(disableWebsiteTheming);
        setThemeRevision((r) => r + 1);
      }),
    []
  );

  useEffect(() => {
    const onThemeChange = () => {
      applyDocumentTheme(disableWebsiteTheming);
      setThemeRevision((r) => r + 1);
    };
    window.addEventListener('rbx-theme-change', onThemeChange);

    // Also listen for changes made from the Microsoft Edge Extension Popup!
    let storageListener = null;
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
        storageListener = (changes, area) => {
          if (area !== 'local') return;
          let changed = false;
          for (const [k, v] of Object.entries(changes)) {
            if (k.startsWith('rbx_')) {
              changed = true;
              if (v.newValue === null || typeof v.newValue === 'undefined') {
                localStorage.removeItem(k);
              } else {
                localStorage.setItem(k, String(v.newValue));
              }
            }
          }
          if (changed) onThemeChange();
        };
        chrome.storage.onChanged.addListener(storageListener);
      }
    } catch (_) {
      // ignore outside extension
    }

    return () => {
      window.removeEventListener('rbx-theme-change', onThemeChange);
      if (storageListener && typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
        chrome.storage.onChanged.removeListener(storageListener);
      }
    };
  }, [disableWebsiteTheming]);

  return (
    <JssProvider jss={jss}>
      <div
        key={`era-${getEra()}-theme-${getTheme()}-${themeRevision}`}
        style={disableWebsiteTheming ? { minHeight: '100vh' } : undefined}
      >
        <AuthenticationStore.Provider>
          {!disableWebsiteTheming && (
            <>
              <LoginModalStore.Provider>
                <NavigationStore.Provider>
                  <Navbar />
                </NavigationStore.Provider>
              </LoginModalStore.Provider>
              <GlobalAlert />
            </>
          )}
          <FeedbackStore.Provider>
            <MainWrapper
              disableTopPadding={disableWebsiteTheming}
              mainFlex={disableWebsiteTheming}
            >
              <ThumbnailStore.Provider>
                <GlobalErrorBoundary key={`${router.asPath}-${themeRevision}`}>
                  <ActiveComponent {...router.query} />
                </GlobalErrorBoundary>
                {!disableWebsiteTheming && <Chat />}
              </ThumbnailStore.Provider>
            </MainWrapper>
          </FeedbackStore.Provider>
          {!disableWebsiteTheming && <Footer />}
        </AuthenticationStore.Provider>
      </div>
    </JssProvider>
  );
}
