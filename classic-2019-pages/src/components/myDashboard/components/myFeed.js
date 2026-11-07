import React, { useEffect, useState } from 'react';
import { createUseStyles } from 'react-jss';
import AuthenticationStore from '../../../stores/authentication';
import { getUserGroups } from '../../../services/groups';
import GroupIcon from '../../groupIcon';
import Link from '../../link';
import dayjs from '../../../lib/dayjs';

const useStyles = createUseStyles({
  feedList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  feedItem: {
    display: 'flex',
    gap: '12px',
    padding: '12px 0',
    borderBottom: '1px solid var(--text-color-quinary)',
    '&:last-child': {
      borderBottom: 'none',
    },
  },
  thumbWrap: {
    width: '60px',
    height: '60px',
    flexShrink: 0,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  groupTitle: {
    fontWeight: 600,
    fontSize: '15px',
    color: 'var(--primary-color)',
    textDecoration: 'none',
  },
  posterLine: {
    fontSize: '12px',
    color: 'var(--text-color-secondary)',
    marginLeft: '6px',
  },
  shoutText: {
    margin: '6px 0 4px 0',
    fontSize: '14px',
    color: 'var(--text-color-primary)',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  timestamp: {
    fontSize: '11px',
    color: 'var(--text-color-secondary)',
  },
  empty: {
    color: 'var(--text-color-secondary)',
    fontSize: '14px',
    padding: '12px 0',
    margin: 0,
  },
});

const MyFeed = () => {
  const s = useStyles();
  const auth = AuthenticationStore.useContainer();
  const [shouts, setShouts] = useState(null);

  useEffect(() => {
    if (!auth.userId) {
      setShouts([]);
      return;
    }
    getUserGroups({ userId: auth.userId })
      .then((roles) => {
        const items = (roles || [])
          .filter((r) => r?.group?.shout && r.group.shout.body)
          .map((r) => ({
            groupId: r.group.id,
            groupName: r.group.name,
            body: r.group.shout.body,
            posterId: r.group.shout.poster?.userId,
            posterName: r.group.shout.poster?.username || 'Member',
            updated: r.group.shout.updated || r.group.shout.created,
          }))
          .sort((a, b) => new Date(b.updated || 0).getTime() - new Date(a.updated || 0).getTime())
          .slice(0, 15);
        setShouts(items);
      })
      .catch(() => setShouts([]));
  }, [auth.userId]);

  if (shouts === null) {
    return <p className={s.empty}>Loading feed...</p>;
  }
  if (shouts.length === 0) {
    return <p className={s.empty}>No recent group shouts in your feed right now.</p>;
  }

  return (
    <ul className={s.feedList}>
      {shouts.map((item) => (
        <li className={s.feedItem} key={`${item.groupId}-${item.updated}`}>
          <div className={s.thumbWrap}>
            <Link href={`/Groups/${item.groupId}/--`}>
              <a>
                <GroupIcon id={item.groupId} name={item.groupName} />
              </a>
            </Link>
          </div>
          <div className={s.body}>
            <div>
              <Link href={`/Groups/${item.groupId}/--`}>
                <a className={s.groupTitle}>{item.groupName}</a>
              </Link>
              {item.posterId ? (
                <span className={s.posterLine}>
                  by{' '}
                  <Link href={`/users/${item.posterId}/profile`}>
                    <a>{item.posterName}</a>
                  </Link>
                </span>
              ) : null}
            </div>
            <p className={s.shoutText}>&quot;{item.body}&quot;</p>
            {item.updated ? (
              <span className={s.timestamp}>
                {dayjs(item.updated).format('MMM D, YYYY h:mm A')}
              </span>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
};

export default MyFeed;
