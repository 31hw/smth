import React from 'react';
import Head from 'next/head';
import { createUseStyles } from 'react-jss';
import { getEra } from '../../services/theme';

const useStyles = createUseStyles({
  page: {
    maxWidth: '970px!important',
    paddingTop: '14px',
  },
  banner: {
    background: 'var(--white-color)',
    border: '1px solid var(--text-color-quinary)',
    borderRadius: 4,
    padding: '22px 24px',
    marginBottom: 18,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    marginBottom: 6,
  },
  subtitle: {
    color: 'var(--text-color-secondary)',
    fontSize: 15,
    marginBottom: 0,
  },
  tiersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 16,
    marginBottom: 20,
    '@media(max-width: 767px)': {
      gridTemplateColumns: '1fr',
    },
  },
  tierCard: {
    background: 'var(--white-color)',
    border: '1px solid var(--text-color-quinary)',
    borderRadius: 4,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  tierHeader: {
    padding: '16px',
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: 700,
    fontSize: 20,
  },
  bcHeader: { background: '#0074BD' },
  tbcHeader: { background: '#D97200' },
  obcHeader: { background: '#232527', borderBottom: '3px solid #cc1e1e' },
  tierBody: {
    padding: '18px 16px',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  perks: {
    paddingLeft: 18,
    marginBottom: 18,
    fontSize: 14,
    lineHeight: '1.75em',
    color: 'var(--text-color-primary)',
  },
  buyBtn: {
    display: 'block',
    textAlign: 'center',
    padding: '10px 14px',
    background: '#02b757',
    color: '#ffffff!important',
    borderRadius: 4,
    fontWeight: 700,
    textDecoration: 'none',
    '&:hover': {
      background: '#3fc679',
    },
  },
  themeBtn: {
    marginTop: 8,
    padding: '7px 12px',
    border: '1px solid var(--text-color-quinary)',
    background: 'var(--background-color)',
    color: 'var(--text-color-primary)',
    borderRadius: 4,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%',
  },
});

const BuildersClubUpgradePage = () => {
  const s = useStyles();
  const era = getEra();

  return (
    <div className={`container ${s.page}`}>
      <Head>
        <title>Upgrade to Builders Club - ROBLOX</title>
      </Head>
      <div className={s.banner}>
        <h1 className={s.title}>
          {era === '2016' ? 'Upgrade to ROBLOX Builders Club!' : 'Roblox Membership & Builders Club'}
        </h1>
        <p className={s.subtitle}>
          Get monthly Robux stipends, trade Limited collectibles, join up to 100 groups, and unlock
          exclusive Builders Club themes.
        </p>
      </div>

      <div className={s.tiersGrid}>
        <div className={s.tierCard}>
          <div className={`${s.tierHeader} ${s.bcHeader}`}>Classic Builders Club</div>
          <div className={s.tierBody}>
            <ul className={s.perks}>
              <li>450 Robux / month (Premium 450)</li>
              <li>Trade &amp; Resell Limited Items</li>
              <li>10% Bonus Robux in Store</li>
              <li>Create &amp; Join up to 100 Groups</li>
            </ul>
            <div>
              <a
                className={s.buyBtn}
                href="https://www.roblox.com/premium/membership?rbx_native=1"
                data-rbx-native="1"
              >
                Upgrade on Roblox
              </a>
            </div>
          </div>
        </div>

        <div className={s.tierCard}>
          <div className={`${s.tierHeader} ${s.tbcHeader}`}>Turbo Builders Club</div>
          <div className={s.tierBody}>
            <ul className={s.perks}>
              <li>1,000 Robux / month (Premium 1000)</li>
              <li>Trade &amp; Resell Limited Items</li>
              <li>10% More Robux When Purchasing</li>
              <li>Access Exclusive Avatar Shop Deals</li>
            </ul>
            <div>
              <a
                className={s.buyBtn}
                href="https://www.roblox.com/premium/membership?rbx_native=1"
                data-rbx-native="1"
              >
                Upgrade on Roblox
              </a>
            </div>
          </div>
        </div>

        <div className={s.tierCard}>
          <div className={`${s.tierHeader} ${s.obcHeader}`}>Outrageous Builders Club</div>
          <div className={s.tierBody}>
            <ul className={s.perks}>
              <li>2,200 Robux / month (Premium 2200)</li>
              <li>Exclusive 2016 OBC Dark Website Theme</li>
              <li>Full Trading &amp; Collectible Economy</li>
              <li>Maximum Monthly Robux Value</li>
            </ul>
            <div>
              <a
                className={s.buyBtn}
                href="https://www.roblox.com/premium/membership?rbx_native=1"
                data-rbx-native="1"
              >
                Upgrade on Roblox
              </a>
              <a
                href="/My/Account"
                className={s.themeBtn}
                style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}
              >
                Theme Settings (/My/Account)
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className={s.banner}>
        <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Buy Robux</h3>
        <p className={s.subtitle} style={{ marginBottom: 12 }}>
          Need Robux without a membership? Open the official Roblox Robux checkout directly.
        </p>
        <a
          className={s.buyBtn}
          style={{ display: 'inline-block', padding: '9px 22px' }}
          href="https://www.roblox.com/upgrades/robux?rbx_native=1"
          data-rbx-native="1"
        >
          Buy Robux on Roblox
        </a>
      </div>
    </div>
  );
};

export default BuildersClubUpgradePage;
