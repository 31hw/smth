import { fontStyle, getAccentColor, getEra, getFontStyle, getTheme, themeType } from './theme';
import { applyThemeCssVariables } from './themeCss';

const GOTHAM_FONT = "'HCo Gotham SSm', 'Helvetica Neue', Helvetica, Arial, sans-serif";
const SOURCE_SANS_FONT = "'Source Sans Pro', 'Helvetica Neue', Helvetica, Arial, sans-serif";

export function getChromeFontFamily() {
  return getFontStyle() === fontStyle.SourceSans ? SOURCE_SANS_FONT : GOTHAM_FONT;
}

/**
 * Applies the selected era / theme to the classic chrome's shadow host only.
 * Nothing is written to <html> or <body>, so the original Roblox page keeps
 * its own colors, fonts and layout.
 */
export function applyChromeTheme(host) {
  if (!host) return;
  const era = getEra();
  const theme = getTheme();
  const accent = getAccentColor();

  host.dataset.rbxEra = era;
  host.dataset.rbxTheme = theme;
  host.style.colorScheme = theme === themeType.light ? 'light' : 'dark';

  applyThemeCssVariables(host, { theme, era, accent });
}
