import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Theme2016 from '../../../components/theme2016';
import UserProfile from '../../../components/userProfile';
import UserProfileStore from '../../../components/userProfile/stores/UserProfileStore';
import { getUserInfo } from '../../../services/users';

const UserProfilePage = (props) => {
  const router = useRouter();
  const userId = router.query.userId || props.userId;
  const [username, setUsername] = useState(props.username || '');

  useEffect(() => {
    if (!userId) return;
    getUserInfo({ userId })
      .then((info) => {
        if (info?.name) setUsername(info.name);
      })
      .catch(() => {});
  }, [userId]);

  if (!userId) return null;

  return (
    <>
      <Head>
        <title>{username ? `${username}'s Profile - ROBLOX` : 'Profile - ROBLOX'}</title>
      </Head>
      <UserProfileStore.Provider>
        <Theme2016>
          <UserProfile userId={userId} />
        </Theme2016>
      </UserProfileStore.Provider>
    </>
  );
};

export default UserProfilePage;
