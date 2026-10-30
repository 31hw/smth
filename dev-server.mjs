#!/usr/bin/env node
/**
 * Tiny zero-dependency static server for local development.
 *
 *   npm run dev            -> http://localhost:4173
 *   PORT=8080 npm run dev  -> http://localhost:8080
 *
 * The project is plain static files, so this exists only so you can open it
 * with a real origin (ES modules and fetch dislike file://).
 */
import { createServer } from 'node:http';
import { createReadStream, promises as fs } from 'node:fs';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || '0.0.0.0';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.woff2': 'font/woff2',
};

const server = createServer(async (req, res) => {
  const started = Date.now();
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname);
  } catch {
    res.writeHead(400).end('Bad request');
    return;
  }

  if (pathname === '/') pathname = '/index.html';

  // resolve inside the project root only
  const safe = normalize(pathname).replace(/^([/\\])+/, '');
  const filePath = join(root, safe);
  if (!filePath.startsWith(root.endsWith(sep) ? root : root + sep) && filePath !== root) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  try {
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) {
      res.writeHead(302, { Location: pathname.replace(/\/?$/, '/') + 'index.html' }).end();
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    createReadStream(filePath).pipe(res);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('404 — not found');
  } finally {
    if (process.env.LOG !== '0') {
      console.log(`${res.statusCode} ${req.method} ${pathname} (${Date.now() - started}ms)`);
    }
  }
});

server.listen(port, host, () => {
  console.log(`Rollimons running at http://localhost:${port}`);
  console.log(`Demo mode:      http://localhost:${port}/?demo=1`);
});
