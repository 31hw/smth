import request, { getBaseUrl, getFullUrl } from '../lib/request';
import { getAvPageStyle, setAvPageStyle } from './theme';

export const getMySettingsJson = async () => {
  try {
    const res = await request('GET', `${getBaseUrl()}/my/settings/json`);
    if (res?.data && typeof res.data === 'object') return res.data;
  } catch (_) {
    // fallback if /my/settings/json returns non-JSON
  }
  const me = await request('GET', getFullUrl('users', '/v1/users/authenticated')).then((d) => d.data);
  const info = await request('GET', getFullUrl('users', `/v1/users/${me.id}`))
    .then((d) => d.data)
    .catch(() => ({}));
  return {
    UserId: me.id,
    Name: me.name,
    DisplayName: me.displayName,
    IsEmailOnFile: true,
    IsEmailVerified: Boolean(me.hasVerifiedBadge),
    UserEmail: '',
    ChangeUsernameEnabled: true,
    IsAdmin: false,
    Blurb: info.description || '',
  };
};

export const getMyEmail = () => {
  return request('GET', getFullUrl('accountsettings', '/v1/email'))
    .then((d) => d.data)
    .catch(() => ({ emailAddress: '', verified: false }));
};

export const getDiscordStatus = () => {
  return Promise.resolve({ linked: false });
};

export const unlinkDiscord = () => {
  return Promise.resolve({});
};

export const getInventoryPrivacy = () => {
  return request('GET', getFullUrl('accountsettings', '/v1/inventory-privacy'))
    .then((d) => d.data)
    .catch(() => ({ inventoryPrivacy: 'AllUsers' }));
};

export const setInventoryPrivacy = ({ newPrivacy }) => {
  return request('POST', getFullUrl('accountsettings', '/v1/inventory-privacy'), {
    inventoryPrivacy: newPrivacy,
  });
};

export const getTradePrivacy = () => {
  return request('GET', getFullUrl('accountsettings', '/v1/trade-privacy'))
    .then((d) => d.data?.tradePrivacy || 'All')
    .catch(() => 'All');
};

export const setTradePrivacy = ({ newPrivacy }) => {
  return request('POST', getFullUrl('accountsettings', '/v1/trade-privacy'), {
    tradePrivacy: newPrivacy,
  });
};

export const getTradeValue = () => {
  return request('GET', getFullUrl('accountsettings', '/v1/trade-value'))
    .then((d) => d.data?.tradeValue || 'None')
    .catch(() => 'None');
};

export const setTradeValue = ({ newValue }) => {
  return request('POST', getFullUrl('accountsettings', '/v1/trade-value'), {
    tradeValue: newValue,
  });
};

export const getPrivateMessagePrivacy = () => {
  return request('GET', getFullUrl('accountsettings', '/v1/private-message-privacy'))
    .then((d) => d.data?.privateMessagePrivacy || 'All')
    .catch(() => 'All');
};

export const setPrivateMessagePrivacy = ({ newPrivacy }) => {
  return request('POST', getFullUrl('accountsettings', '/v1/private-message-privacy'), {
    privateMessagePrivacy: newPrivacy,
  });
};

export const getAvPageStyleReq = () => {
  return Promise.resolve(getAvPageStyle());
};

export const setAvPageStyleReq = ({ newAvatarPageStyle }) => {
  setAvPageStyle(newAvatarPageStyle);
  return Promise.resolve({ avatarPageStyle: newAvatarPageStyle });
};

export const getRobloxAccountTheme = () => {
  return request('GET', getFullUrl('accountsettings', '/v1/themes/user'))
    .then((d) => d.data?.themeType || null)
    .catch(() => null);
};

export const setRobloxAccountTheme = ({ themeType }) => {
  const normalized = themeType === 'Dark' ? 'Dark' : 'Light';
  return request('PATCH', getFullUrl('accountsettings', '/v1/themes/user'), {
    themeType: normalized,
  }).then((d) => d.data);
};
