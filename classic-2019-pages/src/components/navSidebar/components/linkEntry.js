import { createUseStyles } from 'react-jss';
import Link from '../../link';
import { themeType } from '../../../services/theme';
import { useState } from 'react';

const formatCount = (num) => {
  if (num > 99) return '99+';
  return num;
};

const isDarkTheme = (t) => t === themeType.obc2016 || t === themeType.dark2019;

const useStyles = createUseStyles({
  linkEntry: {
    marginBottom: '0',
    paddingTop: '5px',
    color: 'inherit',
  },
  name: {
    fontSize: '16px',
    fontWeight: 500,
    verticalAlign: 'middle',
    color: (p) => (isDarkTheme(p.theme) ? '#ffffff' : 'var(--text-color-primary)'),
  },
  wrapper: {
    color: 'inherit!important',
    '&:hover': {
      cursor: 'pointer',
    },
  },
  link: {
    color: 'inherit',
    textDecoration: 'none',
  },
  countWrapper: {
    float: 'right',
    paddingTop: '5px',
  },
  count: {
    background: '#01a2fd',
    color: 'white',
    borderRadius: '10px',
    padding: '2px 7px',
  },
  icon: {
    filter: (p) => (isDarkTheme(p.theme) ? 'invert(100%)' : 'none'),
  },
  iconNoFilter: {
    filter: 'none!important',
  },
});

const LinkEntry = (props) => {
  const s = useStyles({ theme: props.theme });
  const [hover, setHover] = useState(false);

  return (
    <Link href={props.url}>
      <a className={s.link} style={{ color: 'inherit' }}>
        <div
          className={`${s.wrapper} hover-${props.icon}`}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
        >
          <p className={s.linkEntry}>
            <span className={`${props.icon} ${s.icon} ${hover ? s.iconNoFilter : ''}`} />{' '}
            <span className={s.name}>{props.name}</span>
            {props.count ? (
              <span className={s.countWrapper}>
                <span className={s.count}>{formatCount(props.count)}</span>
              </span>
            ) : null}
          </p>
        </div>
      </a>
    </Link>
  );
};

export default LinkEntry;
