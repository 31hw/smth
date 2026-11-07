import { themeType } from './theme';

export function blendColor(hex, amount) {
  const cleanHex = (hex || '').replace('#', '');
  if (cleanHex.length !== 6) return hex;
  const toRgb = (start) => parseInt(cleanHex.slice(start, start + 2), 16);
  const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)));
  const r = toRgb(0);
  const g = toRgb(2);
  const b = toRgb(4);
  const mix = (v) => (amount >= 0 ? v + (255 - v) * amount : v * (1 + amount));
  const out = [clamp(mix(r)), clamp(mix(g)), clamp(mix(b))]
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('');
  return `#${out}`;
}

export function hexToRgbString(hex) {
  const cleanHex = (hex || '').replace('#', '');
  if (cleanHex.length !== 6) return '0, 162, 255';
  const r = parseInt(cleanHex.slice(0, 2), 16);
  const g = parseInt(cleanHex.slice(2, 4), 16);
  const b = parseInt(cleanHex.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

/**
 * Writes the classic theme CSS custom properties onto any root node.
 *
 * The classic pages apply this to <html>; the native-page chrome applies the
 * exact same set to its shadow host so it can never leak into (or be
 * overridden by) the modern Roblox page underneath.
 */
export function applyThemeCssVariables(root, { theme, era, accent } = {}) {
  if (!root) return;

  if (theme === themeType.obc2016) {
    root.style.setProperty('--white-color', '#242426');
    root.style.setProperty('--background-color', '#19191b');
    root.style.setProperty('--surface-subtle', '#2d2d30');
    root.style.setProperty('--surface-hover', '#3a3a3e');
    root.style.setProperty('--surface-selected', 'rgba(0, 162, 255, 0.22)');
    root.style.setProperty('--surface-panel', '#2b2b2e');
    root.style.setProperty('--input-bg', '#161618');
    root.style.setProperty('--border-subtle', '#444448');
    root.style.setProperty('--legacy-btn-gradient', 'linear-gradient(0deg, #2b2d30 0%, #3d4044 100%)');
    root.style.setProperty('--legacy-btn-gradient-hover', 'linear-gradient(0deg, #35383c 0%, #4b4f54 100%)');
    root.style.setProperty('--text-color-primary', '#ffffff');
    root.style.setProperty('--text-color-secondary', '#b8b8b8');
    root.style.setProperty('--text-color-tertiary', '#b8b8b8');
    root.style.setProperty('--text-color-quinary', '#505054');
    root.setAttribute('data-bs-theme', 'dark');
  } else if (theme === themeType.dark2019) {
    root.style.setProperty('--white-color', '#232527');
    root.style.setProperty('--background-color', '#191b1d');
    root.style.setProperty('--surface-subtle', '#2b2d2f');
    root.style.setProperty('--surface-hover', '#393b3d');
    root.style.setProperty('--surface-selected', 'rgba(0, 162, 255, 0.2)');
    root.style.setProperty('--surface-panel', '#2b2d2f');
    root.style.setProperty('--input-bg', '#111214');
    root.style.setProperty('--border-subtle', '#393b3d');
    root.style.setProperty('--legacy-btn-gradient', 'linear-gradient(0deg, #2b2d30 0%, #3d4044 100%)');
    root.style.setProperty('--legacy-btn-gradient-hover', 'linear-gradient(0deg, #35383c 0%, #4b4f54 100%)');
    root.style.setProperty('--text-color-primary', '#ffffff');
    root.style.setProperty('--text-color-secondary', '#bdbebe');
    root.style.setProperty('--text-color-tertiary', '#bdbebe');
    root.style.setProperty('--text-color-quinary', '#393b3d');
    root.setAttribute('data-bs-theme', 'dark');
  } else {
    root.style.setProperty('--white-color', '#ffffff');
    root.style.setProperty('--background-color', era === '2019' ? '#f2f4f5' : '#e3e3e3');
    root.style.setProperty('--surface-subtle', era === '2019' ? '#f2f4f5' : '#f2f2f2');
    root.style.setProperty('--surface-hover', '#eaeaea');
    root.style.setProperty('--surface-selected', '#e0f1fc');
    root.style.setProperty('--surface-panel', '#e1e1e1');
    root.style.setProperty('--input-bg', '#ffffff');
    root.style.setProperty('--legacy-btn-gradient', 'linear-gradient(0deg, rgba(224,224,224,1) 0%, rgba(255,255,255,1) 100%)');
    root.style.setProperty('--legacy-btn-gradient-hover', 'linear-gradient(0deg, rgba(203,216,255,1) 0%, rgba(255,255,255,1) 100%)');
    root.style.setProperty('--border-subtle', '#e3e3e3');
    root.style.setProperty('--text-color-primary', era === '2019' ? '#393b3d' : '#191919');
    root.style.setProperty('--text-color-secondary', '#757575');
    root.style.setProperty('--text-color-tertiary', '#757575');
    root.style.setProperty('--text-color-quinary', '#c3c3c3');
    root.removeAttribute('data-bs-theme');
  }

  const accentKeys = [
    '--primary-color',
    '--primary-color-2',
    '--primary-color-hover',
    '--secondary-color',
  ];
  if (!accent) {
    accentKeys.forEach((k) => root.style.removeProperty(k));
  } else {
    root.style.setProperty('--primary-color', accent);
    root.style.setProperty('--primary-color-2', hexToRgbString(accent));
    root.style.setProperty('--primary-color-hover', blendColor(accent, 0.14));
    root.style.setProperty('--secondary-color', blendColor(accent, -0.18));
  }
}
