import React from 'react';
import Head from 'next/head';
import SharedAssetPage from '../../../components/sharedAssetPage2019';
import Theme2016 from '../../../components/theme2016';

const GamePage = () => {
  return (
    <>
      <Head>
        <title>Game - ROBLOX</title>
      </Head>
      <Theme2016>
        <SharedAssetPage idParamName="assetId" nameParamName="name" />
      </Theme2016>
    </>
  );
};

export default GamePage;
