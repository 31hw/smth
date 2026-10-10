import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdir, readdir, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { basename, extname, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { openDatabase } from './database.mjs';
import { ALL_PERMISSIONS, hasPermission, permissionsForUser } from './permissions.mjs';

const scrypt = promisify(scryptCallback);
const backendDirectory = resolve(fileURLToPath(new URL('.', import.meta.url)));
const frontendDirectory = resolve(backendDirectory, '../frontend');
const publicDirectory = resolve(frontendDirectory, 'public');
const frontendRequire = createRequire(resolve(frontendDirectory, 'package.json'));
const sharp = frontendRequire('sharp');
const SESSION_COOKIE = 'RewindSession';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SIGNUP_TOKEN_TTL_MS = 10 * 60 * 1000;
const MAX_BODY_BYTES = 64 * 1024;
const MAX_ICON_UPLOAD_BYTES = 8 * 1024 * 1024;
const MAX_ICON_PIXELS = 25_000_000;
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.ico']);
const REPLACEMENT_FORMATS = new Set(['png', 'jpeg', 'webp', 'gif', 'svg', 'ico']);
const DEFAULT_BODY_COLORS = Object.freeze({
  headColorId: 100,
  torsoColorId: 100,
  rightArmColorId: 100,
  leftArmColorId: 100,
  rightLegColorId: 100,
  leftLegColorId: 100,
});
const DEFAULT_BODY_SCALES = Object.freeze({ height: 1, width: 1, head: 1, depth: 1, proportion: 0, bodyType: 0 });
const BODY_COLOR_PALETTE = [
  [1, '#F2F3F3'], [2, '#A1A5A2'], [3, '#F9E999'], [5, '#D7C59A'], [6, '#C2DAB8'],
  [9, '#E8BAC8'], [11, '#80BBDB'], [12, '#CB8442'], [18, '#CC8E69'], [21, '#C4281C'],
  [22, '#C470A0'], [23, '#0D69AC'], [24, '#F5CD30'], [25, '#624732'], [26, '#1B2A35'],
  [27, '#6D6E6C'], [28, '#287F47'], [29, '#A1C48C'], [36, '#F3CF9B'], [37, '#4B974B'],
  [38, '#A05F35'], [39, '#C1CADE'], [40, '#ECECEC'], [41, '#CD544B'], [42, '#C1DFF0'],
  [43, '#7BB6E8'], [44, '#F7F18D'], [45, '#B4D2E4'], [47, '#D9856C'], [48, '#84B68D'],
  [49, '#F8F184'], [50, '#ECE8DE'], [100, '#EEC4B6'], [101, '#DA867A'], [102, '#6E99CA'],
  [103, '#C7C1B7'], [104, '#6B327C'], [105, '#E29B40'], [106, '#DA8541'], [107, '#008F9C'],
  [108, '#685C43'], [110, '#435493'], [111, '#BFB7B1'], [112, '#6874AC'], [113, '#E5ADC8'],
  [115, '#C7D23C'], [116, '#55A5AF'], [118, '#B7D7D5'], [119, '#A4BD47'], [120, '#D9E4A7'],
  [121, '#E7AC58'], [123, '#D36F4C'], [124, '#923978'], [125, '#EAB892'], [126, '#A5A5CB'],
  [127, '#DCBC81'], [128, '#AE7A59'], [131, '#9CA3A8'], [133, '#D5733D'], [134, '#D8DD56'],
  [135, '#74869D'], [1001, '#F8F8F8'],
].map(([brickColorId, hexColor]) => ({ brickColorId, hexColor }));
const AVATAR_RULES = {
  scales: {
    height: { min: 0.9, max: 1.05, increment: 0.01 },
    width: { min: 0.7, max: 1, increment: 0.01 },
    head: { min: 0.95, max: 1, increment: 0.01 },
    depth: { min: 0.85, max: 1, increment: 0.01 },
    proportion: { min: 0, max: 1, increment: 0.01 },
    bodyType: { min: 0, max: 1, increment: 0.01 },
  },
  basicBodyColorsPalette: [100, 101, 125, 18, 1001].map(id => BODY_COLOR_PALETTE.find(color => color.brickColorId === id)).filter(Boolean),
  bodyColorsPalette: BODY_COLOR_PALETTE,
};

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function publicUser(row) {
  if (!row) return null;
  const id = Number(row.id);
  const owner = id === 1;
  return {
    id,
    name: row.username,
    displayName: row.display_name,
    description: '',
    status: row.status,
    created: row.created_at,
    isBanned: false,
    isStaff: owner,
    role: owner ? 'owner' : row.role,
    permissions: permissionsForUser({ id, permissions: [] }),
  };
}

function parseCookies(header = '') {
  const output = new Map();
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 1) continue;
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (!name) continue;
    try {
      output.set(name, decodeURIComponent(value));
    } catch {
      output.set(name, value);
    }
  }
  return output;
}

