import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/dist/client/router';
import ForumContainer from '../../components/forumContainer';
import ForumHeader from '../../components/forumHeader';
import { getSubcategoryById, getThreadInfoById } from '../../services/forums';

const DEVFORUM = 'https://devforum.roblox.com';

const AddPostPage = () => {
  const router = useRouter();
  const postId = router.query.PostID;
  const forumId = router.query.ForumID;
  const [target, setTarget] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (forumId) {
        const sub = getSubcategoryById(forumId);
        const url = `${DEVFORUM}/c/${encodeURIComponent(sub.slug || sub.id)}/${encodeURIComponent(sub.id)}`;
        if (active) setTarget({ label: `New topic in ${sub.name}`, url });
        return;
      }
      if (postId) {
        const info = await getThreadInfoById({ threadId: postId });
        if (active) {
          setTarget({
            label: info?.title ? `Reply to "${info.title}"` : `Reply to topic #${postId}`,
            url: info?.devForumUrl || `${DEVFORUM}/t/${encodeURIComponent(postId)}`,
          });
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [postId, forumId]);

  return (
    <ForumContainer>
      <Head>
        <title>Post - ROBLOX Forum</title>
      </Head>
      <ForumHeader />
      <div className="section-content mt-3">
        <h3 className="mb-2">Continue on the Roblox Developer Forum</h3>
        <p style={{ color: 'var(--text-color-secondary)' }}>
          Posting and replying now happen on the official Roblox Developer Forum so your topic is
          visible to the whole creator community.
        </p>
        {target ? (
          <p className="mb-0">
            <a href={target.url} target="_blank" rel="noopener noreferrer">
              {target.label}
            </a>
          </p>
        ) : (
          <p className="mb-0">
            <a href={DEVFORUM} target="_blank" rel="noopener noreferrer">
              Open Roblox Developer Forum
            </a>
          </p>
        )}
      </div>
    </ForumContainer>
  );
};

export default AddPostPage;
