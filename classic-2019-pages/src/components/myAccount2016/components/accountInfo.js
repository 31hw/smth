import React, { useEffect, useRef, useState } from 'react';
import { createUseStyles } from 'react-jss';
import getFlag from '../../../lib/getFlag';
import { setUserDescription } from '../../../services/accountInformation';
import { getRobloxAccountTheme, setRobloxAccountTheme } from '../../../services/accountSettings';
import {
  applyEraPreset,
  clearAccentColor,
  getAccentColor,
  getAvPageStyle,
  getCatalogPageStyle,
  getEra,
  getFontStyle,
  getGamePageStyle,
  getTheme,
  markUserCustomTheme,
  setAccentColor,
  setAvPageStyle,
  setCatalogPageStyle,
  setFontStyle,
  setGamePageStyle,
  setTheme,
  triggerThemeRefresh,
} from '../../../services/theme';
import AuthenticationStore from '../../../stores/authentication';
import useCardStyles from '../../userProfile/styles/card';
import MyAccountStore from '../stores/myAccountStore';
import useFormStyles from '../styles/forms';
import Subtitle from './subtitle';

const useEditButtonStyles = createUseStyles({
  editButton: {
    float: 'right',
    color: '#666',
    cursor: 'pointer',
  },
});

const EditButton = (props) => {
  const s = useEditButtonStyles();
  return (
    <span className={s.editButton} onClick={props.onClick}>
      Edit
    </span>
  );
};

