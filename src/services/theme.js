const themeType = {
  obc2016: 'obc2016',
  dark2019: 'dark2019',
  light: 'light',
  default: 'light',
};

const eraType = {
  y2016: '2016',
  y2019: '2019',
  default: '2019',
};

const avPageStyleType = {
  Modern: 'Modern',
  Legacy: 'Legacy',
  default: 'Modern',
};

const catalogPageStyle = {
  Modern: 'Modern',
  Legacy: 'Legacy',
  default: 'Modern',
};

const gamePageStyleType = {
  Modern: 'Modern',
  Legacy: 'Legacy',
  default: 'Modern',
};

const fontStyle = {
  Default: 'Default',
  SourceSans: 'SourceSans',
  default: 'Default',
};

const logoStyle = {
  Default: 'Roblox2019',
  Roblox2009: 'Roblox2009',
  Roblox2013: 'Roblox2013',
  Roblox2016: 'Roblox2016',
  Roblox2017: 'Roblox2017',
  Roblox2019: 'Roblox2019',
};

const isLocalStorageAvailable = (() => {
  try {
    return (
      typeof window !== 'undefined' &&
      Boolean(window.localStorage) &&
      typeof window.localStorage.getItem === 'function' &&
      typeof window.localStorage.setItem === 'function'
    );
  } catch (_) {
    return false;
  }
})();

const syncSettingToExtension = (key, value) => {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ [key]: value });
    }
  } catch (_) {
    // ignore outside extension context
  }
};

const isValidHexColor = (value) => {
  if (typeof value !== 'string') return false;
  return /^#([0-9a-fA-F]{6})$/.test(value.trim());
};

const getEra = () => {
  if (!isLocalStorageAvailable) return eraType.default;
  const val = localStorage.getItem('rbx_era_v1');
  if (val === '2016' || val === '2019') return val;
  return eraType.default;
};

const setEra = (era) => {
  if (!isLocalStorageAvailable) return;
  const normalized = era === '2016' ? '2016' : '2019';
  localStorage.setItem('rbx_era_v1', normalized);
  syncSettingToExtension('rbx_era_v1', normalized);
};

const applyEraPreset = (era) => {
  const is2016 = era === '2016';
  setEra(is2016 ? '2016' : '2019');
  setAvPageStyle(is2016 ? avPageStyleType.Legacy : avPageStyleType.Modern);
  setCatalogPageStyle(is2016 ? catalogPageStyle.Legacy : catalogPageStyle.Modern);
  setGamePageStyle(is2016 ? gamePageStyleType.Legacy : gamePageStyleType.Modern);
  setFontStyle(is2016 ? fontStyle.SourceSans : fontStyle.Default);
  setLogoStyle(is2016 ? logoStyle.Roblox2016 : logoStyle.Roblox2019);
  const currentTheme = getTheme();
  if (is2016 && currentTheme === themeType.dark2019) {
    setTheme(themeType.obc2016);
  } else if (!is2016 && currentTheme === themeType.obc2016) {
    setTheme(themeType.dark2019);
  }
};

const getTheme = () => {
  if (!isLocalStorageAvailable) return themeType.default;
  const value = localStorage.getItem('rbx_theme_v1');
  if (typeof value !== 'string' || !Object.prototype.hasOwnProperty.call(themeType, value)) {
    return themeType.default;
  }
  return themeType[value];
};

const setTheme = (themeString) => {
  if (!isLocalStorageAvailable) return;
  localStorage.setItem('rbx_theme_v1', themeString);
  syncSettingToExtension('rbx_theme_v1', themeString);
};

const getAccentColor = () => {
  if (!isLocalStorageAvailable) return null;
  const value = localStorage.getItem('rbx_accent_color_v1');
  if (!isValidHexColor(value)) return null;
  return value.trim();
};

const setAccentColor = (hexColor) => {
  if (!isLocalStorageAvailable) return false;
  if (!isValidHexColor(hexColor)) return false;
  const clean = hexColor.trim();
  localStorage.setItem('rbx_accent_color_v1', clean);
  syncSettingToExtension('rbx_accent_color_v1', clean);
  return true;
};

const clearAccentColor = () => {
  if (!isLocalStorageAvailable) return;
  localStorage.removeItem('rbx_accent_color_v1');
  syncSettingToExtension('rbx_accent_color_v1', null);
};

