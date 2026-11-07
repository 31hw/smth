import React from 'react';
import { createUseStyles } from 'react-jss';
import LoginModalStore from '../../../stores/loginModal';
import LoginModal from '../../loginModal';
import getFlag from '../../../lib/getFlag';
import { useRouter } from 'next/router';
import { getEra, getTheme, themeType } from '../../../services/theme';

const useLoginAreaStyles = createUseStyles({
  text: {
    color: (p) => (p.light2019 ? '#393b3d' : 'white'),
    fontWeight: 400,
    fontSize: '16px',
    borderBottom: 0,
    margin: 0,
    textAlign: 'right',
    whiteSpace: 'nowrap',
  },
  link: {
    color: (p) => (p.light2019 ? '#393b3d' : 'white'),
    textDecoration: 'none',
    padding: '6px 9px',
    userSelect: 'none',
    '&:hover': {
      color: (p) => (p.light2019 ? '#191919' : 'white'),
      background: 'rgba(25,25,25,0.1)',
      cursor: 'pointer',
      borderRadius: '4px',
    },
  },
  signupLink: {
    color: 'white !important',
    backgroundColor: '#02b757!important',
    borderRadius: '3px!important',
    '&:hover': {
      color: 'white !important',
      backgroundColor: '#3fc679!important',
      borderRadius: '3px!important',
    },
  },
  loginContainer: {
    width: 'auto',
    maxWidth: 'none',
    flex: '0 0 auto',
    marginLeft: 'auto',
    marginRight: '12px',
    padding: 0,
    '@media(max-width: 991px)': {
      marginRight: '6px',
      minWidth: '132px',
    },
    '@media(max-width: 575px)': {
      width: '100%',
      marginLeft: 0,
      marginRight: 0,
      padding: '0 6px',
    },
  },
  buttonContainer: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    height: '100%',
    gap: '4px',
  },
});

const LoginArea = () => {
  const Router = useRouter();
  const light2019 = getEra() === '2019' && getTheme() === themeType.light;
  const s = useLoginAreaStyles({ light2019 });
  const loginModalStore = LoginModalStore.useContainer();

  return (
    <div className={s.loginContainer}>
      <div className={s.buttonContainer}>
        <div>
          <p className={s.text}>
            <a
              className={s.link}
              href="/login"
              onClick={(e) => {
                e.preventDefault();
                if (getFlag('requireLoginThroughCookie', false)) {
                  Router.push('/login');
                  return;
                }
                Router.push('/login');
              }}
            >
              Log In
            </a>
          </p>
          {loginModalStore.open && <LoginModal />}
        </div>
        <div>
          <p className={s.text}>
            <a className={`${s.link} ${s.signupLink}`} href="/">
              Sign Up
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginArea;
