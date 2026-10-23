import Head from 'next/head';
import { useEffect, useState } from 'react';
import {
  fetchCategories,
  getCategoryBySubCategoryId,
  getPostsInSubcategory,
  getSubcategoryById,
} from '../../services/forums';
import Link from '../link';
import { ForumHeaderSubCategory } from '../forumHeader';
import dayjs from '../../lib/dayjs';
import ForumContainer from '../forumContainer';
import useForumStyles from '../forumHome/forumStyles';

const limit = 15;

const ForumSubcategory = (props) => {
  const s = useForumStyles();
  const { id } = props;
  const pageNumber = Math.max(Number(props.page) || 1, 1);
  const offset = (pageNumber - 1) * limit;

  const [sub, setSub] = useState(() => getSubcategoryById(parseInt(id, 10)));
  const [cat, setCat] = useState(() => getCategoryBySubCategoryId(parseInt(id, 10)));
  const [posts, setPosts] = useState(null);

  useEffect(() => {
    let active = true;
    const subId = parseInt(id, 10) || 36;
    setPosts(null);
    setSub(getSubcategoryById(subId));
    setCat(getCategoryBySubCategoryId(subId));

    fetchCategories().then(() => {
      if (!active) return;
      setSub(getSubcategoryById(subId));
      setCat(getCategoryBySubCategoryId(subId));
    });

    getPostsInSubcategory({
      subCategoryId: subId,
      cursor: offset.toString(),
      limit,
    }).then((data) => {
      if (!active) return;
      setPosts(data);
      setSub(getSubcategoryById(subId));
      setCat(getCategoryBySubCategoryId(subId));
    });

    return () => {
      active = false;
    };
  }, [id, offset]);

  const nextPageAvailable = Boolean(posts && (posts.hasMore || posts.data.length >= limit));

  if (!sub) return null;

  return (
    <ForumContainer>
      <Head>
        <title>{sub.name} - ROBLOX Forum</title>
      </Head>
      <ForumHeaderSubCategory cat={cat} sub={sub} />
      <div className="w-100 clearfix mb-2">
        <div className="float-start">
          <a
            href={`https://devforum.roblox.com/c/${encodeURIComponent(sub.slug || sub.id)}/${encodeURIComponent(sub.id)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            New Thread (DevForum)
          </a>
        </div>
      </div>

      <table className="w-100">
        <thead className={s.header}>
          <tr className={s.headerRow}>
            <th>Subject</th>
            <th>Author</th>
            <th className="text-center">Replies</th>
            <th className="text-center">Views</th>
            <th className="text-center">Last Post</th>
          </tr>
        </thead>
        <tbody>
          {posts === null ? (
            <tr>
              <td colSpan={5} className="p-3 text-center">
                Loading topics from Roblox Developer Forum...
              </td>
            </tr>
          ) : posts.data.length === 0 ? (
            <tr>
              <td colSpan={5} className="p-3 text-center">
                No topics found in this category.
              </td>
            </tr>
          ) : (
            posts.data.map((e) => {
              const v = e.post;
              const replyCount = e.replyCount || 0;
              const views = typeof e.views === 'number' ? e.views.toLocaleString() : '—';
              const isRead = e.isRead;
              const latestPost = e.lastPost || e.lastReply || e.recentPost || v;
              const latestPostUsername = latestPost?.username || v.username;
              const latestPostUserId = latestPost?.userId || v.userId;
              const latestPostCreatedAt = latestPost?.createdAt || v.createdAt;

              return (
                <tr className={s.bodyRow} key={v.threadId}>
                  <td>
                    <Link href={`/Forum/ShowPost.aspx?PostID=${v.threadId}`}>
                      <a className="normal">
                        <div className="d-inline-block me-1">
                          <img
                            src={isRead ? '/img/thread-read.png' : '/img/thread-unread.png'}
                            alt="Thread Icon"
                          />
                        </div>
                        <div className="d-inline-block">{v.title}</div>
                      </a>
                    </Link>
                  </td>
                  <td>
                    <Link href={`/users/${v.userId}/profile`}>
                      <a className="normal">{v.username}</a>
                    </Link>
                  </td>
                  <td className="text-center">{replyCount.toLocaleString()}</td>
                  <td className="text-center">{views}</td>
                  <td>
                    <p className="text-center mb-0 fw-bold">
                      {dayjs(latestPostCreatedAt).fromNow()}
                    </p>
                    <p className="text-center mb-0">
                      <Link href={`/users/${latestPostUserId}/profile`}>
                        <a className="normal">{latestPostUsername}</a>
                      </Link>
                    </p>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
        <thead className={s.header}>
          <tr className={s.headerRow}>
            <th>
              <p className="mb-0">&emsp;</p>
            </th>
            <th />
            <th />
            <th />
            <th />
          </tr>
        </thead>
      </table>
      <div className="row mt-1">
        <div className="col-6">
          <p className="fw-bolder">Page {pageNumber}</p>
        </div>
        <div className="col-6">
          <p className="mb-0 text-end">
            {pageNumber > 1 ? (
              <Link href={`/Forum/ShowForum.aspx?ForumID=${id}&Page=${pageNumber - 1}`}>
                <a className="pe-2">{pageNumber - 1}</a>
              </Link>
            ) : null}
            <span>{pageNumber}</span>
            {nextPageAvailable ? (
              <Link href={`/Forum/ShowForum.aspx?ForumID=${id}&Page=${pageNumber + 1}`}>
                <a className="ps-2">{pageNumber + 1}</a>
              </Link>
            ) : null}
          </p>
        </div>
      </div>
    </ForumContainer>
  );
};

export default ForumSubcategory;