const getAvPageStyle = () => {
  if (!isLocalStorageAvailable) return avPageStyleType.default;
  const val = localStorage.getItem('rbx_av_page_style_v1');
  if (val === avPageStyleType.Legacy || val === avPageStyleType.Modern) return val;
  return getEra() === '2016' ? avPageStyleType.Legacy : avPageStyleType.Modern;
};

const setAvPageStyle = (val) => {
  if (!isLocalStorageAvailable) return;
  const clean = val === avPageStyleType.Legacy ? avPageStyleType.Legacy : avPageStyleType.Modern;
  localStorage.setItem('rbx_av_page_style_v1', clean);
  syncSettingToExtension('rbx_av_page_style_v1', clean);
};

const getCatalogPageStyle = () => {
  if (!isLocalStorageAvailable) return catalogPageStyle.default;
  const val = localStorage.getItem('rbx_cat_page_style_v1');
  if (val === catalogPageStyle.Legacy || val === catalogPageStyle.Modern) return val;
  return getEra() === '2016' ? catalogPageStyle.Legacy : catalogPageStyle.Modern;
};

const setCatalogPageStyle = (val) => {
  if (!isLocalStorageAvailable) return;
  const clean = val === catalogPageStyle.Legacy ? catalogPageStyle.Legacy : catalogPageStyle.Modern;
  localStorage.setItem('rbx_cat_page_style_v1', clean);
  syncSettingToExtension('rbx_cat_page_style_v1', clean);
};

const getGamePageStyle = () => {
  if (!isLocalStorageAvailable) return gamePageStyleType.default;
  const val = localStorage.getItem('rbx_game_page_style_v1');
  if (val === gamePageStyleType.Legacy || val === gamePageStyleType.Modern) return val;
  return getEra() === '2016' ? gamePageStyleType.Legacy : gamePageStyleType.Modern;
};

const setGamePageStyle = (val) => {
  if (!isLocalStorageAvailable) return;
  const clean = val === gamePageStyleType.Legacy ? gamePageStyleType.Legacy : gamePageStyleType.Modern;
  localStorage.setItem('rbx_game_page_style_v1', clean);
  syncSettingToExtension('rbx_game_page_style_v1', clean);
};

const getFontStyle = () => {
  if (!isLocalStorageAvailable) return fontStyle.default;
  const val = localStorage.getItem('rbx_font_style_v1');
  if (val === fontStyle.SourceSans || val === fontStyle.Default) return val;
  return getEra() === '2016' ? fontStyle.SourceSans : fontStyle.Default;
};

const setFontStyle = (val) => {
  if (!isLocalStorageAvailable) return;
  const clean = val === fontStyle.SourceSans ? fontStyle.SourceSans : fontStyle.Default;
  localStorage.setItem('rbx_font_style_v1', clean);
  syncSettingToExtension('rbx_font_style_v1', clean);
};

const getLogoStyle = () => {
  if (!isLocalStorageAvailable) return logoStyle.Default;
  const val = localStorage.getItem('rbx_logo_style_v1');
  if (val && Object.values(logoStyle).includes(val)) return val;
  return getEra() === '2016' ? logoStyle.Roblox2016 : logoStyle.Roblox2019;
};

const setLogoStyle = (val) => {
  if (!isLocalStorageAvailable) return;
  localStorage.setItem('rbx_logo_style_v1', val);
  syncSettingToExtension('rbx_logo_style_v1', val);
};

const hasUserCustomTheme = () => {
  if (!isLocalStorageAvailable) return false;
  return localStorage.getItem('rbx_theme_user_set_v1') === '1';
};

const markUserCustomTheme = () => {
  if (!isLocalStorageAvailable) return;
  localStorage.setItem('rbx_theme_user_set_v1', '1');
  syncSettingToExtension('rbx_theme_user_set_v1', '1');
};

const triggerThemeRefresh = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('rbx-theme-change'));
  }
};

export {
  getEra,
  setEra,
  applyEraPreset,
  getTheme,
  setTheme,
  hasUserCustomTheme,
  markUserCustomTheme,
  triggerThemeRefresh,
  getAccentColor,
  setAccentColor,
  clearAccentColor,
  getAvPageStyle,
  setAvPageStyle,
  getCatalogPageStyle,
  setCatalogPageStyle,
  getGamePageStyle,
  setGamePageStyle,
  getFontStyle,
  setFontStyle,
  getLogoStyle,
  setLogoStyle,
  eraType,
  themeType,
  avPageStyleType,
  catalogPageStyle,
  gamePageStyleType,
  fontStyle,
  logoStyle,
};
