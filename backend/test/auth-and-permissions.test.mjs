import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import { openDatabase } from '../database.mjs';
import { createBackendServer } from '../server.mjs';

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

async function createAccount(baseUrl, username, password = 'local-password-123') {
  const metadata = await fetch(`${baseUrl}/api/auth/v2/signup-metadata`).then((response) => response.json());
  return fetch(`${baseUrl}/api/auth/v2/signup`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password, signupToken: metadata.signupToken, website: '' }),
  });
}

test('database starts empty and does not seed users', async (t) => {
  const app = await startTestServer();
  t.after(() => app.close());
  const count = app.db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
  assert.equal(Number(count), 0);
});

test('first registered user is ID 1 and receives wildcard permissions', async (t) => {
  const app = await startTestServer();
  t.after(() => app.close());

  const response = await createAccount(app.baseUrl, 'InstanceOwner');
  assert.equal(response.status, 201);
  const user = await response.json();
  assert.equal(user.id, 1);
  assert.equal(user.isStaff, true);
  assert.equal(user.role, 'owner');
  assert.ok(user.permissions.includes('*'));

  const cookie = response.headers.get('set-cookie').split(';', 1)[0];
  const authResponse = await fetch(`${app.baseUrl}/api/users/v1/users/authenticated`, { headers: { cookie } });
  assert.equal(authResponse.status, 200);
  assert.equal((await authResponse.json()).id, 1);

  const arbitraryPermission = await fetch(`${app.baseUrl}/api/admin/permissions/check?permission=anything:at-all`, { headers: { cookie } });
  assert.deepEqual(await arbitraryPermission.json(), {
    userId: 1,
    permission: 'anything:at-all',
    allowed: true,
  });

  const adminResponse = await fetch(`${app.baseUrl}/api/admin-api/api/assets/pending-assets`, { headers: { cookie } });
  assert.equal(adminResponse.status, 200);
  assert.deepEqual(await adminResponse.json(), []);
});

test('login creates a session and logout revokes it', async (t) => {
  const app = await startTestServer();
  t.after(() => app.close());

  const signupResponse = await createAccount(app.baseUrl, 'SessionUser');
  assert.equal(signupResponse.status, 201);

  const loginResponse = await fetch(`${app.baseUrl}/api/auth/v2/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ctype: 'username', cvalue: 'SessionUser', password: 'local-password-123' }),
  });
  assert.equal(loginResponse.status, 200);
  assert.equal((await loginResponse.json()).id, 1);

  const cookie = loginResponse.headers.get('set-cookie').split(';', 1)[0];
  const authenticated = await fetch(`${app.baseUrl}/api/users/v1/users/authenticated`, { headers: { cookie } });
  assert.equal(authenticated.status, 200);

  const logoutResponse = await fetch(`${app.baseUrl}/api/auth/v2/logout`, {
    method: 'POST',
    headers: { cookie, 'content-type': 'application/json' },
    body: '{}',
  });
  assert.equal(logoutResponse.status, 200);
  assert.match(logoutResponse.headers.get('set-cookie'), /Max-Age=0/);

  const afterLogout = await fetch(`${app.baseUrl}/api/users/v1/users/authenticated`, { headers: { cookie } });
  assert.equal(afterLogout.status, 401);
});

test('later users are not implicitly administrators', async (t) => {
  const app = await startTestServer();
  t.after(() => app.close());

  const ownerResponse = await createAccount(app.baseUrl, 'InstanceOwner');
  assert.equal(ownerResponse.status, 201);
  const memberResponse = await createAccount(app.baseUrl, 'RegularMember');
  assert.equal(memberResponse.status, 201);
  const member = await memberResponse.json();
  assert.equal(member.id, 2);
  assert.equal(member.isStaff, false);
  assert.ok(!member.permissions.includes('*'));

  const cookie = memberResponse.headers.get('set-cookie').split(';', 1)[0];
  const adminResponse = await fetch(`${app.baseUrl}/api/admin-api/api/assets/pending-assets`, { headers: { cookie } });
  assert.equal(adminResponse.status, 403);
});
