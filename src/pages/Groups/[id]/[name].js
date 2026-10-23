import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import MyGroups from '../../../components/myGroups';
import GroupPageStore from '../../../components/myGroups/stores/groupPageStore';
import MyGroupsStore from '../../../components/myGroups/stores/myGroupsStore';
import { getInfo } from '../../../services/groups';

const GroupEmbedPage = (props) => {
  const router = useRouter();
  const groupId = Number(router.query.id || router.query.gid || props.groupId || 0);
  const [groupName, setGroupName] = useState(props.groupName || 'Group');

  useEffect(() => {
    if (!groupId) return;
    getInfo({ groupId })
      .then((info) => {
        if (info?.name) setGroupName(info.name);
      })
      .catch(() => {});
  }, [groupId]);

  return (
    <>
      <Head>
        <title>{groupName} - ROBLOX</title>
      </Head>
      <MyGroupsStore.Provider>
        <GroupPageStore.Provider>
          <MyGroups id={groupId || undefined} />
        </GroupPageStore.Provider>
      </MyGroupsStore.Provider>
    </>
  );
};

export default GroupEmbedPage;
