// 本機預覽 server：不用 WorkPlus、不用重新載入 extension，直接跑 src/ 的介面。
//   node dev/server.mjs            → http://127.0.0.1:5180/
//   PORT=5181 node dev/server.mjs  （PowerShell：$env:PORT=5181; node dev/server.mjs）
//
// - GET /src/*、/dev/*：靜態檔
// - GET /__wp/*：WorkPlus 原頁的 CSS 快照（dev/fixtures/workplus-static/，有就載入，讓 body 周邊環境和線上一致）
// - GET 其他路徑（/、/key/DG/issues…）：dev/index.html
// - POST /api：依 query + variables 查 dev/fixtures/*.json、dev/fixtures-sample/*.json；mutation 一律回假成功
// - POST /__fixtures?name=DG：record.js 把錄好的資料送進來，寫到 dev/fixtures/DG.json
// - GET /__reload：SSE，src/ 或 fixture 有變動就通知頁面重新整理
// 只聽 127.0.0.1。
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fixtureKey, isMutation, fakeMutationResponse, normalizeQuery } from './fixture-key.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT) || 5180;
const HOST = '127.0.0.1';
const DIR = {
  src: path.join(ROOT, 'src'),
  dev: path.join(ROOT, 'dev'),
  fixtures: path.join(ROOT, 'dev', 'fixtures'),
  sample: path.join(ROOT, 'dev', 'fixtures-sample'),
  wpStatic: process.env.WP_STATIC ? path.resolve(process.env.WP_STATIC) : path.join(ROOT, 'dev', 'fixtures', 'workplus-static'),
};
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.gif': 'image/gif', '.ico': 'image/x-icon', '.webp': 'image/webp',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.eot': 'application/vnd.ms-fontobject',
};

// ---- fixtures ----
let table = new Map();
let projectKeys = [];

function loadFixtures() {
  const next = new Map();
  const keys = [];
  // sample 先載、真實資料後載：同一個查詢以真實資料為準
  for (const dir of [DIR.sample, DIR.fixtures]) {
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
        for (const e of data.entries ?? []) next.set(fixtureKey(e.query, e.variables), e.response);
        for (const k of data.keys ?? []) if (!keys.includes(k)) keys.push(k);
      } catch (err) {
        console.warn(`[dev] 讀不了 ${path.relative(ROOT, path.join(dir, file))}：${err.message}`);
      }
    }
  }
  table = next;
  // 真實資料的專案排前面，首頁預設開它
  projectKeys = keys.sort((a, b) => (a === 'DEMO') - (b === 'DEMO'));
  console.log(`[dev] fixtures：${table.size} 筆查詢，專案 ${projectKeys.join(', ') || '（無）'}`);
}

// ---- live reload ----
const clients = new Set();
let reloadTimer = null;
let fixturesDirty = false;
function scheduleReload(reason) {
  if (reason === 'fixtures') fixturesDirty = true;
  clearTimeout(reloadTimer);
  reloadTimer = setTimeout(() => {
    if (fixturesDirty) loadFixtures();
    fixturesDirty = false;
    for (const res of clients) res.write(`data: ${reason}\n\n`);
  }, 120);
}
function watch(dir, reason, ignore = () => false) {
  if (!fs.existsSync(dir)) return;
  try {
    fs.watch(dir, { recursive: true }, (_e, file) => {
      if (file && ignore(String(file))) return;
      scheduleReload(reason);
    });
  } catch (err) {
    console.warn(`[dev] 無法監看 ${dir}：${err.message}（改完請手動重新整理）`);
  }
}

