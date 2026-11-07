import React, { useEffect, useState } from 'react';
import Navbar from '../navbar';
import Footer from '../footer';
import AuthenticationStore from '../../stores/authentication';
import LoginModalStore from '../../stores/loginModal';
import { applyChromeTheme, getChromeFontFamily } from '../../services/chromeTheme';
import { syncThemeFromRobloxAccount } from '../../services/themeSync';

/**
 * Classic Roblox chrome (navbar + sidebar + footer) rendered around an
 * untouched, fully functional modern Roblox page.
 *
 * It is mounted inside a shadow root so none of the classic CSS can leak into
 * the original page and none of the modern page CSS can restyle the chrome.
 */
export default function ChromeShell({ host }) {
  const [themeRevision, setThemeRevision] = useState(0);

  useEffect(() => {
    applyChromeTheme(host);
  }, [host, themeRevision]);

  useEffect(() => {
    const sync = syncThemeFromRobloxAccount(() => setThemeRevision((r) => r + 1));
    const onThemeChange = () => setThemeRevision((r) => r + 1);

    window.addEventListener('rbx-theme-change', onThemeChange);

    let storageListener = null;
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
        storageListener = (changes, area) => {
          if (area !== 'local') return;
          if (Object.keys(changes).some((k) => k.startsWith('rbx_'))) {
            onThemeChange();
          }
        };
        chrome.storage.onChanged.addListener(storageListener);
      }
    } catch (_) {
      // ignore outside extension context
    }

    return () => {
      if (typeof sync === 'function') sync();
      window.removeEventListener('rbx-theme-change', onThemeChange);
      if (storageListener && typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
        chrome.storage.onChanged.removeListener(storageListener);
      }
    };
  }, []);

  const shellStyle = {
    height: '100%',
    minHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: getChromeFontFamily(),
    fontSize: '14px',
    lineHeight: '1.4em',
    color: 'var(--text-color-primary)',
  };

  return (
    <div id="rbx-chrome-root" style={shellStyle}>
      <AuthenticationStore.Provider>
        <LoginModalStore.Provider>
          <Navbar />
        </LoginModalStore.Provider>
        <div style={{ flex: '1 1 auto' }} />
        <Footer />
      </AuthenticationStore.Provider>
    </div>
  );
}
