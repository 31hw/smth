import { getEra, getTheme, hasUserCustomTheme, setTheme, themeType } from './theme';
import { getRobloxAccountTheme } from './accountSettings';

/**
 * Applies the real Roblox account theme (SSR body class + accountsettings API)
 * unless the user explicitly picked a theme in Settings.
 *
 * Shared by the full classic UI and the classic chrome shown around native
 * Roblox pages so both always stay in sync with the Roblox account.
 */
export function syncThemeFromRobloxAccount(onApplied) {
  if (typeof document === 'undefined' || hasUserCustomTheme()) {
    return () => {};
  }

  let cancelled = false;

  const applyRemoteRobloxTheme = (remoteType) => {
    if (!remoteType || cancelled || hasUserCustomTheme()) return;
    const desired =
      remoteType === 'Dark'
        ? getEra() === '2016'
          ? themeType.obc2016
          : themeType.dark2019
        : themeType.light;
    if (getTheme() !== desired) {
      setTheme(desired);
      if (typeof onApplied === 'function') onApplied();
    }
  };

  const ssrTheme = document.documentElement?.dataset?.rbxSsrTheme;
  if (ssrTheme) {
    applyRemoteRobloxTheme(ssrTheme);
  }

  getRobloxAccountTheme()
    .then((remoteTheme) => {
      if (!cancelled && remoteTheme) {
        applyRemoteRobloxTheme(remoteTheme);
      }
    })
    .catch(() => {
      // account theme is best-effort; keep the local/SSR theme
    });

  return () => {
    cancelled = true;
  };
}
