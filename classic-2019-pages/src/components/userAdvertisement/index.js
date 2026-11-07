import { useEffect, useState } from 'react';
import { createUseStyles } from 'react-jss';
import request, { getBaseUrl } from '../../lib/request';
import { adTypes } from './constants';
import Link from '../link';

const useStyles = createUseStyles({
  adWrapper: {},
  adImage: {
    width: '100%',
    height: 'auto',
    margin: '0 auto',
    display: 'block',
    '@media(max-width: 800px)': {
      paddingTop: '10px',
      paddingBottom: '10px',
    },
  },
  adIdentification: {
    float: 'left',
    fontSize: '10px',
  },
  adIdentificationText: {
    color: 'var(--text-color-secondary)',
    textTransform: 'uppercase',
  },
  BadAdButton: {
    color: '#757575',
    float: 'right',
    fontSize: '10px',
    '&:hover': {
      color: 'red',
    },
  },
});

const UserAdvertisement = (props) => {
  const info = adTypes[props.type];
  const [imageUrl, setImageUrl] = useState(null);
  const [link, setLink] = useState(null);
  const [title, setTitle] = useState(null);
  const s = useStyles();

  useEffect(() => {
    let cancelled = false;
    request('GET', `${getBaseUrl()}/user-sponsorship/${props.type}`)
      .then((adData) => {
        if (cancelled || typeof adData?.data !== 'string' || !adData.data.includes('<img')) return;
        const doc = new DOMParser().parseFromString(adData.data, 'text/html');
        const img = doc.querySelector('img');
        const anchor = doc.querySelector('a');
        if (!img || !anchor) return;
        const src = img.getAttribute('src');
        const href = anchor.getAttribute('href');
        const adTitle = anchor.getAttribute('title') || 'Advertisement';
        if (src && href) {
          setImageUrl(src);
          setLink(href);
          setTitle(adTitle);
        }
      })
      .catch(() => {
        // User-sponsorship banner ads were retired on modern roblox.com; collapse cleanly
      });
    return () => {
      cancelled = true;
    };
  }, [props.type]);

  if (!info || !imageUrl) {
    return null;
  }

  return (
    <div className={`${s.adWrapper} ${props?.wrapperClass || ''}`}>
      <Link href={link || '#'}>
        <a title={title}>
          <img
            src={imageUrl}
            alt={title || 'Advertisement'}
            className={s.adImage}
            style={{ maxWidth: info.width, maxHeight: info.height }}
          />
        </a>
      </Link>
      <div>
        <span className={s.adIdentification}>
          <span className={s.adIdentificationText}>Advertisement</span>
        </span>
        <a
          className={s.BadAdButton}
          target="_top"
          href="/internal/report-center"
          title="Click to report an offensive ad"
        >
          Report
        </a>
      </div>
    </div>
  );
};

export default UserAdvertisement;
