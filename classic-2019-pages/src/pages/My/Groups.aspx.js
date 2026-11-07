import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import MyGroups from '../../components/myGroups';
import GroupPageStore from '../../components/myGroups/stores/groupPageStore';
import MyGroupsStore from '../../components/myGroups/stores/myGroupsStore';

const MyGroupsPage = (props) => {
  const router = useRouter();
  const activeGroupId = router.query.gid || router.query.id || props.groupId;

  return (
    <MyGroupsStore.Provider>
      <GroupPageStore.Provider>
        <Head>
          <title>Groups - ROBLOX</title>
        </Head>
        <MyGroups id={activeGroupId} />
      </GroupPageStore.Provider>
    </MyGroupsStore.Provider>
  );
};

export default MyGroupsPage;
