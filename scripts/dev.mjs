import { spawn } from 'node:child_process';
import { access, readFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import net from 'node:net';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const frontend = resolve(root, 'frontend');
const configPath = resolve(frontend, '.env.local');
const apiPort = Number.parseInt(process.env.API_PORT || '3001', 10);
const webPort = Number.parseInt(process.env.PORT || '3000', 10);
const preview = process.env.PREVIEW === '1';
const webHost = preview ? '0.0.0.0' : '127.0.0.1';
const existingConfig = await readFile(configPath, 'utf8').catch(() => '');
const storedConnectionMode = existingConfig.match(/^\s*REVIVAL_CONNECTION_MODE\s*=\s*([^\s#]+)/m)?.[1];
const selectedConnectionMode = String(process.env.REVIVAL_CONNECTION_MODE || storedConnectionMode || 'localhost').toLowerCase();
if (!['localhost', 'tunnel'].includes(selectedConnectionMode)) {
  console.error('REVIVAL_CONNECTION_MODE must be "localhost" or "tunnel".');
  process.exit(1);
}
if (selectedConnectionMode === 'tunnel') {
  console.warn('Tunnel mode is reserved but not enabled in this initial release; localhost is the only supported transport.');
}
const apiOrigin = `http://127.0.0.1:${apiPort}`;
const webOrigin = `http://127.0.0.1:${webPort}`;
const env = {
  ...process.env,
  BIND_HOST: '127.0.0.1',
  API_PORT: String(apiPort),
  REVIVAL_API_ORIGIN: apiOrigin,
  REVIVAL_WEB_ORIGIN: webOrigin,
  NEXT_PUBLIC_API_ORIGIN: apiOrigin,
  NEXT_PUBLIC_WEB_ORIGIN: webOrigin,
};

const nextBin = resolve(frontend, 'node_modules/next/dist/bin/next');
try {
  await access(nextBin);
} catch {
  console.error('Frontend dependencies are not installed. Run `npm install` in frontend/ first.');
  process.exit(1);
}

try {
  await access(configPath);
} catch {
  const setup = spawn(process.execPath, [resolve(frontend, 'util/create_config.js')], {
    cwd: frontend,
    env,
    stdio: 'inherit',
  });
  const result = await new Promise((resolvePromise) => setup.on('exit', (code) => resolvePromise(code ?? 1)));
  if (result !== 0) process.exit(result);
}

function waitForPort(port, timeoutMs = 8000) {
  const until = Date.now() + timeoutMs;
  return new Promise((resolvePromise, reject) => {
    const attempt = () => {
      const socket = net.connect({ host: '127.0.0.1', port });
      socket.once('connect', () => {
        socket.destroy();
        resolvePromise();
      });
      socket.once('error', async () => {
        socket.destroy();
        if (Date.now() >= until) return reject(new Error(`Local API did not start on port ${port}.`));
        await delay(120);
        attempt();
      });
    };
    attempt();
  });
}

const api = spawn(process.execPath, [resolve(root, 'backend/server.mjs')], {
  cwd: root,
  env,
  stdio: 'inherit',
});

let web;
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  api.kill('SIGTERM');
  web?.kill('SIGTERM');
  setTimeout(() => process.exit(code), 100).unref();
}

api.on('exit', (code) => {
  if (!stopping && code !== 0) stop(code ?? 1);
});

try {
  await waitForPort(apiPort);
  web = spawn(process.execPath, [nextBin, 'dev', '--webpack', '-H', webHost, '-p', String(webPort)], {
    cwd: frontend,
    env,
    stdio: 'inherit',
  });
  web.on('exit', (code) => stop(code ?? 0));
  console.log(`Frontend binding: ${webHost}:${webPort} (${preview ? 'preview' : 'localhost'})`);
  console.log(`API binding: 127.0.0.1:${apiPort} (loopback only)`);
} catch (error) {
  console.error(error.message);
  stop(1);
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => stop(0));
}