function setSessionCookie(req, res, token, maxAge = SESSION_TTL_MS / 1000) {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const secure = forwardedProto === 'https' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`);
}

function sendJson(res, statusCode, value, extraHeaders = {}) {
  const payload = Buffer.from(JSON.stringify(value));
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    ...extraHeaders,
    'content-length': String(payload.length),
  });
  res.end(payload);
}

function sendError(res, statusCode, message, code = statusCode) {
  sendJson(res, statusCode, {
    success: false,
    errors: [{ code, message }],
  });
}

async function readJson(req) {
  let bytes = 0;
  const chunks = [];
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > MAX_BODY_BYTES) {
      const error = new Error('Request body is too large.');
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  if (bytes === 0) return {};
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('JSON body must be an object.');
    return value;
  } catch {
    const error = new Error('Request body must be a valid JSON object.');
    error.statusCode = 400;
    throw error;
  }
}

function isValidUsername(username) {
  return typeof username === 'string' && /^[A-Za-z0-9_]{3,20}$/.test(username);
}

function passwordIsValid(password) {
  return typeof password === 'string' && password.length >= 8 && password.length <= 128;
}

function parseJsonColumn(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function avatarSettingsFromRow(row) {
  return {
    bodyColors: parseJsonColumn(row.body_colors_json, DEFAULT_BODY_COLORS),
    scales: parseJsonColumn(row.scales_json, DEFAULT_BODY_SCALES),
    playerAvatarType: row.player_avatar_type === 'R6' ? 'R6' : 'R15',
    assets: parseJsonColumn(row.wearing_assets_json, []),
  };
}

function validateAvatarColors(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const allowedKeys = Object.keys(DEFAULT_BODY_COLORS);
  const colors = { ...DEFAULT_BODY_COLORS };
  for (const key of allowedKeys) {
    if (value[key] === undefined) continue;
    const id = Number(value[key]);
    if (!Number.isInteger(id) || !BODY_COLOR_PALETTE.some(color => color.brickColorId === id)) return null;
    colors[key] = id;
  }
  return colors;
}

function validateAvatarScales(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const scales = { ...DEFAULT_BODY_SCALES };
  for (const [key, rule] of Object.entries(AVATAR_RULES.scales)) {
    if (value[key] === undefined) continue;
    const number = Number(value[key]);
    if (!Number.isFinite(number) || number < rule.min || number > rule.max) return null;
    scales[key] = number;
  }
  return scales;
}

function getIconFilePath(rawPath) {
  if (typeof rawPath !== 'string' || !rawPath.startsWith('/') || rawPath.includes('\\0')) return null;
  const relativePath = rawPath.slice(1).replaceAll('/', sep);
  if (!relativePath.startsWith(`img${sep}`) && !['favicon.ico', 'favicon.goober.ico', 'oldfav.ico'].includes(relativePath)) return null;
  const filePath = resolve(publicDirectory, relativePath);
  if (!filePath.startsWith(`${publicDirectory}${sep}`) || !IMAGE_EXTENSIONS.has(extname(filePath).toLowerCase())) return null;
  return filePath;
}

function mimeTypeForIcon(filePath) {
  const ext = extname(filePath).toLowerCase();
  return ({
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
    '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  })[ext] || 'application/octet-stream';
}

async function scanIconDirectory(directory = publicDirectory) {
  const items = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const filePath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      items.push(...await scanIconDirectory(filePath));
      continue;
    }
    const extension = extname(entry.name).toLowerCase();
    if (!entry.isFile() || !IMAGE_EXTENSIONS.has(extension)) continue;
    const metadata = await stat(filePath);
    const assetPath = `/${relative(publicDirectory, filePath).split(sep).join('/')}`;
    if (!assetPath.startsWith('/img/') && !['/favicon.ico', '/favicon.goober.ico', '/oldfav.ico'].includes(assetPath)) continue;
    items.push({
      path: assetPath,
      name: basename(filePath),
      extension: extension.slice(1),
      contentType: mimeTypeForIcon(filePath),
      size: metadata.size,
      updatedAt: metadata.mtime.toISOString(),
      replaceable: REPLACEMENT_FORMATS.has(extension.slice(1).replace('jpg', 'jpeg')) || extension === '.jpg',
    });
  }
  return items;
}

async function readRawBody(req, limit = MAX_ICON_UPLOAD_BYTES) {
  let bytes = 0;
  const chunks = [];
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > limit) {
      const error = new Error('Uploaded image is too large.');
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function wrapPngAsIco(png, width, height) {
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  header[6] = width >= 256 ? 0 : width;
  header[7] = height >= 256 ? 0 : height;
  header[8] = 0;
  header[9] = 0;
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(header.length, 18);
  return Buffer.concat([header, png]);
}

async function convertIconUpload(input, targetPath) {
  const source = sharp(input, { limitInputPixels: MAX_ICON_PIXELS, animated: true });
  const metadata = await source.metadata();
  if (!['png', 'jpeg', 'webp', 'gif', 'svg', 'avif', 'tiff'].includes(metadata.format)) {
    throw new Error('Upload must be a PNG, JPEG, WebP, GIF, or SVG image.');
  }
  const extension = extname(targetPath).toLowerCase();
  const format = extension === '.jpg' || extension === '.jpeg' ? 'jpeg' : extension.slice(1);
  const resized = sharp(input, { limitInputPixels: MAX_ICON_PIXELS, animated: format === 'gif' })
    .resize({ width: 4096, height: 4096, fit: 'inside', withoutEnlargement: true });
  if (format === 'svg') {
    const { data, info } = await resized.png().toBuffer({ resolveWithObject: true });
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${info.width}" height="${info.height}" viewBox="0 0 ${info.width} ${info.height}"><image width="${info.width}" height="${info.height}" href="data:image/png;base64,${data.toString('base64')}"/></svg>`;
    return { buffer: Buffer.from(svg), sourceFormat: metadata.format, outputFormat: 'svg' };
  }
  if (format === 'ico') {
    const { data, info } = await sharp(input, { limitInputPixels: MAX_ICON_PIXELS })
      .resize({ width: 256, height: 256, fit: 'inside', withoutEnlargement: true })
      .png().toBuffer({ resolveWithObject: true });
    return { buffer: wrapPngAsIco(data, info.width, info.height), sourceFormat: metadata.format, outputFormat: 'ico' };
  }
  if (format === 'png') return { buffer: await resized.png().toBuffer(), sourceFormat: metadata.format, outputFormat: 'png' };
  if (format === 'jpeg') return { buffer: await resized.jpeg({ quality: 90, mozjpeg: true }).toBuffer(), sourceFormat: metadata.format, outputFormat: 'jpeg' };
  if (format === 'webp') return { buffer: await resized.webp({ quality: 90 }).toBuffer(), sourceFormat: metadata.format, outputFormat: 'webp' };
  if (format === 'gif') return { buffer: await resized.gif().toBuffer(), sourceFormat: metadata.format, outputFormat: 'gif' };
  throw new Error('This icon file type cannot be replaced.');
}

