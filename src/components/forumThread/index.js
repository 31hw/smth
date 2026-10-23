import Head from 'next/head';
import { useEffect, useState } from 'react';
import {
  getCategoryBySubCategoryId,
  getSubcategoryById,
  getThreadInfoById,
  markAsRead,
} from '../../services/forums';
import { ForumHeaderSubCategory } from '../forumHeader';
import { createUseStyles } from 'react-jss';
import Link from '../link';
import PlayerImage from '../playerImage';
import dayjs from '../../lib/dayjs';
import ForumContainer from '../forumContainer';
import BcOverlay from '../bcOverlay';

const useStyles = createUseStyles({
  forumHeader: {
    background: '#29508d',
  },
  avatarHead: {
    width: '155px',
  },
  postRow: {
    background: 'var(--surface-subtle)',
    borderBottom: '1px solid var(--text-color-quinary)',
  },
  userStat: {
    marginBottom: 0,
    fontSize: '0.88rem',
  },
  postBody: {
    lineHeight: '1.6em',
    wordWrap: 'anywhere',
    color: 'var(--text-color-primary)',
    '& a': {
      color: 'var(--primary-color)',
      textDecoration: 'underline',
    },
    '& pre': {
      background: 'var(--input-bg)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 4,
      padding: '10px 12px',
      overflowX: 'auto',
      fontSize: '0.88rem',
    },
    '& code': {
      background: 'var(--input-bg)',
      padding: '1px 4px',
      borderRadius: 3,
      fontSize: '0.88rem',
    },
    '& blockquote': {
      borderLeft: '3px solid var(--primary-color)',
      paddingLeft: 12,
      marginLeft: 0,
      color: 'var(--text-color-secondary)',
    },
  },
});

const limit = 15;

const ForumThread = (props) => {
  const s = useStyles();
  const { id } = props;
  const [threadInfo, setThreadInfo] = useState(null);
  const [sub, setSub] = useState(null);
  const [cat, setCat] = useState(null);
  const [posts, setPosts] = useState(props.posts || null);
  const pageNumber = Math.max(Number(props.page) || 1, 1);

  useEffect(() => {
    let active = true;
    getThreadInfoById({ threadId: id }).then((d) => {
      if (!active || !d) return;
      setThreadInfo(d);
      setCat(getCategoryBySubCategoryId(d.subCategoryId));
      setSub(getSubcategoryById(d.subCategoryId));
    });
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    setPosts(props.posts);
    if (props.posts?.data?.length) {
      markAsRead({
        postId: props.posts.data[props.posts.data.length - 1].post.postId,
      });
    }
  }, [pageNumber, props.posts]);

  const nextPageAvailable = Boolean(
    posts && (posts.hasMore || (posts.data && posts.data.length >= limit))
  );

  if (!threadInfo || !cat || !sub) return null;

  const PreviousAndNextThread = () => (
    <div className={s.forumHeader}>
      <h4 className="text-end pe-2 pt-1 pb-1 text-white mb-0">
        {threadInfo.previousThreadId ? (
          <Link href={`/Forum/ShowPost.aspx?PostID=${threadInfo.previousThreadId}`}>
            <a className="text-white">Previous Thread</a>
          </Link>
        ) : (
          <span className="opacity-50">Previous Thread</span>
        )}
        <span className="fw-bolder ps-1 pe-1 text-black">::</span>
        {threadInfo.nextThreadId ? (
          <Link href={`/Forum/ShowPost.aspx?PostID=${threadInfo.nextThreadId}`}>
            <a className="text-white">Next Thread</a>
          </Link>
        ) : (
          <span className="opacity-50">Next Thread</span>
        )}
      </h4>
    </div>
  );

  return (
    <ForumContainer>
      <Head>
        <title>{threadInfo.title} - ROBLOX Forum</title>
      </Head>
      <ForumHeaderSubCategory cat={cat} sub={sub} />
      <h3>{threadInfo.title}</h3>
      <PreviousAndNextThread />
      <table className="w-100">
        <thead>
          <tr>
            <th className={s.avatarHead} />
            <th />
          </tr>
        </thead>
        <tbody>
          {posts && posts.data.length === 0 ? (
            <tr>
              <td colSpan={2} className="p-3">
                No posts available
              </td>
            </tr>
          ) : null}
          {posts
            ? posts.data.map((v) => {
                const post = v.post;
                return (
                  <tr className={s.postRow} key={post.postId}>
                    <td className="align-top p-2">
                      <Link href={`/users/${post.userId}/profile`}>
                        <a className="fw-bold">{post.username}</a>
                      </Link>
                      <PlayerImage id={post.userId} />
                      <BcOverlay id={post.userId} />
                      <p className={s.userStat}>
                        <span className="fw-bold">Posted: </span>
                        <span>{dayjs(v.createdAt).format('DD MMM YYYY')}</span>
                      </p>
                      <p className={`${s.userStat} mb-3`}>
                        <span className="fw-bold">Reads: </span>
                        <span>{Number(v.postCount || 1).toLocaleString()}</span>
                      </p>
                    </td>
                    <td className="align-top p-2">
                      <div className="ps-3">
                        <p className="mb-1" style={{ color: 'var(--text-color-secondary)', fontSize: '0.88rem' }}>
                          {dayjs(post.createdAt).format('MM-DD-YYYY hh:mm A')}
                        </p>
                        {post.postHtml ? (
                          <div
                            className={`mt-1 ${s.postBody}`}
                            dangerouslySetInnerHTML={{ __html: post.postHtml }}
                          />
                        ) : (
                          <p className={`mt-1 ${s.postBody}`}>{post.post}</p>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            : null}
        </tbody>
      </table>
      <PreviousAndNextThread />
      <div className="row mt-1">
        <div className="col-6">
          <p className="fw-bold">Page {pageNumber}</p>
        </div>
        <div className="col-6">
          <p className="mb-0 text-end">
            {pageNumber > 1 ? (
              <Link href={`/Forum/ShowPost.aspx?PostID=${id}&Page=${pageNumber - 1}`}>
                <a className="pe-2">{pageNumber - 1}</a>
              </Link>
            ) : null}
            <span>{pageNumber}</span>
            {nextPageAvailable ? (
              <Link href={`/Forum/ShowPost.aspx?PostID=${id}&Page=${pageNumber + 1}`}>
                <a className="ps-2">{pageNumber + 1}</a>
              </Link>
            ) : null}
          </p>
        </div>
      </div>
      <p className="text-center mb-0 mt-3">
        <a
          href={threadInfo.devForumUrl || `https://devforum.roblox.com/t/${id}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Reply / Open on Roblox Developer Forum
        </a>
      </p>
    </ForumContainer>
  );
};

export default ForumThread;
