import React, { useRef } from 'react';
import { createUseStyles } from 'react-jss';
import { getEra, getTheme, themeType } from '../../services/theme';
import AuthenticationStore from '../../stores/authentication';
import NavSideBar from '../navSidebar';
import LoggedInArea from './components/loggedinArea';
import LoginArea from './components/loginArea';
import Logo from './components/logo';
import NavigationLinks from './components/navigationLinks';
import Search from './components/search';

export function isLight2019Navbar() {
  return getEra() === '2019' && getTheme() === themeType.light;
}

const useNavBarStyles = createUseStyles({
  navbar: {
    backgroundColor: (p) => {
      if (p.theme === themeType.obc2016) return '#393939';
      if (p.theme === themeType.dark2019) return '#232527';
      if (p.era === '2019') return '#dee1e3';
      return 'var(--secondary-color, #0074BD)';
    },
    borderBottom: (p) =>
      p.era === '2019' && p.theme === themeType.light ? '1px solid #c3c7c9' : 'none',
    paddingTop: '0!important',
    paddingBottom: '0!important',
    display: 'block',
    boxShadow: (p) =>
      p.era === '2019' ? 'none' : '0 3px 3px -3px rgba(25, 25, 25, 0.3)',
    backgroundRepeat: 'repeat-x',
    verticalAlign: 'bottom',
  },
  navContainer: {
    maxWidth: '100%!important',
    padding: 0,
    display: 'block!important',
  },
  row: {
    width: '100%',
    margin: '0!important',
    padding: '0!important',
    justifyContent: 'center',
    alignItems: 'center',
  },
  wrapper: {
    marginBottom: '40px',
    maxWidth: '100vw',
    overflow: 'auto',
    '@media(max-width: 991px)': {
      marginBottom: '90px',
    },
  },
  rowOne: {
    display: 'block',
  },
  column: {
    margin: 0,
    padding: 0,
    '@media(max-width: 991px)': {
      padding: '6px',
    },
  },
});

const Navbar = () => {
  const s = useNavBarStyles({
    theme: getTheme(),
    era: getEra(),
  });
  const authStore = AuthenticationStore.useContainer();
  const mainNavBarRef = useRef(null);

  return (
    <div className={`${s.wrapper} navbar-wrapper-main`}>
      <nav className={`navbar fixed-top navbar-expand-lg ${s.navbar}`} ref={mainNavBarRef}>
        <div className={`${s.navContainer} container`}>
          <div className={`${s.row} ${s.rowOne} row`}>
            <div className={`${s.column} col-12 col-lg-12`}>
              <div className={`${s.row} row`}>
                <Logo />
                <NavigationLinks />
                <Search />
                {authStore.isPending ? null : authStore.isAuthenticated ? (
                  <LoggedInArea />
                ) : (
                  <LoginArea />
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>
      {authStore.isAuthenticated && <NavSideBar mainNavBarRef={mainNavBarRef} />}
    </div>
  );
};

export default Navbar;