export function createBackendServer({ db = openDatabase(), now = () => Date.now() } = {}) {
  const signupTokens = new Map();

  function getUserById(id) {
    return db.prepare('SELECT id, username, display_name, status, role, created_at FROM users WHERE id = ?').get(Number(id));
  }

  function getUserByUsername(username) {
    return db.prepare('SELECT id, username, display_name, status, role, created_at, password_salt, password_hash FROM users WHERE username = ? COLLATE NOCASE').get(username);
  }

  function getAuthenticatedUser(req) {
    const token = parseCookies(req.headers.cookie).get(SESSION_COOKIE);
    if (!token) return null;
    const tokenHash = sha256(token);
    const session = db.prepare('SELECT user_id, expires_at FROM sessions WHERE token_hash = ?').get(tokenHash);
    if (!session) return null;
    if (Number(session.expires_at) <= now()) {
      db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
      return null;
    }
    return getUserById(session.user_id) || null;
  }

  function createSession(req, res, userId) {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = now() + SESSION_TTL_MS;
    db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(sha256(token), userId, expiresAt);
    setSessionCookie(req, res, token);
  }

  function issueSignupToken() {
    const cutoff = now();
    for (const [token, expiresAt] of signupTokens) {
      if (expiresAt <= cutoff) signupTokens.delete(token);
    }
    const token = randomBytes(24).toString('base64url');
    signupTokens.set(token, cutoff + SIGNUP_TOKEN_TTL_MS);
    return token;
  }

  function consumeSignupToken(token) {
    if (typeof token !== 'string') return false;
    const expiresAt = signupTokens.get(token);
    signupTokens.delete(token);
    return Number.isFinite(expiresAt) && expiresAt > now();
  }

  async function handleSignup(req, res) {
    const body = await readJson(req);
    const username = typeof body.username === 'string' ? body.username.trim() : '';
    const password = body.password;

    if (typeof body.website === 'string' && body.website.trim()) {
      return sendError(res, 400, 'Signup could not be completed.', 'invalid_signup');
    }
    if (!consumeSignupToken(body.signupToken)) {
      return sendError(res, 400, 'Signup check expired. Refresh the page and try again.', 'invalid_signup_token');
    }
    if (!isValidUsername(username)) {
      return sendError(res, 400, 'Username must be 3–20 characters and use letters, numbers, or underscores.', 'invalid_username');
    }
    if (!passwordIsValid(password)) {
      return sendError(res, 400, 'Password must be between 8 and 128 characters.', 'invalid_password');
    }
    if (getUserByUsername(username)) {
      return sendError(res, 409, 'That username is already taken.', 'username_taken');
    }

    const salt = randomBytes(16).toString('hex');
    const passwordHash = (await scrypt(password, salt, 64)).toString('hex');
    const result = db.prepare(`
      INSERT INTO users (username, display_name, password_salt, password_hash, role)
      VALUES (?, ?, ?, ?, 'member')
    `).run(username, username, salt, passwordHash);
    const userId = Number(result.lastInsertRowid);
    getAvatarRow(userId);
    const row = getUserById(userId);
    createSession(req, res, userId);
    return sendJson(res, 201, { ...publicUser(row), success: true });
  }

  async function handleLogin(req, res) {
    const body = await readJson(req);
    const suppliedName = body.cvalue ?? body.username;
    const username = typeof suppliedName === 'string' ? suppliedName.split('|', 1)[0].trim() : '';
    const password = body.password;
    if (!username || typeof password !== 'string' || password.length > 128) {
      return sendError(res, 400, 'Enter your username and password.', 'invalid_credentials');
    }

    const stored = getUserByUsername(username);
    if (!stored) return sendError(res, 401, 'Invalid username or password.', 'invalid_credentials');
    const expected = Buffer.from(stored.password_hash, 'hex');
    const actual = Buffer.from(await scrypt(password, stored.password_salt, expected.length));
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      return sendError(res, 401, 'Invalid username or password.', 'invalid_credentials');
    }

    createSession(req, res, Number(stored.id));
    return sendJson(res, 200, { ...publicUser(stored), success: true });
  }

  function getAvatarRow(userId) {
    db.prepare('INSERT OR IGNORE INTO avatar_settings (user_id) VALUES (?)').run(userId);
    return db.prepare('SELECT * FROM avatar_settings WHERE user_id = ?').get(userId);
  }

  function readAvatarSettings(userId) {
    return avatarSettingsFromRow(getAvatarRow(userId));
  }

  function avatarPayload(userId) {
    const avatar = readAvatarSettings(userId);
    return {
      assets: avatar.assets,
      bodyColors: avatar.bodyColors,
      playerAvatarType: avatar.playerAvatarType,
      scales: avatar.scales,
      userId: Number(userId),
    };
  }

  function saveAvatarSettings(userId, patch) {
    const current = readAvatarSettings(userId);
    const next = { ...current, ...patch };
    db.prepare(`
      UPDATE avatar_settings
      SET body_colors_json = ?, scales_json = ?, player_avatar_type = ?, wearing_assets_json = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE user_id = ?
    `).run(JSON.stringify(next.bodyColors), JSON.stringify(next.scales), next.playerAvatarType, JSON.stringify(next.assets), userId);
    return next;
  }

  function authorizedAdmin(req, res) {
    const user = getAuthenticatedUser(req);
    if (!user) {
      sendError(res, 401, 'Authentication is required.', 'not_authenticated');
      return null;
    }
    if (!hasPermission(user, 'site:admin')) {
      sendError(res, 403, 'Administrator permission is required.', 'forbidden');
      return null;
    }
    return user;
  }

  const adminResponses = new Map([
    ['/api/admin-api/api/groups/pending-icons', []],
    ['/api/admin-api/api/assets/pending-assets', []],
    ['/api/admin-api/api/icons/pending-assets', []],
    ['/api/admin-api/api/applications/pending-num', { count: 0 }],
    ['/api/admin-api/api/reports/pending-count', { count: 0 }],
  ]);

  const server = createServer(async (req, res) => {
    try {
      const requestUrl = new URL(req.url || '/', 'http://127.0.0.1');
    const { pathname } = requestUrl;

    if (pathname === '/api/health' && (req.method === 'GET' || req.method === 'HEAD')) {
      const response = {
        name: 'Rewind local API',
        status: 'ok',
        mode: 'localhost',
        gameRuntime: 'not-configured',
        avatarRenderer: 'not-integrated',
        seededUsers: 0,
      };
      if (req.method === 'HEAD') {
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
        return res.end();
      }
      return sendJson(res, 200, response);
    }

    if (pathname === '/api/auth/v2/signup-metadata' && req.method === 'GET') {
      return sendJson(res, 200, {
        isDiscordVerified: true,
        discordUsername: null,
        discordDisplay: 'Local account',
        hasExistingAccount: false,
        existingUsername: null,
        signupToken: issueSignupToken(),
        signupMode: 'localhost',
      });
    }

    if (pathname === '/api/auth/v2/signup' && req.method === 'POST') {
      try {
        return await handleSignup(req, res);
      } catch (error) {
        if (error.statusCode) return sendError(res, error.statusCode, error.message, 'invalid_request');
        if (String(error.message).includes('UNIQUE constraint failed')) return sendError(res, 409, 'That username is already taken.', 'username_taken');
        console.error('[api] signup failed:', error);
        return sendError(res, 500, 'Account could not be created.', 'internal_error');
      }
    }

    if (pathname === '/api/auth/v2/login' && req.method === 'POST') {
      try {
        return await handleLogin(req, res);
      } catch (error) {
        if (error.statusCode) return sendError(res, error.statusCode, error.message, 'invalid_request');
        console.error('[api] login failed:', error);
        return sendError(res, 500, 'Login could not be completed.', 'internal_error');
      }
    }

    if (pathname === '/api/auth/v2/logout' && req.method === 'POST') {
      const token = parseCookies(req.headers.cookie).get(SESSION_COOKIE);
      if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token));
      setSessionCookie(req, res, '', 0);
      return sendJson(res, 200, { success: true });
    }

    if (pathname === '/api/users/v1/users/authenticated' && req.method === 'GET') {
      const user = getAuthenticatedUser(req);
      if (!user) return sendError(res, 401, 'Authentication is required.', 'not_authenticated');
      return sendJson(res, 200, publicUser(user));
    }

    if (pathname === '/api/permissions/me' && req.method === 'GET') {
      const user = getAuthenticatedUser(req);
      if (!user) return sendError(res, 401, 'Authentication is required.', 'not_authenticated');
      return sendJson(res, 200, {
        userId: Number(user.id),
        permissions: permissionsForUser(user),
        isOwner: Number(user.id) === 1,
      });
    }

    if (pathname === '/api/admin/permissions/check' && req.method === 'GET') {
      const user = getAuthenticatedUser(req);
      if (!user) return sendError(res, 401, 'Authentication is required.', 'not_authenticated');
      const permission = requestUrl.searchParams.get('permission') || '';
      return sendJson(res, 200, {
        userId: Number(user.id),
        permission,
        allowed: hasPermission(user, permission),
      });
    }

    if (pathname === '/api/avatar/v1/avatar-rules' && req.method === 'GET') {
      return sendJson(res, 200, AVATAR_RULES);
    }

    if (pathname === '/api/avatar/v1/avatar' && req.method === 'GET') {
      const user = getAuthenticatedUser(req);
      if (!user) return sendError(res, 401, 'Authentication is required.', 'not_authenticated');
      return sendJson(res, 200, avatarPayload(Number(user.id)));
    }

    const publicAvatarRoute = pathname.match(/^\/api\/avatar\/v1\/users\/(\d+)\/avatar$/);
    if (publicAvatarRoute && req.method === 'GET') {
      const userId = Number(publicAvatarRoute[1]);
      if (!getUserById(userId)) return sendError(res, 404, 'User not found.', 'user_not_found');
      return sendJson(res, 200, avatarPayload(userId));
    }

    if (pathname === '/api/avatar/v1/avatar/set-body-colors' && req.method === 'POST') {
      const user = getAuthenticatedUser(req);
      if (!user) return sendError(res, 401, 'Authentication is required.', 'not_authenticated');
      const body = await readJson(req);
      const bodyColors = validateAvatarColors(body);
      if (!bodyColors) return sendError(res, 400, 'Body color values are invalid.', 'invalid_body_colors');
      saveAvatarSettings(Number(user.id), { bodyColors });
      return sendJson(res, 200, { success: true, bodyColors });
    }

    if (pathname === '/api/avatar/v1/avatar/set-scales' && req.method === 'POST') {
      const user = getAuthenticatedUser(req);
      if (!user) return sendError(res, 401, 'Authentication is required.', 'not_authenticated');
      const body = await readJson(req);
      const scales = validateAvatarScales(body);
      if (!scales) return sendError(res, 400, 'Avatar scale values are invalid.', 'invalid_scales');
      saveAvatarSettings(Number(user.id), { scales });
      return sendJson(res, 200, { success: true, scales });
    }

    if (pathname === '/api/avatar/v1/avatar/set-player-avatar-type' && req.method === 'POST') {
      const user = getAuthenticatedUser(req);
      if (!user) return sendError(res, 401, 'Authentication is required.', 'not_authenticated');
      const body = await readJson(req);
      const playerAvatarType = Number(body.playerAvatarType) === 1 ? 'R6' : Number(body.playerAvatarType) === 2 ? 'R15' : null;
      if (!playerAvatarType) return sendError(res, 400, 'Choose a supported avatar rig.', 'invalid_rig_type');
      saveAvatarSettings(Number(user.id), { playerAvatarType });
      return sendJson(res, 200, { success: true, playerAvatarType });
    }

    if (pathname === '/api/avatar/v1/avatar/set-wearing-assets' && req.method === 'POST') {
      const user = getAuthenticatedUser(req);
      if (!user) return sendError(res, 401, 'Authentication is required.', 'not_authenticated');
      const body = await readJson(req);
      if (!Array.isArray(body.assetIds) || body.assetIds.length > 50) {
        return sendError(res, 400, 'Provide up to 50 asset IDs.', 'invalid_assets');
      }
      const assetIds = [...new Set(body.assetIds.map(Number))];
      if (assetIds.some(id => !Number.isSafeInteger(id) || id <= 0)) {
        return sendError(res, 400, 'Asset IDs must be positive integers.', 'invalid_assets');
      }
      const userId = Number(user.id);
      const current = readAvatarSettings(userId);
      const existing = new Map(current.assets.map(asset => [Number(asset.id), asset]));
      if (body.assets !== undefined && !Array.isArray(body.assets)) {
        return sendError(res, 400, 'Asset details must be a list.', 'invalid_assets');
      }
      const suppliedAssets = new Map();
      for (const supplied of body.assets || []) {
        const id = Number(supplied?.id ?? supplied?.assetId);
        const typeId = Number(supplied?.assetType?.id ?? supplied?.assetTypeId ?? supplied?.assetType ?? 0);
        if (!assetIds.includes(id) || !Number.isSafeInteger(typeId) || typeId < 0 || typeId > 1000) {
          return sendError(res, 400, 'Asset details are invalid.', 'invalid_assets');
        }
        const name = typeof supplied.name === 'string' ? supplied.name.trim().slice(0, 120) : '';
        const typeName = typeof supplied.assetType?.name === 'string' ? supplied.assetType.name.trim().slice(0, 80) : '';
        const asset = {
          id,
          name: name || `Asset ${id}`,
          assetType: { id: typeId },
        };
        if (typeName) asset.assetType.name = typeName;
        if (supplied.meta && typeof supplied.meta === 'object' && !Array.isArray(supplied.meta)) {
          asset.meta = supplied.meta;
        }
        suppliedAssets.set(id, asset);
      }
      const assets = assetIds.map(id => suppliedAssets.get(id) || existing.get(id) || {
        id,
        name: `Asset ${id}`,
        assetType: { id: 0 },
      });
      saveAvatarSettings(userId, { assets });
      return sendJson(res, 200, { success: true, assets });
    }

    if (pathname === '/api/avatar/v1/avatar/redraw-thumbnail' && req.method === 'POST') {
      const user = getAuthenticatedUser(req);
      if (!user) return sendError(res, 401, 'Authentication is required.', 'not_authenticated');
      return sendJson(res, 200, { success: true, state: 'Completed' });
    }

    const recentItemsRoute = pathname.match(/^\/api\/avatar\/v1\/recent-items\/([a-z0-9_-]+)\/list$/i);
    if (recentItemsRoute && req.method === 'GET') {
      const user = getAuthenticatedUser(req);
      if (!user) return sendError(res, 401, 'Authentication is required.', 'not_authenticated');
      return sendJson(res, 200, { data: [], total: 0, filteredCount: 0 });
    }

    const outfitsRoute = pathname.match(/^\/api\/avatar\/v1\/users\/(\d+)\/outfits$/);
    if (outfitsRoute && req.method === 'GET') {
      const requester = getAuthenticatedUser(req);
      if (!requester) return sendError(res, 401, 'Authentication is required.', 'not_authenticated');
      const userId = Number(outfitsRoute[1]);
      if (Number(requester.id) !== userId && !hasPermission(requester, 'users:read')) {
        return sendError(res, 403, 'You do not have permission to view these outfits.', 'forbidden');
      }
      const rows = db.prepare('SELECT id, name, created_at FROM avatar_outfits WHERE user_id = ? ORDER BY id DESC').all(userId);
      const data = rows.map(row => ({ id: Number(row.id), name: row.name, created: row.created_at }));
      return sendJson(res, 200, { data, total: data.length, filteredCount: data.length });
    }

    if (pathname === '/api/avatar/v1/outfits/create' && req.method === 'POST') {
      const user = getAuthenticatedUser(req);
      if (!user) return sendError(res, 401, 'Authentication is required.', 'not_authenticated');
      const body = await readJson(req);
      const name = typeof body.name === 'string' ? body.name.trim().slice(0, 50) : '';
      if (!name) return sendError(res, 400, 'Outfit name is required.', 'invalid_outfit_name');
      const userId = Number(user.id);
      try {
        const result = db.prepare('INSERT INTO avatar_outfits (user_id, name, avatar_json) VALUES (?, ?, ?)').run(userId, name, JSON.stringify(readAvatarSettings(userId)));
        const row = db.prepare('SELECT id, name, created_at FROM avatar_outfits WHERE id = ?').get(Number(result.lastInsertRowid));
        return sendJson(res, 201, { id: Number(row.id), name: row.name, created: row.created_at });
      } catch (error) {
        if (String(error.message).includes('UNIQUE constraint failed')) return sendError(res, 409, 'An outfit with that name already exists.', 'outfit_name_taken');
        throw error;
      }
    }

    const outfitActionRoute = pathname.match(/^\/api\/avatar\/v1\/outfits\/(\d+)(?:\/(wear|delete|rename))?$/);
    if (outfitActionRoute && ['POST', 'PATCH'].includes(req.method)) {
      const user = getAuthenticatedUser(req);
      if (!user) return sendError(res, 401, 'Authentication is required.', 'not_authenticated');
      const outfitId = Number(outfitActionRoute[1]);
      const action = outfitActionRoute[2] || 'update';
      const userId = Number(user.id);
      const outfit = db.prepare('SELECT * FROM avatar_outfits WHERE id = ? AND user_id = ?').get(outfitId, userId);
      if (!outfit) return sendError(res, 404, 'Outfit not found.', 'outfit_not_found');
      if (action === 'delete' && req.method === 'POST') {
        db.prepare('DELETE FROM avatar_outfits WHERE id = ? AND user_id = ?').run(outfitId, userId);
        return sendJson(res, 200, { success: true });
      }
      if (action === 'wear' && req.method === 'POST') {
        const saved = parseJsonColumn(outfit.avatar_json, null);
        if (!saved) return sendError(res, 500, 'Outfit data is unavailable.', 'invalid_outfit');
        saveAvatarSettings(userId, saved);
        return sendJson(res, 200, { success: true });
      }
      if (action === 'rename' && req.method === 'POST') {
        const body = await readJson(req);
        const name = typeof body.name === 'string' ? body.name.trim().slice(0, 50) : '';
        if (!name) return sendError(res, 400, 'Outfit name is required.', 'invalid_outfit_name');
        try {
          db.prepare("UPDATE avatar_outfits SET name = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ? AND user_id = ?").run(name, outfitId, userId);
          return sendJson(res, 200, { success: true, id: outfitId, name });
        } catch (error) {
          if (String(error.message).includes('UNIQUE constraint failed')) return sendError(res, 409, 'An outfit with that name already exists.', 'outfit_name_taken');
          throw error;
        }
      }
      if (action === 'update' && req.method === 'PATCH') {
        db.prepare("UPDATE avatar_outfits SET avatar_json = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ? AND user_id = ?").run(JSON.stringify(readAvatarSettings(userId)), outfitId, userId);
        return sendJson(res, 200, { success: true });
      }
    }

    if (pathname === '/api/thumbnails/v1/users/outfits' && req.method === 'GET') {
      const user = getAuthenticatedUser(req);
      if (!user) return sendError(res, 401, 'Authentication is required.', 'not_authenticated');
      const ids = (requestUrl.searchParams.get('userOutfitIds') || '').split(',').map(Number).filter(Number.isSafeInteger);
      return sendJson(res, 200, { data: ids.map(targetId => ({ targetId, state: 'Completed', imageUrl: '/img/placeholder/icon_one.png' })) });
    }

    if (pathname === '/api/thumbnails/v1/assets' && req.method === 'GET') {
      const user = getAuthenticatedUser(req);
      if (!user) return sendError(res, 401, 'Authentication is required.', 'not_authenticated');
      const ids = (requestUrl.searchParams.get('assetIds') || '').split(',').map(Number).filter(Number.isSafeInteger);
      return sendJson(res, 200, { data: ids.map(targetId => ({ targetId, state: 'Completed', imageUrl: '/img/placeholder/icon_one.png' })) });
    }

    if (pathname === '/api/users/inventory/list-json' && req.method === 'GET') {
      const user = getAuthenticatedUser(req);
      if (!user) return sendError(res, 401, 'Authentication is required.', 'not_authenticated');
      return sendJson(res, 200, { Data: { Items: [], ItemsPerPage: 25, nextPageCursor: null, previousPageCursor: null }, data: [], total: 0 });
    }

    if (pathname === '/api/api/v1/items/restrictions' && req.method === 'GET') {
      const user = getAuthenticatedUser(req);
      if (!user) return sendError(res, 401, 'Authentication is required.', 'not_authenticated');
      return sendJson(res, 200, []);
    }

    if (pathname === '/api/admin/web/icons' && req.method === 'GET') {
      const administrator = authorizedAdmin(req, res);
      if (!administrator) return;
      try {
        return sendJson(res, 200, { icons: await scanIconDirectory() });
      } catch (error) {
        console.error('[api] failed to scan web icons:', error);
        return sendError(res, 500, 'Icons could not be loaded.', 'icon_list_failed');
      }
    }

    if (pathname === '/api/admin/web/icons' && req.method === 'PUT') {
      const administrator = authorizedAdmin(req, res);
      if (!administrator) return;
      const iconPath = requestUrl.searchParams.get('path');
      const targetPath = getIconFilePath(iconPath);
      if (!targetPath) return sendError(res, 400, 'Choose an existing public image path.', 'invalid_icon_path');
      try {
        const existing = await stat(targetPath);
        if (!existing.isFile()) return sendError(res, 404, 'Icon not found.', 'icon_not_found');
      } catch {
        return sendError(res, 404, 'Icon not found.', 'icon_not_found');
      }
      const input = await readRawBody(req);
      if (!input.length) return sendError(res, 400, 'Choose an image to upload.', 'empty_icon_upload');
      let converted;
      try {
        converted = await convertIconUpload(input, targetPath);
      } catch (error) {
        return sendError(res, 400, error.message || 'Upload must be a supported image.', 'invalid_icon_upload');
      }
      const temporaryPath = `${targetPath}.${randomBytes(8).toString('hex')}.tmp`;
      try {
        await writeFile(temporaryPath, converted.buffer, { flag: 'wx', mode: 0o644 });
        await rename(temporaryPath, targetPath);
      } catch (error) {
        await unlink(temporaryPath).catch(() => {});
        console.error('[api] failed to replace web icon:', error);
        return sendError(res, 500, 'Icon could not be replaced.', 'icon_replace_failed');
      }
      const metadata = await stat(targetPath);
      return sendJson(res, 200, {
        success: true,
        icon: {
          path: iconPath,
          name: basename(targetPath),
          extension: extname(targetPath).slice(1).toLowerCase(),
          contentType: mimeTypeForIcon(targetPath),
          size: metadata.size,
          updatedAt: metadata.mtime.toISOString(),
        },
        inputFormat: converted.sourceFormat,
        outputFormat: converted.outputFormat,
        message: `Converted ${converted.sourceFormat.toUpperCase()} to ${converted.outputFormat.toUpperCase()} and kept the existing filename and extension.`,
      });
    }

    const userRoute = pathname.match(/^\/api\/users\/v1\/users\/(\d+)(?:\/(status|permissions))?$/);
    if (userRoute) {
      const targetId = Number(userRoute[1]);
      const suffix = userRoute[2] || '';
      const target = getUserById(targetId);
      if (!target) return sendError(res, 404, 'User not found.', 'user_not_found');

      if (!suffix && req.method === 'GET') return sendJson(res, 200, publicUser(target));
      if (suffix === 'status' && req.method === 'GET') return sendJson(res, 200, { status: target.status });
      if (suffix === 'permissions' && req.method === 'GET') {
        const requester = getAuthenticatedUser(req);
        if (!requester) return sendError(res, 401, 'Authentication is required.', 'not_authenticated');
        if (Number(requester.id) !== targetId && !hasPermission(requester, 'users:read')) {
          return sendError(res, 403, 'You do not have permission to view these permissions.', 'forbidden');
        }
        return sendJson(res, 200, { userId: targetId, permissions: permissionsForUser(target) });
      }
      if (suffix === 'status' && req.method === 'PATCH') {
        const requester = getAuthenticatedUser(req);
        if (!requester) return sendError(res, 401, 'Authentication is required.', 'not_authenticated');
        if (Number(requester.id) !== targetId && !hasPermission(requester, 'users:manage')) {
          return sendError(res, 403, 'You do not have permission to update this status.', 'forbidden');
        }
        const body = await readJson(req);
        const status = typeof body.status === 'string' ? body.status.slice(0, 255) : '';
        db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, targetId);
        return sendJson(res, 200, { status });
      }
    }

    if (adminResponses.has(pathname)) {
      const user = getAuthenticatedUser(req);
      if (!user) return sendError(res, 401, 'Authentication is required.', 'not_authenticated');
      if (!hasPermission(user, 'site:admin')) return sendError(res, 403, 'Administrator permission is required.', 'forbidden');
      return sendJson(res, 200, adminResponses.get(pathname));
    }

    if (pathname.startsWith('/api/')) return sendError(res, 404, 'API route not found.', 'not_found');
    return sendJson(res, 404, 'Not found');
    } catch (error) {
      if (res.headersSent) {
        res.destroy(error);
        return;
      }
      if (error.statusCode) return sendError(res, error.statusCode, error.message, 'invalid_request');
      console.error('[api] request failed:', error);
      return sendError(res, 500, 'Request could not be completed.', 'internal_error');
    }
  });

  return { server, db };
}

function start() {
  const host = process.env.BIND_HOST || '127.0.0.1';
  if (!['127.0.0.1', '::1', 'localhost'].includes(host)) {
    throw new Error('The revival API is localhost-only. BIND_HOST must be 127.0.0.1, ::1, or localhost.');
  }
  const port = Number.parseInt(process.env.API_PORT || '3001', 10);
  const { server } = createBackendServer();
  server.listen(port, host, () => {
    console.log(`Local revival API listening at http://${host}:${port}`);
    console.log('Database starts empty: no users or demo rows were seeded. The first registered account receives user ID 1 and owner permissions.');
  });
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => server.close(() => process.exit(0)));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) start();
