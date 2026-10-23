import React from 'react';
import Head from 'next/head';
import { createUseStyles } from 'react-jss';
import Link from '../../components/link';
import AuthenticationStore from '../../stores/authentication';
import { getAssetUrl } from '../../lib/assetUrl';

const ROBUX_PACKAGES = [
  { standard: 400, member: 450, price: '$4.99', bonusText: '50 Bonus Robux' },
  { standard: 800, member: 880, price: '$9.99', bonusText: '80 Bonus Robux' },
  { standard: 1700, member: 1870, price: '$19.99', bonusText: '170 Bonus Robux' },
  { standard: 4500, member: 4950, price: '$49.99', bonusText: '450 Bonus Robux' },
  { standard: 10000, member: 11000, price: '$99.99', bonusText: '1,000 Bonus Robux' },
  { standard: 22500, member: 24750, price: '$199.99', bonusText: '2,250 Bonus Robux' },
];

const useStyles = createUseStyles({
  page: {
    maxWidth: '970px!important',
    paddingTop: '14px',
    paddingBottom: '28px',
  },
  heroBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 20,
    background: 'linear-gradient(90deg, #0b1f14 0%, #103b22 60%, #09150e 100%)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 4,
    padding: '18px 24px',
    marginBottom: 18,
    color: '#ffffff',
    '@media(max-width: 767px)': {
      flexDirection: 'column',
      textAlign: 'center',
    },
  },
  heroLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 18,
    '@media(max-width: 767px)': {
      flexDirection: 'column',
    },
  },
  heroEmblem: {
    width: 68,
    height: 68,
    flexShrink: 0,
  },
  heroPile: {
    height: 88,
    width: 'auto',
    borderRadius: 4,
    flexShrink: 0,
    '@media(max-width: 575px)': {
      display: 'none',
    },
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: 700,
    margin: '0 0 4px 0',
    color: '#ffffff',
  },
  heroSubtitle: {
    fontSize: 15,
    margin: 0,
    color: '#d6f5e1',
  },
  topActionsBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
    background: 'var(--white-color)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 4,
    padding: '12px 16px',
    marginBottom: 16,
  },
  balanceBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 15,
    fontWeight: 600,
    color: 'var(--text-color-primary)',
  },
  balanceIcon: {
    width: 20,
    height: 20,
  },
  quickLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    flexWrap: 'wrap',
    fontSize: 14,
  },
  tableCard: {
    background: 'var(--white-color)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 18,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  theadRow: {
    background: 'var(--surface-subtle)',
    borderBottom: '1px solid var(--border-subtle)',
    '& th': {
      padding: '12px 16px',
      fontSize: 14,
      fontWeight: 700,
      color: 'var(--text-color-primary)',
      textTransform: 'uppercase',
      letterSpacing: '0.02em',
    },
  },
  pkgRow: {
    borderBottom: '1px solid var(--border-subtle)',
    '&:last-child': {
      borderBottom: 'none',
    },
    '&:hover': {
      background: 'var(--surface-hover)',
    },
    '& td': {
      padding: '14px 16px',
      verticalAlign: 'middle',
      color: 'var(--text-color-primary)',
    },
  },
  amountCell: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontSize: 20,
    fontWeight: 700,
  },
  rsIcon: {
    width: 24,
    height: 24,
    flexShrink: 0,
  },
  memberAmount: {
    display: 'flex',
    flexDirection: 'column',
  },
  memberValue: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 18,
    fontWeight: 700,
    color: '#02b757',
  },
  bonusSub: {
    fontSize: 12,
    color: 'var(--text-color-secondary)',
    marginTop: 2,
  },
  buyBtn: {
    display: 'inline-block',
    minWidth: 132,
    textAlign: 'center',
    padding: '9px 18px',
    background: '#02b757',
    color: '#ffffff!important',
    borderRadius: 4,
    fontWeight: 700,
    fontSize: 15,
    textDecoration: 'none',
    border: '1px solid #029c4a',
    transition: 'background 120ms ease',
    '&:hover': {
      background: '#3fc679',
      textDecoration: 'none',
    },
  },
  plusBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 14,
    background: 'var(--white-color)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 4,
    padding: '16px 20px',
  },
  plusTitle: {
    fontSize: 17,
    fontWeight: 700,
    margin: '0 0 4px 0',
    color: 'var(--text-color-primary)',
  },
  plusDesc: {
    fontSize: 13,
    margin: 0,
    color: 'var(--text-color-secondary)',
  },
  plusBtn: {
    display: 'inline-block',
    padding: '8px 18px',
    background: 'var(--primary-color)',
    color: '#ffffff!important',
    borderRadius: 4,
    fontWeight: 700,
    fontSize: 14,
    textDecoration: 'none',
    '&:hover': {
      opacity: 0.92,
      textDecoration: 'none',
    },
  },
});

