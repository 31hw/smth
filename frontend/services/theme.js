const themeType = {
	koroneholyfuck67: 'koroneholyfuck67',
    obc2016: 'obc2016',
    light: 'light',
    default: 'light',
}

const avPageStyleType = {
    Modern: 'Modern',
    Legacy: 'Legacy',
    default: 'Legacy',
}

const catalogPageStyle = {
    Modern: 'Modern',
    Legacy: 'Legacy',
    default: 'Legacy',
}

const fontStyle = {
    Default: 'Default',
    SourceSans: 'SourceSans',
	freaky: 'freaky',
    default: 'SourceSans',
}

const logoStyle = {
    Default: 'Default',
    MarineModern: 'MarineModern',
	Zekoro: 'Zekoro',
	ZekoroBlue: 'ZekoroBlue',
	Roblox2009: 'Roblox2009',
	Roblox2013: 'Roblox2013',
	Roblox2016: 'Roblox2016',
	Roblox2017: 'Roblox2017',
	Roblox2019: 'Roblox2019',
}

const isLocalStorageAvailable = (() => {
    // @ts-ignore
    if (!process.browser) return false;
    if (typeof window === 'undefined' || !window.localStorage || !window.localStorage.getItem || !window.localStorage.setItem) return false;
    
    return true;
})()

const isValidHexColor = (value) => {
    if (typeof value !== 'string') return false;
    return /^#([0-9a-fA-F]{6})$/.test(value.trim());
}

const getTheme = () => {
    if (!isLocalStorageAvailable) return themeType.default;
    
    let value = localStorage.getItem('rbx_theme_v1');
    // validate
    if (typeof value !== 'string' || !Object.getOwnPropertyNames(themeType).includes(value)) return themeType.default;
    return themeType[value];
}

const setTheme = (themeString) => {
    if (!isLocalStorageAvailable) return;
    localStorage.setItem('rbx_theme_v1', themeString)
}

const getAccentColor = () => {
    if (!isLocalStorageAvailable) return null;
    const value = localStorage.getItem('rbx_accent_color_v1');
    if (!isValidHexColor(value)) return null;
    return value.trim();
}

const setAccentColor = (hexColor) => {
    if (!isLocalStorageAvailable) return false;
    if (!isValidHexColor(hexColor)) return false;
    localStorage.setItem('rbx_accent_color_v1', hexColor.trim());
    return true;
}

const clearAccentColor = () => {
    if (!isLocalStorageAvailable) return;
    localStorage.removeItem('rbx_accent_color_v1');
}

const getAvPageStyle = () => {
    return avPageStyleType.default;
}

const setAvPageStyle = (themeString) => {
    if (!isLocalStorageAvailable) return;
    localStorage.setItem('rbx_av_page_style_v1', avPageStyleType.default)
}

const getCatalogPageStyle = () => {
    return catalogPageStyle.default;
}

const setCatalogPageStyle = (themeString) => {
    if (!isLocalStorageAvailable) return;
    localStorage.setItem('rbx_cat_page_style_v1', catalogPageStyle.default);
}

const getFontStyle = () => {
    return fontStyle.default;
}

const setFontStyle = (fontString) => {
    if (!isLocalStorageAvailable) return;
    localStorage.setItem('rbx_font_style_v1', fontStyle.default);
}

const getLogoStyle = () => {
    if (!isLocalStorageAvailable) return fontStyle.Default;

    let value = localStorage.getItem('rbx_logo_style_v1');
    // validate
    if (typeof value !== 'string' || !Object.values(fontStyle).includes(value)) 
        return fontStyle.Default;
    return value;
}

const setLogoStyle = (logoString) => {
    if (!isLocalStorageAvailable) return;
    localStorage.setItem('rbx_logo_style_v1', logoString);
}

export {
    getTheme,
    setTheme,
    getAccentColor,
    setAccentColor,
    clearAccentColor,

    getAvPageStyle,
    setAvPageStyle,

    getCatalogPageStyle,
    setCatalogPageStyle,

    getFontStyle,
    setFontStyle,

	getLogoStyle,
	setLogoStyle,

    themeType,
    avPageStyleType,
    catalogPageStyle,
    fontStyle,
	logoStyle,
}
