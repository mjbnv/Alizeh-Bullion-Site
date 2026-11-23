// Minimal static file server for the project root. Usage: node serve.mjs [port]
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.argv[2]) || 3000;

// Load .env into process.env (keys stay on the server; .env itself is never served)
try {
  for (const line of readFileSync(path.join(root, '.env'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
} catch { /* no .env: rates run in demo mode */ }
const { getRates } = await import('./api/rates.mjs');
const { getWatchPrices } = await import('./api/watch-prices.mjs');

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
    if (p === '/api/rates') {
      const body = JSON.stringify(await getRates());
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(body); return;
    }
    if (p === '/api/watch-prices') {
      const body = JSON.stringify(await getWatchPrices());
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(body); return;
    }
    if (p.startsWith('/api/')) { res.writeHead(404).end('Not found'); return; }
    // Never serve dotfiles (.env, .claude, ...) or node_modules
    if (p.split('/').some(s => s.startsWith('.') || s === 'node_modules')) { res.writeHead(404).end('Not found'); return; }
    let file = path.normalize(path.join(root, p));
    if (!file.startsWith(root)) { res.writeHead(403).end('Forbidden'); return; }
    if ((await stat(file).catch(() => null))?.isDirectory()) file = path.join(file, 'index.html');
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404).end('Not found');
  }
}).listen(port, () => console.log(`Serving ${root} at http://localhost:${port}`));
