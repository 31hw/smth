import { createUseStyles } from 'react-jss';
import { getEra, getLogoStyle, getTheme, logoStyle, themeType } from '../../../services/theme';

function resolveDesktopLogo(era, theme, style) {
  if (style === logoStyle.Roblox2016 || era === '2016') {
    return '/img/roblox_logo.svg';
  }
  if (theme === themeType.dark2019 || theme === themeType.obc2016) {
    return '/img/roblox_2019_light.svg';
  }
  return '/img/roblox_2019_dark.svg';
}

function resolveMobileLogo(era, style) {
  if (style === logoStyle.Roblox2016 || era === '2016') {
    return 'url(/img/logo_R.svg)';
  }
  return 'url(/img/roblox_2019_tilt.svg)';
}

const useLogoStyles = createUseStyles({
  imgDesktop: {
    width: '122px',
    minWidth: '122px',
    maxWidth: '122px',
    height: '40px',
    display: 'none',
    '@media(min-width: 1325px)': {
      display: 'flex',
    },
    alignItems: 'center',
  },
  imgDesktopImage: {
    width: '122px',
    height: '30px',
    objectFit: 'contain',
    display: 'block',
  },
  imgMobile: {
    backgroundImage: (p) => resolveMobileLogo(p.era, p.logo),
    width: '30px',
    height: '30px',
    display: 'block',
    backgroundSize: '30px',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
    marginLeft: '6px',
    '@media(min-width: 1325px)': {
      display: 'none',
    },
  },
  col: {
    maxWidth: '118px',
    padding: '0',
    margin: '0 12px',
    display: 'flex',
    justifyContent: 'start',
    alignItems: 'center',
    '@media(max-width: 1324px)': {
      margin: '0 6px',
      width: 'auto',
    },
    '@media(max-width: 992px)': {
      width: '20%',
      margin: 0,
      marginBottom: '6px',
    },
  },
});

const Logo = () => {
  const era = getEra();
  const theme = getTheme();
  const logo = getLogoStyle();
  const s = useLogoStyles({ era, theme, logo });
  const desktopLogoSrc = resolveDesktopLogo(era, theme, logo);

  return (
    <div className={`${s.col} col-3 col-lg-3`}>
      <a className={s.imgDesktop} href="/home">
        <img className={s.imgDesktopImage} src={desktopLogoSrc} alt="ROBLOX" />
      </a>
      <a className={s.imgMobile} href="/home" aria-label="ROBLOX Home" />
    </div>
  );
};

export default Logo;
