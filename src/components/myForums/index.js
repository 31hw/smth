import Head from 'next/head';
import useForumStyles from '../forumHome/forumStyles';
import ForumContainer from '../forumContainer';
import Link from '../link';
import { useEffect, useState } from 'react';
import authentication from '../../stores/authentication';
import { getPostsByUser } from '../../services/forums';
import ForumHeader from '../forumHeader';

const MyForums = () => {
  const s = useForumStyles();
  const [posts, setPosts] = useState(null);
  const [offset, setOffset] = useState(0);
  const limit = 15;
  const auth = authentication.useContainer();

  useEffect(() => {
    if (auth.isPending) return;
    if (!auth.userId && !auth.username) {
      setPosts({ data: [] });
      return;
    }
    getPostsByUser({
      offset,
      limit,
      userId: auth.userId,
      username: auth.username,
    }).then((d) => {
      setPosts(d || { data: [] });
    });
  }, [auth.isPending, auth.userId, auth.username, offset]);

  const pageNumber = offset / limit + 1;
  const nextPageAvailable = Boolean(posts && posts.data.length >= limit);

  return (
    <ForumContainer>
      <Head>
        <title>My Forums - ROBLOX Forum</title>
      </Head>
      <ForumHeader />
      <table className="w-100">
        <thead className={s.header}>
          <tr className={s.headerRow}>
            <th>Subject</th>
            <th>Excerpt</th>
          </tr>
        </thead>
        <tbody>
          {posts === null ? (
            <tr>
              <td colSpan={2} className="p-3 text-center">
                Loading your Developer Forum activity...
              </td>
            </tr>
          ) : posts.data.length === 0 ? (
            <tr>
              <td colSpan={2} className="p-3 text-center">
                No Developer Forum posts found for your account yet.
              </td>
            </tr>
          ) : (
            posts.data.map((v, idx) => (
              <tr className={s.bodyRow} key={`${v.postId}-${idx}`}>
                <td>
                  <Link href={`/Forum/ShowPost.aspx?PostID=${v.threadId || v.postId}`}>
                    <a>{v.title ? v.title : 'Topic #' + v.threadId}</a>
                  </Link>
                </td>
                <td>{v.post}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="row mt-1">
        <div className="col-6">
          <p className="fw-bold">Page {pageNumber}</p>
        </div>
        <div className="col-6">
          <p className="mb-0 text-end">
            {pageNumber > 1 ? (
              <span
                className="cursor-pointer"
                onClick={() => {
                  setOffset(offset - limit);
                }}
              >
                Previous
              </span>
            ) : null}
            <span className="ms-2 me-2">{pageNumber}</span>
            {nextPageAvailable ? (
              <span
                className="cursor-pointer me-2"
                onClick={() => {
                  setOffset(offset + limit);
                }}
              >
                Next
              </span>
            ) : null}
          </p>
        </div>
      </div>
    </ForumContainer>
  );
};

export default MyForums;
