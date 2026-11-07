import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import ForumThread from '../../components/forumThread';
import { getRepliesToThread } from '../../services/forums';

const limit = 15;

const ShowPostPage = () => {
  const router = useRouter();
  const id = parseInt(router.query.PostID || router.query.postid || '1', 10) || 1;
  let page = parseInt(router.query.Page || router.query.page || '1', 10);
  if (page < 1 || Number.isNaN(page)) page = 1;

  const [posts, setPosts] = useState(null);

  useEffect(() => {
    getRepliesToThread({
      threadId: id,
      limit,
      cursor: String(page * limit - limit),
    })
      .then((res) => setPosts(res || { data: [] }))
      .catch(() => setPosts({ data: [] }));
  }, [id, page]);

  if (!posts) return null;
  return <ForumThread id={id} page={page} posts={posts} />;
};

export default ShowPostPage;