const AccountInfo = () => {
  const store = MyAccountStore.useContainer();
  const auth = AuthenticationStore.useContainer();
  const descRef = useRef(null);
  const [accentColor, setAccentColorState] = useState(getAccentColor() || '#00a2ff');
  const [robloxThemeStatus, setRobloxThemeStatus] = useState('');

  useEffect(() => {
    let cancelled = false;
    getRobloxAccountTheme().then((remoteTheme) => {
      if (!cancelled && remoteTheme) {
        setRobloxThemeStatus(`Roblox Account Theme: ${remoteTheme}`);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const accentColors = [
    { label: 'Default Blue', value: '#00a2ff' },
    { label: 'Classic 2016 Blue', value: '#0074bd' },
    { label: 'OBC Crimson', value: '#d93025' },
    { label: 'Emerald Green', value: '#1f8f3a' },
    { label: 'Charcoal', value: '#232527' },
  ];

  const cardStyles = useCardStyles();
  const s = useFormStyles();

  return (
    <div className="row">
      <div className="col-12 mt-2">
        <Subtitle>Account Info</Subtitle>
        <div className={`${cardStyles.card} p-3`}>
          <p className={s.accountInfoLabel}>
            Username: <span className={s.accountInfoValue}>{auth.username || 'Guest'}</span>
            {auth.isAuthenticated && (
              <EditButton onClick={() => store.setModal('CHANGE_USERNAME')} />
            )}
          </p>
          <p className={s.accountInfoLabel}>
            Password: <span className={s.accountInfoValue}>**********</span>
            {auth.isAuthenticated && (
              <EditButton onClick={() => store.setModal('CHANGE_PASSWORD')} />
            )}
          </p>
          <p className={s.accountInfoLabel}>
            Email Address: <span className={s.accountInfoValue}>{store.email || 'Protected'}</span>
          </p>
        </div>
      </div>

      {auth.isAuthenticated && (
        <div className="col-12 mt-2">
          <Subtitle>Personal</Subtitle>
          <div className={`${cardStyles.card} p-3`}>
            <textarea
              ref={descRef}
              className={s.descInput}
              rows={3}
              defaultValue={store.description}
            />
            <p className="mb-0 font-size-12">
              Do not provide any details that can be used to identify you outside ROBLOX.
            </p>
            <div className="mt-1 mb-4">
              <div className={s.saveButtonWrapper}>
                <button
                  className={s.saveButton}
                  onClick={() => {
                    setUserDescription({
                      newDescription: descRef.current.value,
                    });
                  }}
                >
                  Save
                </button>
              </div>
            </div>
            <div className="mt-4 mb-4">&emsp;</div>
          </div>
        </div>
      )}

      {getFlag('settingsPageThemeSelectorEnabled', true) && (
        <div className="col-12 mt-2">
          <Subtitle>Classic UI &amp; Theme Settings</Subtitle>
          <div className={`${cardStyles.card} p-3`}>
            <div className="row mt-1">
              <div className="col pe-0">
                <input
                  className={`form-control ${s.select} ${s.disabled}`}
                  value="Classic UI Era Preset"
                  readOnly
                  type="text"
                />
              </div>
              <div className="col ps-0 pe-0">
                <select
                  id="rbx-settings-era-select"
                  className={`form-control ${s.select}`}
                  value={getEra()}
                  onChange={(ev) => {
                    applyEraPreset(ev.currentTarget.value);
                    triggerThemeRefresh();
                  }}
                >
                  <option value="2016">2016 Classic ROBLOX</option>
                  <option value="2019">2019 Classic Roblox</option>
                </select>
              </div>
            </div>

            <div className="row mt-2">
              <div className="col pe-0">
                <input
                  className={`form-control ${s.select} ${s.disabled}`}
                  value="Website Theme"
                  readOnly
                  type="text"
                />
              </div>
              <div className="col ps-0 pe-0">
                <select
                  id="rbx-settings-theme-select"
                  className={`form-control ${s.select}`}
                  value={getTheme()}
                  onChange={(ev) => {
                    const nextVal = ev.currentTarget.value;
                    const rbxThemeType = nextVal === 'light' ? 'Light' : 'Dark';
                    setTheme(nextVal);
                    markUserCustomTheme();
                    triggerThemeRefresh();
                    setRobloxThemeStatus('Syncing with Roblox account...');
                    setRobloxAccountTheme({ themeType: rbxThemeType })
                      .then(() => {
                        setRobloxThemeStatus(`Synced with Roblox Account (${rbxThemeType})`);
                      })
                      .catch(() => {
                        setRobloxThemeStatus('Saved locally');
                      });
                  }}
                >
                  <option value="light">Light</option>
                  <option value="dark2019">Dark (2019)</option>
                  <option value="obc2016">OBC Dark (2016)</option>
                </select>
              </div>
            </div>
            {robloxThemeStatus ? (
              <p className="mb-0 mt-1 font-size-12" style={{ color: 'var(--text-color-secondary)' }}>
                {robloxThemeStatus}
              </p>
            ) : null}

            <div className="row mt-2">
              <div className="col pe-0">
                <input
                  className={`form-control ${s.select} ${s.disabled}`}
                  value="Avatar Editor Style"
                  readOnly
                  type="text"
                />
              </div>
              <div className="col ps-0 pe-0">
                <select
                  className={`form-control ${s.select}`}
                  value={getAvPageStyle()}
                  onChange={(ev) => {
                    setAvPageStyle(ev.currentTarget.value);
                    triggerThemeRefresh();
                  }}
                >
                  <option value="Legacy">2016 Character Customizer</option>
                  <option value="Modern">2019 3D Avatar Editor</option>
                </select>
              </div>
            </div>

            <div className="row mt-2">
              <div className="col pe-0">
                <input
                  className={`form-control ${s.select} ${s.disabled}`}
                  value="Catalog Item Style"
                  readOnly
                  type="text"
                />
              </div>
              <div className="col ps-0 pe-0">
                <select
                  className={`form-control ${s.select}`}
                  value={getCatalogPageStyle()}
                  onChange={(ev) => {
                    setCatalogPageStyle(ev.currentTarget.value);
                    triggerThemeRefresh();
                  }}
                >
                  <option value="Legacy">2016 Legacy Item Page</option>
                  <option value="Modern">2019 Modern Item Page</option>
                </select>
              </div>
            </div>

            <div className="row mt-2">
              <div className="col pe-0">
                <input
                  className={`form-control ${s.select} ${s.disabled}`}
                  value="Game Page & Cards"
                  readOnly
                  type="text"
                />
              </div>
              <div className="col ps-0 pe-0">
                <select
                  className={`form-control ${s.select}`}
                  value={getGamePageStyle()}
                  onChange={(ev) => {
                    setGamePageStyle(ev.currentTarget.value);
                    triggerThemeRefresh();
                  }}
                >
                  <option value="Legacy">2016 Legacy Games</option>
                  <option value="Modern">2019 Modern Games</option>
                </select>
              </div>
            </div>

            <div className="row mt-2">
              <div className="col pe-0">
                <input
                  className={`form-control ${s.select} ${s.disabled}`}
                  value="Typography Font"
                  readOnly
                  type="text"
                />
              </div>
              <div className="col ps-0 pe-0">
                <select
                  className={`form-control ${s.select}`}
                  value={getFontStyle()}
                  onChange={(ev) => {
                    setFontStyle(ev.currentTarget.value);
                    triggerThemeRefresh();
                  }}
                >
                  <option value="SourceSans">Source Sans Pro (2016)</option>
                  <option value="Default">HCo Gotham SSm (2019)</option>
                </select>
              </div>
            </div>

            <div className="row mt-2">
              <div className="col pe-0">
                <input
                  className={`form-control ${s.select} ${s.disabled}`}
                  value="Accent Color"
                  readOnly
                  type="text"
                />
              </div>
              <div className="col ps-0 pe-0">
                <select
                  className={`form-control ${s.select}`}
                  value={
                    accentColors.some((color) => color.value === accentColor)
                      ? accentColor
                      : '#00a2ff'
                  }
                  onChange={(ev) => {
                    setAccentColorState(ev.currentTarget.value);
                  }}
                >
                  {accentColors.map((color) => (
                    <option key={color.value} value={color.value}>
                      {color.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="row mt-2">
              <div className="col pe-0">
                <button
                  className={s.saveButton}
                  onClick={() => {
                    const normalized = (accentColor || '').trim();
                    if (!setAccentColor(normalized)) return;
                    triggerThemeRefresh();
                  }}
                >
                  Apply Accent
                </button>
              </div>
              <div className="col ps-0 pe-0">
                <button
                  className={s.saveButton}
                  onClick={() => {
                    clearAccentColor();
                    setAccentColorState('#00a2ff');
                    triggerThemeRefresh();
                  }}
                >
                  Reset Accent
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountInfo;
