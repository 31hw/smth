import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import UserInventory from '../../../components/userInventory';
import { getUserInfo } from '../../../services/users';

const UserInventoryPage = (props) => {
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
        <title>{username ? `${username}'s Inventory - ROBLOX` : 'Inventory - ROBLOX'}</title>
      </Head>
      <UserInventory userId={userId} mode="Inventory" />
    </>
  );
};

export default UserInventoryPage;
