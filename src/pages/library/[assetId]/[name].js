import React from 'react';
import Head from 'next/head';
import SharedAssetPage from '../../../components/sharedAssetPage2019';

const LibraryItemPage = () => {
  return (
    <>
      <Head>
        <title>Library Item - ROBLOX</title>
      </Head>
      <SharedAssetPage idParamName="assetId" nameParamName="name" />
    </>
  );
};

export default LibraryItemPage;
