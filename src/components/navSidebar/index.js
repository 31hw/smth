import React, { useEffect, useState } from 'react';
import { createUseStyles } from 'react-jss';
import AuthenticationStore from '../../stores/authentication';
import LinkEntry from './components/linkEntry';
import PlayerHeadshot from '../playerHeadshot';
import { avPageStyleType, getAvPageStyle, getEra, getTheme, themeType } from '../../services/theme';

const isDarkTheme = (t) => t === themeType.obc2016 || t === themeType.dark2019;

const useNavSideBarStyles = createUseStyles({
  hamburgerButton: {
    position: 'fixed',
    top: '2px',
    left: '8px',
    zIndex: 1101,
    width: '38px',
    height: '38px',
    border: '0',
    borderRadius: 0,
    background: 'transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    filter: (p) => (p.era === '2019' && p.theme === themeType.light ? 'invert(0.8)' : 'none'),
    padding: 0,
  },
  container: {
    position: 'fixed',
    top: 0,
    left: 0,
    zIndex: 999,
  },
  card: {
    width: '175px',
    background: (p) =>
      p.theme === themeType.obc2016
        ? '#393939'
        : p.theme === themeType.dark2019
        ? '#232527'
        : 'var(--white-color)',
    color: 'var(--text-color-primary)',
    height: '100vh',
    paddingLeft: '10px',
    paddingRight: '10px',
    marginTop: '12px',
    boxShadow: '0 0 3px rgba(25, 25, 25, 0.3)',
    paddingTop: '40px',
    '@media(max-width: 991px)': {
      paddingTop: '75px',
    },
  },
  username: {
    fontSize: '16px',
    fontWeight: '400',
    marginBottom: 0,
    color: (p) => (isDarkTheme(p.theme) ? '#ffffff' : 'var(--text-color-primary)'),
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
  },
  divider: {
    borderBottom: '1px solid var(--text-color-secondary)',
    borderColor: (p) =>
      isDarkTheme(p.theme) ? 'rgba(255, 255, 255, 0.2)' : 'var(--text-color-secondary)',
    height: '2px',
    width: '100%',
    marginTop: '5px',
    marginBottom: '8px',
  },
  upgradeNowButton: {
    marginTop: '10px',
    background: '#01a2fd',
    fontSize: '15px',
    fontWeight: 500,
    width: '100%',
    paddingTop: '8px',
    paddingBottom: '8px',
    textAlign: 'center',
    color: 'white',
    borderRadius: '4px',
    '&:hover': {
      background: '#3ab8ff',
    },
  },
  Wrapheadshot: {
    marginRight: '6px',
    float: 'left',
    backgroundColor: '#d1d1d1',
    border: '0 none',
    width: '22px',
    height: '22px',
    padding: 0,
    verticalAlign: 'middle',
    borderRadius: '50%',
    overflow: 'hidden',
    flexShrink: 0,
    '& img': {
      width: '100%',
      height: '100%',
      border: '0 none',
      borderRadius: '50%',
      verticalAlign: 'middle',
      overflow: 'clip',
    },
  },
});

const NavSideBar = () => {
  const authStore = AuthenticationStore.useContainer();
  const [dimensions, setDimensions] = useState({
    height: typeof window !== 'undefined' ? window.innerHeight : 900,
    width: typeof window !== 'undefined' ? window.innerWidth : 1440,
  });
  const theme = getTheme();
  const era = getEra();
  const s = useNavSideBarStyles({ theme, era });
  const [isOpen, setIsOpen] = useState(
    typeof window !== 'undefined' ? window.innerWidth > 1324 : true
  );

  useEffect(() => {
    const onResize = () => {
      setDimensions({
        height: window.innerHeight,
        width: window.innerWidth,
      });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <>
      {dimensions.width <= 1324 && (
        <button
          className={s.hamburgerButton}
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle side navigation"
        >
          <span className="icon-nav-menu" />
        </button>
      )}
      {isOpen && (
        <div className={s.container}>
          <div className={s.card} style={{ marginTop: dimensions.width <= 1324 ? '0' : '12px' }}>
            <a href={`/users/${authStore.userId}/profile`} className={s.username}>
              <div className={s.Wrapheadshot}>
                <PlayerHeadshot id={authStore.userId} name={authStore.username} />
              </div>
              {authStore.username}
            </a>
            <div className={s.divider} />
            <LinkEntry theme={theme} name="Home" url="/home" icon="icon-nav-home" />
            <LinkEntry
              theme={theme}
              name="Profile"
              url={`/users/${authStore.userId}/profile`}
              icon="icon-nav-profile"
            />
            <LinkEntry
              theme={theme}
              name="Messages"
              url="/My/Messages"
              icon="icon-nav-message"
              count={authStore.notificationCount.messages}
            />
            <LinkEntry
              theme={theme}
              name="Friends"
              url={`/users/${authStore.userId}/friends`}
              icon="icon-nav-friends"
              count={authStore.notificationCount.friendRequests}
            />
            <LinkEntry
              theme={theme}
              name="Avatar"
              url={getAvPageStyle() === avPageStyleType.Legacy ? '/My/Character.aspx' : '/My/Avatar'}
              icon="icon-nav-charactercustomizer"
            />
            <LinkEntry
              theme={theme}
              name="Inventory"
              url={`/users/${authStore.userId}/inventory`}
              icon="icon-nav-inventory"
            />
            <LinkEntry
              theme={theme}
              name="Collectibles"
              url="/collectibles"
              icon="icon-nav-inventory"
            />
            <LinkEntry
              theme={theme}
              name="Trade"
              url="/My/Trades.aspx"
              icon="icon-nav-trade"
              count={authStore.notificationCount.trades}
            />
            <LinkEntry theme={theme} name="Groups" url="/My/Groups.aspx" icon="icon-nav-group" />
            <LinkEntry
              theme={theme}
              name="Forums"
              url="/Forum/Default.aspx"
              icon="icon-nav-forum"
            />
            <LinkEntry
              theme={theme}
              name="Promocodes"
              url="/promocodes"
              icon="icon-nav-blog"
            />
            <a href="/plus" style={{ textDecoration: 'none' }}>
              <p className={s.upgradeNowButton}>Upgrade Now</p>
            </a>
          </div>
        </div>
      )}
    </>
  );
};

export default NavSideBar;
