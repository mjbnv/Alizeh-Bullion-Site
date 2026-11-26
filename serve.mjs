// Local server for the project root. Usage: node serve.mjs [port]
// Serves the site, the live gold stream (/api/stream) and the admin pricing API (/api/admin/*).
import http from 'node:http';
import { readFile, stat, writeFile, appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.argv[2]) || 3000;

// Load .env into process.env (keys stay on the server; .env itself is never served)
try {
  for (const line of readFileSync(path.join(root, '.env'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
} catch { /* no .env: rates run in demo mode */ }
const { getRates } = await import('./lib/rates.mjs');
const { getWatchPrices } = await import('./lib/watch-prices.mjs');
const { DEFAULT_RULES, validateRules, publicView } = await import('./lib/pricing.mjs');

// ── Pricing rules (saved in data/, which is never served or committed) ──
const DATA = path.join(root, 'data');
const RULES_FILE = path.join(DATA, 'pricing.json');
const LOG_FILE = path.join(DATA, 'pricing-log.jsonl');
await mkdir(DATA, { recursive: true });
let rules = { ...DEFAULT_RULES };
try { rules = { ...DEFAULT_RULES, ...JSON.parse(await readFile(RULES_FILE, 'utf8')) }; } catch { /* first run: defaults */ }

// ── Live stream: one AllTick WebSocket, pushed to every open page as Server-Sent Events ──
const streamClients = new Set();
let feed = null;
const broadcast = () => {
  if (!feed) return;
  const msg = `data: ${JSON.stringify(publicView(feed.snapshot(), rules))}\n\n`;
  for (const res of streamClients) res.write(msg);
};
if (process.env.ALLTICK_API_KEY) {
  const { createStream } = await import('./lib/stream.mjs');
  // AllTick's code for gold is GOLD (XAUUSD is refused)
  feed = createStream({ token: process.env.ALLTICK_API_KEY, codes: { XAU: process.env.ALLTICK_GOLD_CODE || 'GOLD' }, onUpdate: broadcast });
} else {
  console.log('ALLTICK_API_KEY not set: live stream off, /api/rates polling only');
}
setInterval(() => { for (const res of streamClients) res.write(': keep-alive\n\n'); }, 15000);

// ── Admin sign-in: email on the allowlist + password, then a signed cookie for 12 hours ──
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const SECRET = randomBytes(32); // sessions end when the server restarts
const SESSION_MS = 12 * 60 * 60 * 1000;
const sign = (v) => createHmac('sha256', SECRET).update(v).digest('base64url');
const same = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && timingSafeEqual(x, y); };
function sessionEmail(req) {
  const c = (req.headers.cookie || '').match(/(?:^|;\s*)ab_admin=([^;]+)/)?.[1];
  if (!c) return null;
  const [email64, exp, sig] = c.split('.');
  if (!sig || !same(sig, sign(`${email64}.${exp}`)) || Date.now() > Number(exp)) return null;
  const email = Buffer.from(email64, 'base64url').toString();
  return ADMIN_EMAILS.includes(email) ? email : null;
}
const failed = new Map(); // ip -> { n, until }: slow down password guessing
async function readJson(req) {
  if (!String(req.headers['content-type']).includes('application/json')) throw new Error('JSON required');
  let body = '';
  for await (const chunk of req) { body += chunk; if (body.length > 10000) throw new Error('Too large'); }
  return JSON.parse(body || '{}');
}
const json = (res, status, data, headers = {}) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers }); res.end(JSON.stringify(data)); };
async function readLog(n = 20) {
  try { return (await readFile(LOG_FILE, 'utf8')).trim().split('\n').slice(-n).reverse().map((l) => JSON.parse(l)); } catch { return []; }
}

async function admin(req, res, p) {
  if (p === '/api/admin/login' && req.method === 'POST') {
    const ip = req.socket.remoteAddress;
    const f = failed.get(ip);
    if (f && f.until > Date.now()) return json(res, 429, { error: 'Too many attempts. Try again in a minute.' });
    if (!ADMIN_PASSWORD || !ADMIN_EMAILS.length) return json(res, 503, { error: 'Admin sign-in is not set up. Add ADMIN_EMAILS and ADMIN_PASSWORD to .env.' });
    const { email = '', password = '' } = await readJson(req);
    const e = String(email).trim().toLowerCase();
    if (!ADMIN_EMAILS.includes(e) || !same(password, ADMIN_PASSWORD)) {
      const n = (f?.n || 0) + 1;
      failed.set(ip, { n, until: n >= 5 ? Date.now() + 60000 : 0 });
      return json(res, 401, { error: 'That email and password combination is not authorised.' });
    }
    failed.delete(ip);
    const email64 = Buffer.from(e).toString('base64url'), exp = Date.now() + SESSION_MS;
    return json(res, 200, { email: e }, { 'Set-Cookie': `ab_admin=${email64}.${exp}.${sign(`${email64}.${exp}`)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_MS / 1000}` });
  }
  if (p === '/api/admin/logout' && req.method === 'POST') {
    return json(res, 200, { ok: true }, { 'Set-Cookie': 'ab_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' });
  }
  const email = sessionEmail(req);
  if (!email) return json(res, 401, { error: 'Signed out' });
  if (p === '/api/admin/pricing' && req.method === 'GET') return json(res, 200, { email, rules, log: await readLog() });
  if (p === '/api/admin/pricing' && req.method === 'POST') {
    const { rules: next, error } = validateRules(await readJson(req), rules);
    if (error) return json(res, 400, { error });
    rules = { ...next, updatedAt: new Date().toISOString(), updatedBy: email };
    await writeFile(RULES_FILE, JSON.stringify(rules, null, 2));
    await appendFile(LOG_FILE, JSON.stringify({ at: rules.updatedAt, by: email, sell: rules.sell, buy: rules.buy, paused: rules.paused }) + '\n');
    broadcast(); // every open page shows the new prices straight away
    return json(res, 200, { rules, log: await readLog() });
  }
  return json(res, 404, { error: 'Not found' });
}

const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.ttf': 'font/ttf', '.otf': 'font/otf', '.mp4': 'video/mp4', '.webm': 'video/webm',
};

http.createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.startsWith('/api/admin/')) return await admin(req, res, p);
    if (p === '/api/stream') {
      if (!feed) { res.writeHead(503, { 'Content-Type': 'text/plain' }).end('Live stream not configured'); return; }
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
      res.write(`retry: 2000\ndata: ${JSON.stringify(publicView(feed.snapshot(), rules))}\n\n`);
      streamClients.add(res);
      req.on('close', () => streamClients.delete(res));
      return;
    }
    if (p === '/api/rates') return json(res, 200, await getRates());
    if (p === '/api/watch-prices') return json(res, 200, await getWatchPrices());
    if (p.startsWith('/api/')) { res.writeHead(404).end('Not found'); return; }
    // Never serve dotfiles (.env, .claude, ...), saved pricing data or node_modules
    if (p.split('/').some(s => s.startsWith('.') || s === 'node_modules' || s === 'data')) { res.writeHead(404).end('Not found'); return; }
    let file = path.normalize(path.join(root, p));
    if (!file.startsWith(root)) { res.writeHead(403).end('Forbidden'); return; }
    if ((await stat(file).catch(() => null))?.isDirectory()) file = path.join(file, 'index.html');
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  } catch (e) {
    if (!res.headersSent) { res.writeHead(e instanceof SyntaxError ? 400 : 404).end(e instanceof SyntaxError ? 'Bad request' : 'Not found'); }
  }
}).listen(port, () => console.log(`Serving ${root} at http://localhost:${port}`));
