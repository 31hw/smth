const path = require('path');

module.exports = {
  reactStrictMode: true,
  allowedDevOrigins: ['*.e2b.app'],
  async redirects() {
    return [
      {
        source: '/catalog.aspx',
        destination: '/catalog',
        permanent: true,
      },
    ];
  },
  webpack(config) {
    // The upstream Pages Router used next/config, removed in modern Next.
    // Keep its pages untouched and provide the same interface from our local config shim.
    config.resolve.alias = {
      ...config.resolve.alias,
      'next/config$': path.resolve(__dirname, 'lib/next-config-shim.js'),
    };
    return config;
  },
};