const BuyRobuxPage = () => {
  const s = useStyles();
  const auth = AuthenticationStore.useContainer();
  const rsIconSrc = getAssetUrl('/img/img-robux-2048.png');
  const pileSrc = getAssetUrl('/img/ROBUX.webp');
  const checkoutHref = 'https://www.roblox.com/upgrades/robux?rbx_native=1';

  return (
    <div className={`container ${s.page}`}>
      <Head>
        <title>Buy Robux - ROBLOX</title>
      </Head>

      <div className={s.heroBanner}>
        <div className={s.heroLeft}>
          <img className={s.heroEmblem} src={rsIconSrc} alt="R$" />
          <div>
            <h1 className={s.heroTitle}>Buy Robux™</h1>
            <p className={s.heroSubtitle}>
              Purchase Robux to customize your avatar and get items in games!
            </p>
          </div>
        </div>
        <img className={s.heroPile} src={pileSrc} alt="Robux Stack" />
      </div>

      <div className={s.topActionsBar}>
        <div className={s.balanceBadge}>
          <img className={s.balanceIcon} src={rsIconSrc} alt="R$" />
          <span>
            My Balance:{' '}
            {auth.robux === null ? '—' : `${Number(auth.robux || 0).toLocaleString()} Robux`}
          </span>
        </div>
        <div className={s.quickLinks}>
          <Link href="/promocodes">
            <a className="link2018">Redeem Roblox Codes</a>
          </Link>
          <span style={{ color: 'var(--text-color-secondary)' }}>|</span>
          <Link href="/My/Money.aspx">
            <a className="link2018">My Transactions</a>
          </Link>
          <span style={{ color: 'var(--text-color-secondary)' }}>|</span>
          <a className="link2018" href="/plus">
            Get More with Plus / Membership
          </a>
        </div>
      </div>

      <div className={s.tableCard}>
        <table className={s.table}>
          <thead>
            <tr className={s.theadRow}>
              <th>Standard Pack</th>
              <th>With Membership</th>
              <th style={{ textAlign: 'right' }}>Buy Now</th>
            </tr>
          </thead>
          <tbody>
            {ROBUX_PACKAGES.map((pkg) => (
              <tr key={pkg.standard} className={s.pkgRow}>
                <td>
                  <div className={s.amountCell}>
                    <img className={s.rsIcon} src={rsIconSrc} alt="R$" />
                    <span>{pkg.standard.toLocaleString()} Robux</span>
                  </div>
                </td>
                <td>
                  <div className={s.memberAmount}>
                    <span className={s.memberValue}>
                      <img className={s.rsIcon} src={rsIconSrc} alt="R$" />
                      {pkg.member.toLocaleString()} Robux
                    </span>
                    <span className={s.bonusSub}>{pkg.bonusText} included</span>
                  </div>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <a className={s.buyBtn} href={checkoutHref}>
                    Buy for {pkg.price}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={s.plusBanner}>
        <div>
          <h3 className={s.plusTitle}>Want monthly Robux, trading access, and 10% more Robux?</h3>
          <p className={s.plusDesc}>
            View official Roblox Plus &amp; Membership plans directly on Roblox.
          </p>
        </div>
        <a className={s.plusBtn} href="/plus">
          Upgrade Now
        </a>
      </div>
    </div>
  );
};

export default BuyRobuxPage;
