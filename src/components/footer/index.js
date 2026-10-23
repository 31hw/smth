import { createUseStyles } from 'react-jss';
import { getEra, getTheme, themeType } from '../../services/theme';
import Footer2016 from './footer2016';

const footerLinks = {
  'https://corp.roblox.com/': 'About Us',
  'https://corp.roblox.com/careers/': 'Jobs',
  'https://blog.roblox.com/': 'Blog',
  'https://corp.roblox.com/parents/': 'Parents',
  'https://en.help.roblox.com/': 'Help',
  'https://en.help.roblox.com/hc/en-us/articles/115004647846': 'Terms',
  'https://en.help.roblox.com/hc/en-us/articles/115004630823': 'Privacy',
};

const isDark = (t) => t === themeType.obc2016 || t === themeType.dark2019;

const useFooterStyles2 = createUseStyles({
  footerContainer: {
    padding: '12px',
    background: (p) =>
      p.theme === themeType.obc2016
        ? '#393939'
        : p.theme === themeType.dark2019
        ? '#232527'
        : 'var(--white-color)',
    width: '100%',
    marginTop: '40px',
    boxShadow: '0 0 3px rgba(25, 25, 25, 0.3)',
  },
  footer: {
    textAlign: 'center',
    margin: '0 auto',
    maxWidth: '970px',
    display: 'flex',
    flexDirection: 'column',
  },
  footerLinks: {
    padding: 0,
    textAlign: 'center',
    marginBottom: '20px',
    marginTop: '20px',
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginLeft: 0,
    marginRight: 0,
    listStyle: 'none',
  },
  footerLink: {
    margin: '6px',
    whiteSpace: 'nowrap',
    listStyle: 'none',
    '& a': {
      fontSize: '16px',
      fontWeight: '500',
      color: (p) => (isDark(p.theme) ? '#bdbebe' : 'var(--text-color-secondary)'),
      textDecoration: 'none',
      '&:hover': {
        textDecoration: 'none',
        color: 'var(--text-color-primary)',
      },
    },
  },
  footerNote: {
    fontSize: '11px',
    fontWeight: '400',
    margin: '12px auto',
    textAlign: 'center',
    width: '82%',
    color: (p) => (isDark(p.theme) ? '#bdbebe' : 'var(--text-color-secondary)'),
    lineHeight: '1.5em',
    wordWrap: 'break-word',
  },
});

const Footer = () => {
  if (getEra() === '2016') {
    return <Footer2016 />;
  }
  const s = useFooterStyles2({ theme: getTheme() });
  return (
    <footer className={s.footerContainer} data-rbx-chrome="footer">
      <div className={s.footer}>
        <ul className={s.footerLinks}>
          {Object.getOwnPropertyNames(footerLinks).map((v) => (
            <li className={s.footerLink} key={v}>
              <a href={v}>{footerLinks[v]}</a>
            </li>
          ))}
        </ul>
        <p className={s.footerNote}>
          ©2019 Roblox Corporation. Roblox, the Roblox logo and Powering Imagination are among our
          registered and unregistered trademarks in the U.S. and other countries.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
