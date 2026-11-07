import React from 'react';
import Head from 'next/head';
import SharedAssetPage from '../../../components/sharedAssetPage2019';

const ItemPage = () => {
  return (
    <>
      <Head>
        <title>Catalog Item - ROBLOX</title>
      </Head>
      <SharedAssetPage idParamName="assetId" nameParamName="name" />
    </>
  );
};

export default ItemPage;
