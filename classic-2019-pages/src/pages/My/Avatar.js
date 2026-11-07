import React from 'react';
import Head from 'next/head';
import AdBanner from '../../components/ad/adBanner';
import AvatarEditor from '../../components/AvatarEditorPage';
import AvatarInfoStore from '../../components/AvatarEditorPage/stores/avatarInfoStore';
import AvatarPageStore from '../../components/AvatarEditorPage/stores/avatarPageStore';
import Theme2016 from '../../components/theme2016';
import MyCharacterPage from './Character.aspx';
import { avPageStyleType, getAvPageStyle } from '../../services/theme';

const AvatarPage = () => {
  if (getAvPageStyle() === avPageStyleType.Legacy) {
    return (
      <>
        <Head>
          <title>Character Customizer - ROBLOX</title>
        </Head>
        <MyCharacterPage />
      </>
    );
  }

  return (
    <Theme2016>
      <Head>
        <title>Avatar - ROBLOX</title>
      </Head>
      <div className="container flex flex-column ssp">
        <AdBanner context="MyCharacterPage" />
        <AvatarInfoStore.Provider>
          <AvatarPageStore.Provider>
            <AvatarEditor />
          </AvatarPageStore.Provider>
        </AvatarInfoStore.Provider>
      </div>
    </Theme2016>
  );
};

export default AvatarPage;
