import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const bundlesDir = path.join(rootDir, 'bundles');

fs.mkdirSync(bundlesDir, { recursive: true });

// 1. Build tree-shaken, lazy-loaded 3D bundle (src/vendor-3d/entry-3d.js -> bundles/vendor-3d.js)
await esbuild.build({
  entryPoints: [path.join(rootDir, 'src', 'vendor-3d', 'entry-3d.js')],
  bundle: true,
  outfile: path.join(bundlesDir, 'vendor-3d.js'),
  format: 'esm',
  platform: 'browser',
  target: ['edge102', 'chrome102'],
  minify: true,
  sourcemap: false,
  legalComments: 'none',
});

// 2. Build Classic Roblox UI bundle (src/entry-ui.js -> bundles/content-ui.js + bundles/content-ui.css)
const shim = (name) => path.join(rootDir, 'src', 'shims', name);

await esbuild.build({
  entryPoints: [path.join(rootDir, 'src', 'entry-ui.js')],
  bundle: true,
  outfile: path.join(bundlesDir, 'content-ui.js'),
  format: 'iife',
  platform: 'browser',
  target: ['edge102', 'chrome102'],
  jsx: 'automatic',
  minify: true,
  sourcemap: false,
  legalComments: 'none',
  define: {
    'process.env.NODE_ENV': '"production"',
    'process.env.NEXT_PUBLIC_API_URL': '""',
    global: 'window',
  },
  loader: {
    '.js': 'jsx',
    '.jsx': 'jsx',
    '.module.css': 'local-css',
    '.css': 'css',
  },
  external: ['/img/*', '/fonts/*'],
  alias: {
    'react/jsx-runtime': path.join(rootDir, 'src', 'jsx-runtime-wrap.js'),
    lodash: shim('lodash.js'),
    'next/router': shim('next-router.js'),
    'next/dist/client/router': shim('next-router.js'),
    'next/link': shim('next-link.js'),
    'next/head': shim('next-head.js'),
    'next/script': shim('next-script.js'),
    'next/config': shim('next-config.js'),
    'next/app': shim('next-app.js'),
    'next/image': shim('next-image.js'),
    jsonwebtoken: shim('jsonwebtoken.js'),
    '@microsoft/signalr': shim('signalr.js'),
  },
});

// 3. Rewrite /img/... and /fonts/... in bundles/content-ui.css to ../public/...
const cssPath = path.join(bundlesDir, 'content-ui.css');
if (fs.existsSync(cssPath)) {
  let css = fs.readFileSync(cssPath, 'utf8');
  css = css.replace(
    /url\(\s*(['"]?)\/(img|fonts)\/([^'")]+)\1\s*\)/g,
    (_m, quote, dir, rest) => `url(${quote || ''}../public/${dir}/${rest}${quote || ''})`
  );
  fs.writeFileSync(cssPath, css);
}

for (const f of ['vendor-3d.js', 'content-ui.js', 'content-ui.css']) {
  const p = path.join(bundlesDir, f);
  const sz = (fs.statSync(p).size / 1024).toFixed(1);
  console.log(`[build] bundles/${f}: ${sz} KB`);
}
