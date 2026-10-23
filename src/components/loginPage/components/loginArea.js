import React, { useRef, useState } from 'react';
import { createUseStyles } from 'react-jss';
import { login } from '../../../services/auth';
import useButtonStyles from '../../../styles/buttonStyles';
import ActionButton from '../../actionButton';

const useStyles = createUseStyles({
  header: {
    fontSize: '35px',
    marginBottom: '16px',
  },
  input: {
    width: 'calc(100% - 90px)',
    display: 'inline-block',
    padding: '5px 8px',
    border: '1px solid #b8b8b8',
    borderRadius: '3px',
  },
  inputLabel: {
    width: '90px',
    display: 'inline-block',
    color: 'var(--text-color-primary)',
    fontWeight: 500,
  },
  signInButtonWrapper: {
    float: 'right',
  },
  loginWrapper: {
    maxWidth: '340px',
  },
  nativeBox: {
    marginTop: '24px',
    paddingTop: '14px',
    borderTop: '1px solid var(--text-color-quinary)',
    fontSize: '13px',
    color: 'var(--text-color-secondary)',
  },
});

const LoginArea = () => {
  const buttonStyles = useButtonStyles();
  const s = useStyles();
  const usernameRef = useRef(null);
  const passwordRef = useRef(null);
  const [locked, setLocked] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const onLoginClick = (e) => {
    if (e) e.preventDefault();
    setFeedback(null);
    const username = usernameRef.current?.value?.trim() || '';
    const password = passwordRef.current?.value || '';
    if (!username || !password) {
      setFeedback('Username and Password are required.');
      return;
    }
    setLocked(true);
    login({ username, password })
      .then(() => {
        window.location.href = '/home';
      })
      .catch((err) => {
        const msg =
          err?.response?.data?.errors?.[0]?.message ||
          'Login requires verification (Captcha / 2-Step / Passkey). Click "Open Official Roblox Sign-In" below to complete sign-in.';
        setFeedback(msg);
      })
      .finally(() => {
        setLocked(false);
      });
  };

  return (
    <div className="row">
      <div className="col-12">
        <h1 className={s.header}>Login to ROBLOX</h1>
        {feedback && <p className="text-danger mb-2">{feedback}</p>}
      </div>
      <div className="col-12">
        <form className={s.loginWrapper} onSubmit={onLoginClick}>
          <div>
            <span className={s.inputLabel}>Username:</span>
            <input
              disabled={locked}
              className={s.input}
              ref={usernameRef}
              type="text"
              autoComplete="username"
            />
          </div>
          <div className="mt-2">
            <span className={s.inputLabel}>Password:</span>
            <input
              disabled={locked}
              className={s.input}
              ref={passwordRef}
              type="password"
              autoComplete="current-password"
            />
          </div>
          <div className="mt-3 clearfix">
            <div className={s.signInButtonWrapper}>
              <ActionButton
                disabled={locked}
                className={buttonStyles.buyButton}
                onClick={onLoginClick}
                label="Sign In"
              />
            </div>
          </div>
          <div className={s.nativeBox}>
            <p className="mb-2">
              Using Passkey, Quick Sign-In, or 2-Step Verification on Roblox?
            </p>
            <a
              href="https://www.roblox.com/login?rbx_native=1"
              data-rbx-native="1"
              className="btn btn-sm btn-outline-primary"
            >
              Open Official Roblox Sign-In
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginArea;
