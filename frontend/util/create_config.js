const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const envPath = path.join(__dirname, '../.env.local');

const main = () => {
  if (fs.existsSync(envPath)) {
    console.error('.env.local already exists at this path:', envPath, '\n\nMove or remove it first if you want to regenerate local settings.');
    return 1;
  }

  const webOrigin = process.env.REVIVAL_WEB_ORIGIN || 'http://127.0.0.1:3000';
  const apiOrigin = process.env.REVIVAL_API_ORIGIN || 'http://127.0.0.1:3001';
  const connectionMode = String(process.env.REVIVAL_CONNECTION_MODE || 'localhost').toLowerCase();
  if (!['localhost', 'tunnel'].includes(connectionMode)) {
    console.error('REVIVAL_CONNECTION_MODE must be "localhost" or "tunnel".');
    return 1;
  }
  const csrfKey = crypto.randomBytes(48).toString('base64url');
  const contents = [
    '# Local-first development settings. Do not commit this file.',
    `REVIVAL_CONNECTION_MODE=${connectionMode}`,
    `REVIVAL_WEB_ORIGIN=${webOrigin}`,
    `REVIVAL_API_ORIGIN=${apiOrigin}`,
    `NEXT_PUBLIC_WEB_ORIGIN=${webOrigin}`,
    `NEXT_PUBLIC_API_ORIGIN=${apiOrigin}`,
    `REVIVAL_CSRF_KEY=${csrfKey}`,
    '',
  ].join('\n');

  fs.writeFileSync(envPath, contents, { mode: 0o600 });
  console.log('Development environment created at:', envPath);
  console.log('Connection mode:', connectionMode);
  console.log('Web:', webOrigin);
  console.log('API:', apiOrigin);
  return 0;
};

process.exitCode = main();
