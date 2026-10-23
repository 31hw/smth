import React, { useEffect, useState } from 'react';
import { createUseStyles } from 'react-jss';
import { useRouter } from 'next/router';
import AuthenticationStore from '../../stores/authentication';
import { login } from '../../services/auth';
import { getEra } from '../../services/theme';

const useStyles = createUseStyles({
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#0d2231',
    backgroundImage:
      "linear-gradient(rgba(5, 18, 30, 0.52), rgba(5, 18, 30, 0.68)), url('/img/landing/signupbackground.png')",
    backgroundRepeat: 'no-repeat',
    backgroundSize: 'cover',
    backgroundPosition: 'center center',
    color: '#ffffff',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 28px',
    flexWrap: 'wrap',
    gap: 12,
  },
  brandRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 18,
  },
  logoImg: {
    height: 36,
    width: 'auto',
    objectFit: 'contain',
  },
  navQuickLinks: {
    display: 'flex',
    gap: 14,
    '& a': {
      color: '#ffffff',
      textDecoration: 'none',
      fontWeight: 600,
      fontSize: 15,
      padding: '5px 10px',
      borderRadius: 4,
      '&:hover': {
        background: 'rgba(255,255,255,0.14)',
      },
    },
  },
  loginBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  topInput: {
    width: 145,
    height: 36,
    borderRadius: 4,
    border: '1px solid rgba(255,255,255,0.35)',
    background: '#ffffff',
    color: '#191919',
    padding: '0 10px',
    fontSize: 14,
  },
  topBtn: {
    height: 36,
    borderRadius: 4,
    border: 'none',
    background: '#00a2ff',
    color: '#ffffff',
    fontWeight: 700,
    fontSize: 14,
    padding: '0 16px',
    cursor: 'pointer',
    '&:hover': {
      background: '#32b5ff',
    },
  },
  centerWrap: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px 60px',
    textAlign: 'center',
  },
  heroLogo: {
    height: 68,
    marginBottom: 14,
    filter: 'drop-shadow(0 6px 20px rgba(0,0,0,0.4))',
  },
  tagline: {
    fontSize: 22,
    fontWeight: 400,
    marginBottom: 26,
    textShadow: '0 2px 10px rgba(0,0,0,0.5)',
  },
  card: {
    width: '100%',
    maxWidth: 410,
    background: 'rgba(255, 255, 255, 0.94)',
    color: '#191919',
    borderRadius: 8,
    padding: '26px 24px 22px',
    boxShadow: '0 24px 64px rgba(0, 0, 0, 0.4)',
    textAlign: 'left',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 700,
    textAlign: 'center',
    marginBottom: 16,
    color: '#232527',
  },
  field: {
    width: '100%',
    height: 40,
    borderRadius: 4,
    border: '1px solid #b8b8b8',
    padding: '0 12px',
    fontSize: 15,
    marginBottom: 10,
    background: '#fff',
    color: '#191919',
  },
  greenBtn: {
    width: '100%',
    height: 42,
    borderRadius: 4,
    border: 'none',
    background: '#02b757',
    color: '#ffffff',
    fontWeight: 700,
    fontSize: 16,
    cursor: 'pointer',
    marginTop: 4,
    '&:hover': {
      background: '#3fc679',
    },
  },
  secondaryBtn: {
    display: 'block',
    width: '100%',
    textAlign: 'center',
    marginTop: 10,
    padding: '9px 12px',
    borderRadius: 4,
    border: '1px solid #00a2ff',
    color: '#0074BD',
    fontWeight: 600,
    fontSize: 14,
    textDecoration: 'none',
    '&:hover': {
      background: 'rgba(0, 162, 255, 0.08)',
    },
  },
  errorBox: {
    color: '#d32f2f',
    fontSize: 13,
    marginBottom: 10,
  },
});

const PublicLanding = () => {
  const s = useStyles();
  const router = useRouter();
  const auth = AuthenticationStore.useContainer();
  const era = getEra();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (auth.isAuthenticated) {
      router.replace('/home');
    }
  }, [auth.isAuthenticated]);

  const handleLogin = (e) => {
    if (e) e.preventDefault();
    setError(null);
    if (!username.trim() || !password) {
      setError('Please enter your Roblox username and password.');
      return;
    }
    setBusy(true);
    login({ username: username.trim(), password })
      .then(() => {
        window.location.href = '/home';
      })
      .catch(() => {
        setError(
          'Roblox requested Captcha / 2-Step Verification. Use Official Roblox Sign-In below.'
        );
      })
      .finally(() => setBusy(false));
  };

  const logoSrc = era === '2016' ? '/img/roblox_logo.svg' : '/img/roblox_2019_light.svg';

  return (
    <div className={s.page}>
      <div className={s.topBar}>
        <div className={s.brandRow}>
          <a href="/games">
            <img className={s.logoImg} src={logoSrc} alt="ROBLOX" />
          </a>
          <div className={s.navQuickLinks}>
            <a href="/games">Games</a>
            <a href="/catalog">Catalog</a>
            <a href="/Forum/Default.aspx">Forums</a>
            <a href="/BuildersClub/Upgrade.ashx">
              {era === '2016' ? 'Builders Club' : 'Membership'}
            </a>
          </div>
        </div>
        <form className={s.loginBar} onSubmit={handleLogin}>
          <input
            className={s.topInput}
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            className={s.topInput}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" disabled={busy} className={s.topBtn}>
            Log In
          </button>
        </form>
      </div>

      <div className={s.centerWrap}>
        <img className={s.heroLogo} src={logoSrc} alt="ROBLOX" />
        <p className={s.tagline}>
          {era === '2016'
            ? 'Powering Imagination — Classic 2016 ROBLOX Experience'
            : 'Powering Imagination — Classic 2019 Roblox Experience'}
        </p>

        <div className={s.card}>
          <h2 className={s.cardTitle}>Play &amp; Explore ROBLOX</h2>
          {error && <div className={s.errorBox}>{error}</div>}
          <form onSubmit={handleLogin}>
            <input
              className={s.field}
              placeholder="Username / Email / Phone"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <input
              className={s.field}
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="submit" disabled={busy} className={s.greenBtn}>
              Log In
            </button>
          </form>
          <a
            className={s.secondaryBtn}
            href="https://www.roblox.com/login?rbx_native=1"
            data-rbx-native="1"
          >
            Sign In / Sign Up with Official Roblox (2FA &amp; Passkey)
          </a>
          <a className={s.secondaryBtn} href="/games">
            Browse Popular Games
          </a>
        </div>
      </div>
    </div>
  );
};

export default PublicLanding;
