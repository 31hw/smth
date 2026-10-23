import React, { useState } from 'react';
import { createUseStyles } from 'react-jss';
import getFlag from '../../../lib/getFlag';
import { logout } from '../../../services/auth';
import { getEra, getTheme, themeType } from '../../../services/theme';
import AuthenticationStore from '../../../stores/authentication';
import Dropdown2016 from '../../dropdown2016';

const useLoginAreaStyles = createUseStyles({
  linkContainer: {
    display: 'flex',
    margin: 0,
    marginRight: '16px',
    paddingLeft: '8px',
    paddingRight: '8px',
    justifyContent: 'flex-end',
    alignItems: 'center',
    listStyle: 'none',
  },
  linkContainerCol: {
    width: 'auto',
    float: 'right',
    marginLeft: 'auto',
    marginRight: '3px',
    '@media(max-width: 991px)': {
      marginLeft: '0',
      padding: 0,
      width: 'calc(60% - 3px)',
    },
  },
  row: {
    display: 'block',
    height: '100%',
  },
  currencyContainer: {
    padding: '0',
    display: 'block',
    cursor: 'pointer',
    float: 'left',
    position: 'relative',
  },
  robuxContainer: {
    paddingLeft: '4px',
  },
  currencyIcon: {
    verticalAlign: 'middle',
    filter: (p) => (p.light2019 ? 'invert(0.8)' : 'none'),
  },
  currencyLink: {
    display: 'flex',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    textDecoration: 'none',
  },
  settingsIcon: {
    float: 'right',
    cursor: 'pointer',
    filter: (p) => (p.light2019 ? 'invert(0.8)' : 'none'),
  },
  text: {
    color: (p) => (p.light2019 ? '#393b3d' : 'white'),
    fontWeight: 400,
    fontSize: '16px',
    borderBottom: 0,
    textAlign: 'right',
    whiteSpace: 'nowrap',
    display: 'inline',
    marginRight: '0',
  },
  currencySpan: {
    color: (p) => (p.light2019 ? '#393b3d' : '#fff'),
    display: 'inline',
    marginLeft: '5px',
    marginRight: '12px',
    fontSize: '16px',
    height: '100%',
    marginBottom: '2px',
    '@media(max-width: 400px)': {
      marginRight: '4px',
    },
  },
  dropdownClass: {
    marginTop: '18px',
  },
});

const LoggedInArea = () => {
  const light2019 = getEra() === '2019' && getTheme() === themeType.light;
  const s = useLoginAreaStyles({ light2019 });
  const authStore = AuthenticationStore.useContainer();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [robuxOpen, setRobuxOpen] = useState(false);

  const formatCompactCurrency = (value) => {
    const amount = Number(value || 0);
    if (amount >= 1000000) return `${Math.floor(amount / 1000000)}M+`;
    if (amount >= 10000) return `${Math.floor(amount / 1000)}K+`;
    return amount.toLocaleString();
  };

  return (
    <div className={s.linkContainerCol}>
      <div className={`${s.row} row`}>
        <ul className={s.linkContainer}>
          <li className={`${s.currencyContainer} ${s.robuxContainer}`}>
            <a
              className={s.currencyLink}
              href="/My/Money.aspx"
              onClick={(e) => {
                e.preventDefault();
                setSettingsOpen(false);
                setRobuxOpen(!robuxOpen);
              }}
            >
              <span className={`${s.currencyIcon} icon-nav-robux`} />
              <span className={s.currencySpan}>
                {authStore.robux === null ? '?' : formatCompactCurrency(authStore.robux)}
              </span>
            </a>
          </li>
          {robuxOpen && (
            <Dropdown2016
              dropdownClass={s.dropdownClass}
              onlyDropdown={true}
              options={[
                {
                  name: `${Number(authStore.robux || 0).toLocaleString()} Robux`,
                  url: '/My/Money.aspx',
                },
                {
                  name: 'Buy Robux',
                  url: '/upgrades/robux',
                },
                {
                  name: 'My Transactions',
                  url: '/My/Money.aspx',
                },
              ]}
            />
          )}
          {getFlag('showTicketBalace', false) && authStore.tix !== null ? (
            <li className={s.currencyContainer}>
              <a className={s.currencyLink} href="/My/Money.aspx">
                <span className="icon-nav-tix" />
                <span className={s.currencySpan}>{formatCompactCurrency(authStore.tix)}</span>
              </a>
            </li>
          ) : null}
          <li className={s.text}>
            <a
              href="/My/Account"
              onClick={(e) => {
                e.preventDefault();
                setRobuxOpen(false);
                setSettingsOpen(!settingsOpen);
              }}
            >
              <span className={`icon-nav-settings ${s.settingsIcon}`} id="nav-settings" />
            </a>
          </li>
          {settingsOpen && (
            <Dropdown2016
              dropdownClass={s.dropdownClass}
              onlyDropdown={true}
              options={[
                {
                  name: 'Settings',
                  url: '/My/Account',
                },
                {
                  name: 'Help',
                  url: 'https://en.help.roblox.com/',
                },
                {
                  name: 'Logout',
                  onClick: (e) => {
                    if (e) e.preventDefault();
                    logout().finally(() => {
                      window.location.reload();
                    });
                  },
                },
              ]}
            />
          )}
        </ul>
      </div>
    </div>
  );
};

export default LoggedInArea;
