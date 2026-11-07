import React, { useEffect } from 'react';
import Head from 'next/head';

const UpgradeRedirectPage = () => {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      window.location.hostname.endsWith('roblox.com') &&
      !/jsdom/i.test(window.navigator?.userAgent || '')
    ) {
      try {
        window.location.replace('/plus');
      } catch (_) {}
    }
  }, []);

  return (
    <div className="container" style={{ maxWidth: 970, paddingTop: 24 }}>
      <Head>
        <title>Upgrade - ROBLOX</title>
      </Head>
      <div className="section-content">
        <p style={{ marginBottom: 12 }}>Opening Roblox Plus &amp; Membership...</p>
        <a className="link2018" href="/plus">
          Continue to Roblox Plus
        </a>
      </div>
    </div>
  );
};

export default UpgradeRedirectPage;
