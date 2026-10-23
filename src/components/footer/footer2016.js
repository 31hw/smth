import { createUseStyles } from 'react-jss';
import { getTheme, themeType } from '../../services/theme';

const useFooterStyles = createUseStyles({
  text: {
    color: (p) => (p.theme === themeType.obc2016 ? '#c8c8c8' : '#B8B8B8'),
    fontSize: '12px',
    fontWeight: '400',
  },
  link: {
    fontSize: '21px',
    textAlign: 'center',
    fontWeight: '300',
    textDecoration: 'none',
    '&:hover': {
      color: (p) => (p.theme === themeType.obc2016 ? '#ffffff' : '#191919'),
    },
  },
  footer: {
    background: (p) => (p.theme === themeType.obc2016 ? '#393939' : '#ffffff'),
  },
  footerContainer: {
    paddingTop: '5px',
    paddingBottom: '20px',
  },
});

const footerLinks = {
  'https://corp.roblox.com/': 'About Us',
  'https://corp.roblox.com/careers/': 'Jobs',
  'https://blog.roblox.com/': 'Blog',
  'https://en.help.roblox.com/hc/en-us/articles/115004630823': 'Privacy',
  'https://en.help.roblox.com/': 'Help',
};

const Footer2016 = () => {
  const s = useFooterStyles({ theme: getTheme() });
  return (
    <footer className={s.footer}>
      <div className={`container mt-4 mb-0 ${s.footerContainer}`}>
        <div className="row justify-content-center">
          {Object.getOwnPropertyNames(footerLinks).map((v) => (
            <div className="col-2 mb-2" key={v}>
              <h2 className={`${s.text} ${s.link}`}>
                <a className={`${s.text} ${s.link}`} href={v}>
                  {footerLinks[v]}
                </a>
              </h2>
            </div>
          ))}
          <div className="col-12 col-lg-10 offset-lg-1">
            <p className={s.text}>
              ROBLOX, &quot;Online Building Toy&quot;, characters, logos, names, and all related
              indicia are trademarks of <a href="https://corp.roblox.com">ROBLOX Corporation</a>,
              ©2016. Patents pending. ROBLOX is not sponsored, authorized or endorsed by any
              producer of plastic building bricks, including The LEGO Group, MEGA Brands, and
              K&apos;Nex, and no resemblance to the products of these companies is intended. Use of
              this site signifies your acceptance of the{' '}
              <a href="https://en.help.roblox.com/hc/en-us/articles/115004647846">
                Terms and Conditions
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer2016;