// ---- helpers ----
function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Cache-Control': 'no-store', ...headers });
  res.end(body);
}
function sendJson(res, status, obj, headers = {}) {
  send(res, status, JSON.stringify(obj), { 'Content-Type': MIME['.json'], ...headers });
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c)).on('end', () => resolve(Buffer.concat(chunks).toString('utf8'))).on('error', reject);
  });
}
// 防 ../ 跳出 base
function safeJoin(base, rel) {
  const p = path.resolve(base, '.' + path.sep + rel);
  return p === base || p.startsWith(base + path.sep) ? p : null;
}
function serveFile(res, file) {
  if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) return send(res, 404, 'Not found');
  send(res, 200, fs.readFileSync(file), { 'Content-Type': MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream' });
}
function wpCssLinks() {
  if (!fs.existsSync(DIR.wpStatic)) return '';
  return fs.readdirSync(DIR.wpStatic)
    .filter((f) => f.endsWith('.css'))
    .sort()
    .map((f) => `<link rel="stylesheet" href="/__wp/${encodeURIComponent(f)}">`)
    .join('\n    ');
}
// record.js 從 https://workplus.synology.inc 送資料進來，要 CORS 與 Private Network Access 標頭
const CORS = {
  'Access-Control-Allow-Origin': 'https://workplus.synology.inc',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Private-Network': 'true',
};

// ---- routes ----
async function handle(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const p = decodeURIComponent(url.pathname);

  if (p === '/api' && req.method === 'POST') {
    const { query, variables } = JSON.parse(await readBody(req));
    if (isMutation(query)) {
      console.log(`[dev] 假寫入 ${JSON.stringify(variables)}`);
      return sendJson(res, 200, fakeMutationResponse());
    }
    const hit = table.get(fixtureKey(query, variables));
    if (hit) return sendJson(res, 200, hit);
    const brief = normalizeQuery(query).slice(0, 80);
    console.warn(`[dev] 沒有 fixture：${brief}… ${JSON.stringify(variables)}`);
    return sendJson(res, 200, { errors: [{ message: `[dev] 沒有對應的 fixture（${brief}…），請用 dev/record.js 重錄` }] });
  }

  if (p === '/__fixtures') {
    if (req.method === 'OPTIONS') return send(res, 204, '', CORS);
    if (req.method !== 'POST') return send(res, 405, '', CORS);
    const name = url.searchParams.get('name') ?? '';
    if (!/^[A-Za-z0-9_+-]{1,64}$/.test(name)) return sendJson(res, 400, { error: 'name 只能是英數字、_、+、-' }, CORS);
    const body = await readBody(req);
    JSON.parse(body); // 確認是 JSON 再寫
    fs.mkdirSync(DIR.fixtures, { recursive: true });
    fs.writeFileSync(path.join(DIR.fixtures, `${name}.json`), body);
    console.log(`[dev] 收到 fixture → dev/fixtures/${name}.json（${(body.length / 1024).toFixed(0)} KB）`);
    scheduleReload('fixtures');
    return sendJson(res, 200, { ok: true, file: `dev/fixtures/${name}.json` }, CORS);
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, '');

  if (p === '/__reload') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
    res.write(': connected\n\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }
  if (p.startsWith('/src/')) return serveFile(res, safeJoin(DIR.src, p.slice(5)));
  if (p.startsWith('/dev/')) return serveFile(res, safeJoin(DIR.dev, p.slice(5)));
  if (p.startsWith('/__wp/')) return serveFile(res, safeJoin(DIR.wpStatic, p.slice(6)));
  // 原頁 CSS 用根目錄的相對路徑引用字型與圖片（assets/…、key/…）
  if (/^\/(assets|key\/[^/]+\/.+\.\w+$)/.test(p) && fs.existsSync(DIR.wpStatic)) {
    const f = safeJoin(DIR.wpStatic, p.slice(1));
    if (f && fs.existsSync(f)) return serveFile(res, f);
  }
  if (p === '/favicon.ico') return send(res, 204, '');
  if (p === '/') {
    const key = projectKeys[0] ?? 'DEMO';
    return send(res, 302, '', { Location: `/key/${encodeURIComponent(key)}/issues?layout=board` });
  }

  const html = fs.readFileSync(path.join(DIR.dev, 'index.html'), 'utf8').replace('<!--WP_CSS-->', wpCssLinks());
  return send(res, 200, html, { 'Content-Type': MIME['.html'] });
}

loadFixtures();
watch(DIR.src, 'src');
// dev/fixtures 另外監看；server.mjs 改了要自己重開，不必通知頁面
watch(DIR.dev, 'dev', (f) => /^fixtures[\\/]/.test(f) || f.endsWith('.mjs'));
watch(DIR.fixtures, 'fixtures', (f) => !f.endsWith('.json') || /^workplus-static[\\/]/.test(f));
watch(DIR.sample, 'fixtures', (f) => !f.endsWith('.json'));

http
  .createServer((req, res) => {
    handle(req, res).catch((err) => {
      console.error('[dev]', err);
      if (!res.headersSent) sendJson(res, 500, { errors: [{ message: `[dev] ${err.message}` }] });
    });
  })
  .listen(PORT, HOST, () => {
    console.log(`[dev] http://${HOST}:${PORT}/`);
    if (!fs.existsSync(DIR.wpStatic)) console.log('[dev] 沒有 WorkPlus CSS 快照（dev/fixtures/workplus-static/），外圍樣式用瀏覽器預設');
  });
