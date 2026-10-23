import { createUseStyles } from 'react-jss';
import Link from '../../link';
import { getEra, getTheme, themeType } from '../../../services/theme';

const useStyles = createUseStyles({
  container: {
    marginTop: '0',
    marginBottom: 0,
    paddingBottom: 0,
    paddingLeft: '0',
    width: '100%!important',
    height: '100%!important',
  },
  linkEntry: {
    color: (p) => (p.light2019 ? '#393b3d' : 'white'),
    fontWeight: 500,
    margin: 'auto',
    textAlign: 'center',
    fontSize: '16px',
    display: 'inline',
    textDecoration: 'none',
    padding: '6px 9px!important',
    transition: 'none',
    whiteSpace: 'nowrap',
    '&:hover': {
      color: (p) => (p.light2019 ? '#191919' : 'white'),
      background: 'rgba(25,25,25,0.1)',
      cursor: 'pointer',
      borderRadius: '4px',
      transition: 'none',
    },
    '@media(max-width: 767px)': {
      fontSize: '13px',
      padding: '4px 4px!important',
    },
    '@media(max-width: 400px)': {
      fontSize: '12px',
      padding: '0 3px!important',
    },
  },
  col: {
    paddingLeft: 0,
    marginLeft: 0,
    '@media(max-width: 1300px)': {
      width: 'auto',
    },
    '@media(max-width: 991px)': {
      padding: 0,
      margin: 0,
      marginBottom: '6px',
      width: '80%',
    },
  },
  row: {
    margin: 0,
    height: '100%',
    '@media(max-width: 767px)': {
      flexWrap: 'nowrap',
    },
  },
  linkContainer: {
    display: 'flex',
    margin: 0,
    padding: 0,
    '@media(max-width: 1300px)': {
      width: 'auto',
    },
  },
});

const LinkEntry = ({ href, external, light2019, children }) => {
  const s = useStyles({ light2019 });
  if (external) {
    return (
      <div className={`${s.linkContainer} col-3`}>
        <a href={href} className={`${s.linkEntry} nav-link active pt-0`} data-rbx-native="1">
          {children}
        </a>
      </div>
    );
  }
  return (
    <div className={`${s.linkContainer} col-3`}>
      <Link href={href}>
        <a className={`${s.linkEntry} nav-link active pt-0`}>{children}</a>
      </Link>
    </div>
  );
};

const NavigationLinks = () => {
  const era = getEra();
  const light2019 = era === '2019' && getTheme() === themeType.light;
  const s = useStyles({ light2019 });

  return (
    <div className={`${s.col} col-10 col-lg-3`}>
      <div className={s.container}>
        <div className={`${s.row} row`}>
          <LinkEntry href="/games" light2019={light2019}>
            Games
          </LinkEntry>
          <LinkEntry href="/catalog" light2019={light2019}>
            Catalog
          </LinkEntry>
          <LinkEntry href="https://create.roblox.com/" external={true} light2019={light2019}>
            Create
          </LinkEntry>
          <LinkEntry
            href={era === '2016' ? '/BuildersClub/Upgrade.ashx' : '/search/groups'}
            light2019={light2019}
          >
            {era === '2016' ? 'Builders Club' : 'Groups'}
          </LinkEntry>
        </div>
      </div>
    </div>
  );
};

export default NavigationLinks;
