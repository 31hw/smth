import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const bundlesDir = path.join(rootDir, 'extension', 'bundles');

fs.mkdirSync(bundlesDir, { recursive: true });

// 1. Build vendor-3d.js (Three.js r137 + MTLLoader + OBJLoader + OrbitControls + Tween + jQuery + Flot + ItemSaleChart)
const vendorFiles = [
  'extension/public/js/3d/three-r137/three.js',
  'extension/public/js/3d/three-r137/MTLLoaderr.js',
  'extension/public/js/3d/three-r137/OBJLoaderr.js',
  'extension/public/js/3d/three-r137/RobloxOrbitControls.js',
  'extension/public/js/3d/tween.js',
  'extension/public/js/jquery-3.6.0.min.js',
  'extension/public/js/flot-0.8.3/jquery.flot.js',
  'extension/public/js/flot-0.8.3/jquery.flot.time.js',
  'extension/public/js/itemSaleChart.js',
];

const vendorChunks = [
  '/* Classic Roblox UI - Vendor 3D & Chart Bundle */',
  '(function(){ if (typeof window === "undefined") return;',
];
for (const rel of vendorFiles) {
  const full = path.join(rootDir, rel);
  if (fs.existsSync(full)) {
    vendorChunks.push(`\n/* === ${rel} === */\n`);
    vendorChunks.push(fs.readFileSync(full, 'utf8'));
    vendorChunks.push('\n;');
  } else {
    console.warn('[build] Missing optional vendor file:', rel);
  }
}
vendorChunks.push(`
  if (typeof THREE !== "undefined") window.THREE = THREE;
  if (typeof TWEEN !== "undefined") window.TWEEN = TWEEN;
  if (typeof jQuery !== "undefined") { window.jQuery = jQuery; window.$ = jQuery; }
})();\n`);

fs.writeFileSync(path.join(bundlesDir, 'vendor-3d.js'), vendorChunks.join(''));
console.log('[build] Wrote extension/bundles/vendor-3d.js');

// 2. Bundle React Classic UI (src/entry-ui.js -> extension/bundles/content-ui.js + content-ui.css)
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
  external: ['/img/*', '/fonts/*', '/js/*', '/markdown/*'],
  alias: {
    'react/jsx-runtime': path.join(rootDir, 'src', 'jsx-runtime-wrap.js'),
    'next/router': shim('next-router.js'),
    'next/dist/client/router': shim('next-router.js'),
    'next/link': shim('next-link.js'),
    'next/head': shim('next-head.js'),
    'next/script': shim('next-script.js'),
    'next/config': shim('next-config.js'),
    'next/app': shim('next-app.js'),
    'next/image': shim('next-image.js'),
    'nextjs-progressbar': shim('nextjs-progressbar.js'),
    jsonwebtoken: shim('jsonwebtoken.js'),
    '@microsoft/signalr': shim('signalr.js'),
    'react-markdown': shim('markdown.js'),
    'remark-gfm': shim('markdown.js'),
    'rehype-raw': shim('markdown.js'),
    'gray-matter': shim('markdown.js'),
  },
});

// 3. Rewrite root-absolute /img/... and /fonts/... in emitted CSS to ../public/... so it resolves relative to bundles/content-ui.css in BOTH Edge MV3 (chrome-extension://<id>/public/...) and preview (/public/...)!
const cssPath = path.join(bundlesDir, 'content-ui.css');
if (fs.existsSync(cssPath)) {
  let css = fs.readFileSync(cssPath, 'utf8');
  css = css.replace(
    /url\(\s*(['"]?)\/(img|fonts|js|markdown)\/([^'")]+)\1\s*\)/g,
    (_m, quote, dir, rest) => `url(${quote || ''}../public/${dir}/${rest}${quote || ''})`
  );
  fs.writeFileSync(cssPath, css);
  console.log('[build] Rewrote asset URLs in extension/bundles/content-ui.css');
}

for (const f of ['vendor-3d.js', 'content-ui.js', 'content-ui.css']) {
  const p = path.join(bundlesDir, f);
  const sz = (fs.statSync(p).size / 1024).toFixed(1);
  console.log(`[build] ${f}: ${sz} KB`);
}
