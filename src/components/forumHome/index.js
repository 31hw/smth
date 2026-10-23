import Head from 'next/head';
import { createUseStyles } from 'react-jss';
import ForumContainer from '../forumContainer';
import { fetchCategories, getCategories, getSubCategoryInfo } from '../../services/forums';
import useForumStyles from './forumStyles';
import dayjs from '../../lib/dayjs';
import ForumHeader from '../forumHeader';
import Link from '../link';
import { useEffect, useReducer, useState } from 'react';
import { getTheme } from '../../services/theme';

const useStyles = createUseStyles({
  currentTime: {
    color: 'var(--text-color-primary)',
  },
});

const subReducer = (prev, act) => {
  if (act.type === 'ADD') {
    return {
      ...prev,
      [act.subCategoryId]: act.data,
    };
  }
  return prev;
};

const ForumHome = () => {
  const s = useForumStyles();
  const styles = useStyles({ theme: getTheme() });
  const [cats, setCats] = useState(() => getCategories());
  const [subMap, dispatchSubMap] = useReducer(subReducer, {});

  useEffect(() => {
    let active = true;
    fetchCategories().then((liveCats) => {
      if (!active) return;
      const list = Array.isArray(liveCats) && liveCats.length > 0 ? liveCats : getCategories();
      setCats(list);
      const allSubs = list.flatMap((v) => v.subCategories || []);
      for (const item of allSubs) {
        if (item.stats) {
          dispatchSubMap({
            type: 'ADD',
            subCategoryId: item.id,
            data: item.stats,
          });
        } else {
          getSubCategoryInfo({
            subCategoryId: item.id,
          }).then((data) => {
            if (!active) return;
            dispatchSubMap({
              type: 'ADD',
              subCategoryId: item.id,
              data,
            });
          });
        }
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <ForumContainer>
      <Head>
        <title>ROBLOX Forum - Developer Forum</title>
      </Head>
      <ForumHeader>
        <p className={styles.currentTime}>
          <span className="fw-bold">Current time: </span>
          <span>{dayjs().format('MMM DD, hh:mm A')}</span>
        </p>
      </ForumHeader>
      {cats.map((v) => (
        <table className="w-100 mb-3" key={v.id}>
          <thead className={s.header}>
            <tr className={s.headerRow}>
              <th>{v.name}</th>
              <th className="text-center">Threads</th>
              <th className="text-center">Posts</th>
              <th className={`${s.lastPostHeader} text-center`}>Last Post</th>
            </tr>
          </thead>
          <tbody>
            {v.subCategories.map((sub) => {
              const info = subMap[sub.id] || sub.stats;
              const loaded = Boolean(info);
              const lastPost = info?.lastPost || null;
              return (
                <tr className={s.bodyRow} key={sub.id}>
                  <td>
                    <Link href={`/Forum/ShowForum.aspx?ForumID=${sub.id}`}>
                      <a className="normal">
                        <p className="mb-0 fw-bold mt-2">{sub.name}</p>
                        {sub.description ? <p className="mb-2">{sub.description}</p> : null}
                      </a>
                    </Link>
                  </td>
                  <td className="text-center">
                    {loaded ? Number(info.threadCount || 0).toLocaleString() : '—'}
                  </td>
                  <td className="text-center">
                    {loaded ? Number(info.postCount || 0).toLocaleString() : '—'}
                  </td>
                  <td>
                    {lastPost ? (
                      <div>
                        <Link
                          href={`/Forum/ShowPost.aspx?PostID=${lastPost.threadId || lastPost.postId}`}
                        >
                          <a className="normal">
                            <p className="fw-bold mb-0 text-center">
                              {dayjs(lastPost.createdAt).fromNow()}
                            </p>
                            <p className="mb-0 text-center">{lastPost.username}</p>
                          </a>
                        </Link>
                      </div>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ))}
    </ForumContainer>
  );
};

export default ForumHome;
