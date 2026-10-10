import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { rm, writeFile } from 'node:fs/promises';
import test from 'node:test';
import { openDatabase } from '../database.mjs';
import { createBackendServer } from '../server.mjs';

const frontendRequire = createRequire(resolve(process.cwd(), 'frontend/package.json'));
const sharp = frontendRequire('sharp');
const testIconPath = resolve(process.cwd(), 'frontend/public/img/__arena_icon_upload_test.png');

async function startTestServer() {
  const db = openDatabase(':memory:');
  const { server } = createBackendServer({ db });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  return {
    db,
    server,
    baseUrl: `http://127.0.0.1:${address.port}`,
    async close() {
      await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
      db.close();
    },
  };
}

async function createOwner(baseUrl) {
  const metadata = await fetch(`${baseUrl}/api/auth/v2/signup-metadata`).then((response) => response.json());
  const response = await fetch(`${baseUrl}/api/auth/v2/signup`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      username: 'AvatarOwner',
      password: 'local-password-123',
      signupToken: metadata.signupToken,
      website: '',
    }),
  });
  assert.equal(response.status, 201);
  return response.headers.get('set-cookie').split(';', 1)[0];
}

test('avatar rules include valid BrickColor IDs and user avatar edits persist', async (t) => {
  const app = await startTestServer();
  t.after(() => app.close());
  const cookie = await createOwner(app.baseUrl);

  const rulesResponse = await fetch(`${app.baseUrl}/api/avatar/v1/avatar-rules`);
  assert.equal(rulesResponse.status, 200);
  const rules = await rulesResponse.json();
  assert.ok(rules.basicBodyColorsPalette.some((color) => color.brickColorId === 1001));
  assert.equal(rules.basicBodyColorsPalette.find((color) => color.brickColorId === 1001).hexColor, '#F8F8F8');

  const colorResponse = await fetch(`${app.baseUrl}/api/avatar/v1/avatar/set-body-colors`, {
    method: 'POST',
    headers: { cookie, 'content-type': 'application/json' },
    body: JSON.stringify(Object.fromEntries([
      'headColorId', 'torsoColorId', 'rightArmColorId', 'leftArmColorId', 'rightLegColorId', 'leftLegColorId',
    ].map((key) => [key, 1001]))),
  });
  assert.equal(colorResponse.status, 200);

  const assetResponse = await fetch(`${app.baseUrl}/api/avatar/v1/avatar/set-wearing-assets`, {
    method: 'POST',
    headers: { cookie, 'content-type': 'application/json' },
    body: JSON.stringify({
      assetIds: [123456],
      assets: [{ id: 123456, name: 'Test Hat', assetType: { id: 8 } }],
    }),
  });
  assert.equal(assetResponse.status, 200);

  const avatarResponse = await fetch(`${app.baseUrl}/api/avatar/v1/avatar`, { headers: { cookie } });
  assert.equal(avatarResponse.status, 200);
  const avatar = await avatarResponse.json();
  assert.equal(avatar.bodyColors.headColorId, 1001);
  assert.deepEqual(avatar.assets, [{ id: 123456, name: 'Test Hat', assetType: { id: 8 } }]);
});

test('web icon replacement converts mismatched uploads to the existing path format', async (t) => {
  const app = await startTestServer();
  t.after(async () => {
    await app.close();
    await rm(testIconPath, { force: true });
  });
  await writeFile(testIconPath, Buffer.from('old image contents'));

  const unauthorized = await fetch(`${app.baseUrl}/api/admin/web/icons`);
  assert.equal(unauthorized.status, 401);
  const cookie = await createOwner(app.baseUrl);
  const imageResponse = await fetch(`${app.baseUrl}/api/admin/web/icons`, { headers: { cookie } });
  assert.equal(imageResponse.status, 200);
  const icons = await imageResponse.json();
  assert.ok(icons.icons.some((icon) => icon.path === '/img/__arena_icon_upload_test.png'));

  const jpeg = await sharp({
    create: { width: 8, height: 6, channels: 3, background: '#28a0ff' },
  }).jpeg().toBuffer();
  const replacement = await fetch(`${app.baseUrl}/api/admin/web/icons?path=${encodeURIComponent('/img/__arena_icon_upload_test.png')}`, {
    method: 'PUT',
    headers: { cookie, 'content-type': 'image/jpeg' },
    body: jpeg,
  });
  assert.equal(replacement.status, 200);
  const result = await replacement.json();
  assert.equal(result.inputFormat, 'jpeg');
  assert.equal(result.outputFormat, 'png');
  assert.equal(result.icon.path, '/img/__arena_icon_upload_test.png');
  assert.equal(result.icon.name, '__arena_icon_upload_test.png');
  assert.equal(result.icon.contentType, 'image/png');
  assert.equal((await sharp(testIconPath).metadata()).format, 'png');
});
