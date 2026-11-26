// RateHub: one Durable Object that runs the live gold price on Cloudflare.
//  - holds the single AllTick WebSocket (the free plan allows one connection per token)
//  - applies the saved buy discount / sell premium and streams the result to every visitor (SSE)
//  - stores the pricing settings and change log, and runs the admin sign-in
// Mirrors serve.mjs (the local server), using Web Crypto instead of Node's crypto.
import { createStream } from '../lib/stream.mjs';
import { DEFAULT_RULES, validateRules, publicView } from '../lib/pricing.mjs';

const enc = new TextEncoder();
const SESSION_MS = 12 * 60 * 60 * 1000;
const IDLE_MS = 60 * 1000; // close the AllTick connection a minute after the last visitor leaves

const json = (status, data, headers = {}) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers } });
const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64urlText = (s) => b64url(enc.encode(s));
const fromB64url = (s) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)));
const same = (a, b) => {
  const x = enc.encode(String(a)), y = enc.encode(String(b));
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
};

export class RateHub {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.clients = new Set();
    this.feed = null;
    this.idleTimer = null;
    this.failed = new Map();
    this.rules = { ...DEFAULT_RULES };
    this.adminEmails = String(env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
    ctx.blockConcurrencyWhile(async () => {
      const saved = await ctx.storage.get('rules');
      if (saved) this.rules = { ...DEFAULT_RULES, ...saved };
    });
  }

  // ── Live stream ──
  startFeed() {
    if (this.feed || !this.env.ALLTICK_API_KEY) return;
    this.feed = createStream({
      token: this.env.ALLTICK_API_KEY,
      codes: { XAU: this.env.ALLTICK_GOLD_CODE || 'GOLD' },
      onUpdate: () => this.broadcast(),
    });
  }
  view() { return publicView(this.feed?.snapshot(), this.rules); }
  broadcast() {
    if (!this.feed) return;
    const chunk = enc.encode(`data: ${JSON.stringify(this.view())}\n\n`);
    for (const w of this.clients) w.write(chunk).catch(() => this.drop(w));
  }
  drop(w) {
    this.clients.delete(w);
    w.close().catch(() => {});
    if (!this.clients.size && !this.idleTimer) {
      this.idleTimer = setTimeout(() => { this.idleTimer = null; if (!this.clients.size) { this.feed?.stop(); this.feed = null; } }, IDLE_MS);
    }
  }
  stream(request) {
    if (!this.env.ALLTICK_API_KEY) return new Response('Live stream not configured', { status: 503 });
    this.startFeed();
    clearTimeout(this.idleTimer); this.idleTimer = null;
    const { readable, writable } = new TransformStream();
    const w = writable.getWriter();
    this.clients.add(w);
    w.write(enc.encode(`retry: 2000\ndata: ${JSON.stringify(this.view())}\n\n`)).catch(() => this.drop(w));
    const beat = setInterval(() => w.write(enc.encode(': keep-alive\n\n')).catch(() => { clearInterval(beat); this.drop(w); }), 15000);
    request.signal?.addEventListener('abort', () => { clearInterval(beat); this.drop(w); });
    return new Response(readable, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' } });
  }

  // ── Admin sign-in (email on the allowlist + password -> signed cookie) ──
  async key() {
    this._key ??= await crypto.subtle.importKey('raw', enc.encode(`${this.env.SESSION_SECRET || ''}|${this.env.ADMIN_PASSWORD}`), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    return this._key;
  }
  async sign(v) { return b64url(await crypto.subtle.sign('HMAC', await this.key(), enc.encode(v))); }
  async sessionEmail(request) {
    const c = (request.headers.get('Cookie') || '').match(/(?:^|;\s*)ab_admin=([^;]+)/)?.[1];
    if (!c || !this.env.ADMIN_PASSWORD) return null;
    const [email64, exp, sig] = c.split('.');
    if (!sig || !same(sig, await this.sign(`${email64}.${exp}`)) || Date.now() > Number(exp)) return null;
    try { const email = fromB64url(email64); return this.adminEmails.includes(email) ? email : null; } catch { return null; }
  }
  async body(request) {
    if (!String(request.headers.get('Content-Type')).includes('application/json')) throw new Error('JSON required');
    const text = await request.text();
    if (text.length > 10000) throw new Error('Too large');
    return JSON.parse(text || '{}');
  }
  async log(n = 20) { return ((await this.ctx.storage.get('log')) || []).slice(-n).reverse(); }

  async admin(request, path) {
    const method = request.method;
    if (path === '/api/admin/login' && method === 'POST') {
      const ip = request.headers.get('CF-Connecting-IP') || 'x';
      const f = this.failed.get(ip);
      if (f && f.until > Date.now()) return json(429, { error: 'Too many attempts. Try again in a minute.' });
      if (!this.env.ADMIN_PASSWORD || !this.adminEmails.length) return json(503, { error: 'Admin sign-in is not set up. Add ADMIN_EMAILS and ADMIN_PASSWORD in Cloudflare.' });
      const { email = '', password = '' } = await this.body(request);
      const e = String(email).trim().toLowerCase();
      if (!this.adminEmails.includes(e) || !same(password, this.env.ADMIN_PASSWORD)) {
        const n = (f?.n || 0) + 1;
        this.failed.set(ip, { n, until: n >= 5 ? Date.now() + 60000 : 0 });
        return json(401, { error: 'That email and password combination is not authorised.' });
      }
      this.failed.delete(ip);
      const email64 = b64urlText(e), exp = Date.now() + SESSION_MS;
      const cookie = `ab_admin=${email64}.${exp}.${await this.sign(`${email64}.${exp}`)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_MS / 1000}`;
      return json(200, { email: e }, { 'Set-Cookie': cookie });
    }
    if (path === '/api/admin/logout' && method === 'POST') {
      return json(200, { ok: true }, { 'Set-Cookie': 'ab_admin=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0' });
    }
    const email = await this.sessionEmail(request);
    if (!email) return json(401, { error: 'Signed out' });
    if (path === '/api/admin/pricing' && method === 'GET') return json(200, { email, rules: this.rules, log: await this.log() });
    if (path === '/api/admin/pricing' && method === 'POST') {
      const { rules: next, error } = validateRules(await this.body(request), this.rules);
      if (error) return json(400, { error });
      this.rules = { ...next, updatedAt: new Date().toISOString(), updatedBy: email };
      const log = ((await this.ctx.storage.get('log')) || []).concat({ at: this.rules.updatedAt, by: email, sell: this.rules.sell, buy: this.rules.buy, paused: this.rules.paused }).slice(-200);
      await this.ctx.storage.put({ rules: this.rules, log });
      this.broadcast();
      return json(200, { rules: this.rules, log: log.slice(-20).reverse() });
    }
    return json(404, { error: 'Not found' });
  }

  async fetch(request) {
    const path = new URL(request.url).pathname;
    try {
      if (path === '/api/stream') return this.stream(request);
      if (path.startsWith('/api/admin/')) return await this.admin(request, path);
      return json(404, { error: 'Not found' });
    } catch (e) {
      return json(400, { error: e instanceof SyntaxError ? 'Bad request' : e.message });
    }
  }
}
