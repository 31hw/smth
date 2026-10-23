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
  hasUserCustomTheme,
  setTheme,
  themeType,
} from './services/theme';
import { getRobloxAccountTheme } from './services/accountSettings';

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
import BuyRobuxPage from './pages/upgrades/robux';
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
  '/upgrades/robux': BuyRobuxPage,
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

function blendColor(hex, amount) {
  const cleanHex = (hex || '').replace('#', '');
  if (cleanHex.length !== 6) return hex;
  const toRgb = (start) => parseInt(cleanHex.slice(start, start + 2), 16);
  const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)));
  const r = toRgb(0);
  const g = toRgb(2);
  const b = toRgb(4);
  const mix = (v) => (amount >= 0 ? v + (255 - v) * amount : v * (1 + amount));
  const out = [clamp(mix(r)), clamp(mix(g)), clamp(mix(b))]
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('');
  return `#${out}`;
}

function hexToRgbString(hex) {
  const cleanHex = (hex || '').replace('#', '');
  if (cleanHex.length !== 6) return '0, 162, 255';
  const r = parseInt(cleanHex.slice(0, 2), 16);
  const g = parseInt(cleanHex.slice(2, 4), 16);
  const b = parseInt(cleanHex.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
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

  // Theme CSS variables
  if (theme === themeType.obc2016) {
    root.style.setProperty('--white-color', '#242426');
    root.style.setProperty('--background-color', '#19191b');
    root.style.setProperty('--surface-subtle', '#2d2d30');
    root.style.setProperty('--surface-hover', '#3a3a3e');
    root.style.setProperty('--surface-selected', 'rgba(0, 162, 255, 0.22)');
    root.style.setProperty('--surface-panel', '#2b2b2e');
    root.style.setProperty('--input-bg', '#161618');
    root.style.setProperty('--border-subtle', '#444448');
    root.style.setProperty('--legacy-btn-gradient', 'linear-gradient(0deg, #2b2d30 0%, #3d4044 100%)');
    root.style.setProperty('--legacy-btn-gradient-hover', 'linear-gradient(0deg, #35383c 0%, #4b4f54 100%)');
    root.style.setProperty('--text-color-primary', '#ffffff');
    root.style.setProperty('--text-color-secondary', '#b8b8b8');
    root.style.setProperty('--text-color-tertiary', '#b8b8b8');
    root.style.setProperty('--text-color-quinary', '#505054');
    root.setAttribute('data-bs-theme', 'dark');
  } else if (theme === themeType.dark2019) {
    root.style.setProperty('--white-color', '#232527');
    root.style.setProperty('--background-color', '#191b1d');
    root.style.setProperty('--surface-subtle', '#2b2d2f');
    root.style.setProperty('--surface-hover', '#393b3d');
    root.style.setProperty('--surface-selected', 'rgba(0, 162, 255, 0.2)');
    root.style.setProperty('--surface-panel', '#2b2d2f');
    root.style.setProperty('--input-bg', '#111214');
    root.style.setProperty('--border-subtle', '#393b3d');
    root.style.setProperty('--legacy-btn-gradient', 'linear-gradient(0deg, #2b2d30 0%, #3d4044 100%)');
    root.style.setProperty('--legacy-btn-gradient-hover', 'linear-gradient(0deg, #35383c 0%, #4b4f54 100%)');
    root.style.setProperty('--text-color-primary', '#ffffff');
    root.style.setProperty('--text-color-secondary', '#bdbebe');
    root.style.setProperty('--text-color-tertiary', '#bdbebe');
    root.style.setProperty('--text-color-quinary', '#393b3d');
    root.setAttribute('data-bs-theme', 'dark');
  } else {
    root.style.setProperty('--white-color', '#ffffff');
    root.style.setProperty('--background-color', era === '2019' ? '#f2f4f5' : '#e3e3e3');
    root.style.setProperty('--surface-subtle', era === '2019' ? '#f2f4f5' : '#f2f2f2');
    root.style.setProperty('--surface-hover', '#eaeaea');
    root.style.setProperty('--surface-selected', '#e0f1fc');
    root.style.setProperty('--surface-panel', '#e1e1e1');
    root.style.setProperty('--input-bg', '#ffffff');
    root.style.setProperty('--legacy-btn-gradient', 'linear-gradient(0deg, rgba(224,224,224,1) 0%, rgba(255,255,255,1) 100%)');
    root.style.setProperty('--legacy-btn-gradient-hover', 'linear-gradient(0deg, rgba(203,216,255,1) 0%, rgba(255,255,255,1) 100%)');
    root.style.setProperty('--border-subtle', '#e3e3e3');
    root.style.setProperty('--text-color-primary', era === '2019' ? '#393b3d' : '#191919');
    root.style.setProperty('--text-color-secondary', '#757575');
    root.style.setProperty('--text-color-tertiary', '#757575');
    root.style.setProperty('--text-color-quinary', '#c3c3c3');
    root.removeAttribute('data-bs-theme');
  }

  // Accent color
  const accentKeys = [
    '--primary-color',
    '--primary-color-2',
    '--primary-color-hover',
    '--secondary-color',
  ];
  if (!accent) {
    accentKeys.forEach((k) => root.style.removeProperty(k));
  } else {
    root.style.setProperty('--primary-color', accent);
    root.style.setProperty('--primary-color-2', hexToRgbString(accent));
    root.style.setProperty('--primary-color-hover', blendColor(accent, 0.14));
    root.style.setProperty('--secondary-color', blendColor(accent, -0.18));
  }

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
  useEffect(() => {
    if (hasUserCustomTheme()) return;

    const applyRemoteRobloxTheme = (remoteType) => {
      if (!remoteType || hasUserCustomTheme()) return;
      const desired =
        remoteType === 'Dark'
          ? getEra() === '2016'
            ? themeType.obc2016
            : themeType.dark2019
          : themeType.light;
      if (getTheme() !== desired) {
        setTheme(desired);
        applyDocumentTheme(disableWebsiteTheming);
        setThemeRevision((r) => r + 1);
      }
    };

    const ssrTheme =
      typeof document !== 'undefined' ? document.documentElement?.dataset?.rbxSsrTheme : null;
    if (ssrTheme) {
      applyRemoteRobloxTheme(ssrTheme);
    }

    let cancelled = false;
    getRobloxAccountTheme().then((remoteTheme) => {
      if (!cancelled && remoteTheme) {
        applyRemoteRobloxTheme(remoteTheme);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

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
