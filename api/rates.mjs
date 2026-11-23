// Server-side live rates for Alizeh Bullion.
// Keys are read from process.env (loaded from .env by serve.mjs) and never sent to the browser.
// The browser calls GET /api/rates and receives one normalised shape:
//   { updated, source, demo, stale, usdPerOz:{XAU,...}, quotes:{XAU:{bid,ask,low,high}}, fx:{USD,AED,PKR}, refreshSeconds, defaultCurrency }
// To deploy on Vercel/Netlify, wrap getRates() in a serverless handler.

const METALS = ['XAU', 'XAG', 'XPT', 'XPD'];
const AED_PEG = 3.6725; // UAE dirham is pegged to the US dollar
const SUPPORTED = ['USD', 'AED', 'PKR'];

const env = (k) => (process.env[k] || '').trim();

// Providers sometimes return "ounces per 1 USD" instead of "USD per ounce".
// A precious metal is always worth more than 1 USD/oz, so invert small values.
const perOz = (v) => (v > 0 && v < 1 ? 1 / v : v);
// AED and PKR are both worth less than 1 USD, so a rate below 1 is the inverse.
const perUsd = (v) => (v > 0 && v < 1 ? 1 / v : v);

async function getJson(url, headers = {}) {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
  if (!res.ok) {
    let msg = '';
    try { const j = await res.json(); msg = j.message || j.error || ''; } catch { /* not JSON */ }
    throw httpError(res.status, `${new URL(url).host} responded ${res.status}${msg ? ` (${msg})` : ''}`);
  }
  return res.json();
}
const httpError = (status, message) => Object.assign(new Error(message), { status });

// Twelve Data's free plan bills 1 credit per symbol per call (8/min, 800/day).
// Gold and silver are fetched every refresh; platinum, palladium and USD/PKR move
// slowly enough to be fetched once an hour, which keeps a 5-minute refresh under 800/day.
const SLOW_MS = 60 * 60 * 1000;
const slow = { twelvedata: { at: 0, data: null }, massive: { at: 0, data: null } };
const slowDue = (p) => !slow[p].data || Date.now() - slow[p].at > SLOW_MS;

const TD_SYMBOLS = { XAU: 'XAU/USD', XAG: 'XAG/USD', XPT: 'XPT/USD', XPD: 'XPD/USD', PKR: 'USD/PKR' };
const MASSIVE_TICKERS = { XAU: 'C:XAUUSD', XAG: 'C:XAGUSD', XPT: 'C:XPTUSD', XPD: 'C:XPDUSD', PKR: 'C:USDPKR' };

// Symbols the Twelve Data plan refused ("not available with your plan"). They are not
// requested again until the server restarts, so no credits are spent on them.
const tdUnavailable = new Set();

const providers = {
  // Twelve Data — https://twelvedata.com  (env: TWELVE_DATA_API_KEY)
  async twelvedata() {
    const key = env('TWELVE_DATA_API_KEY');
    if (!key) return null;
    const slowRound = slowDue('twelvedata');
    const wanted = ['XAU', 'XAG', ...(slowRound ? ['XPT', 'XPD', 'PKR'] : [])]
      .filter((w) => !tdUnavailable.has(w));
    if (!wanted.includes('XAU')) throw httpError(403, 'twelvedata: gold is not available with this plan');
    const j = await getJson(`https://api.twelvedata.com/price?symbol=${wanted.map((w) => TD_SYMBOLS[w]).join(',')}&apikey=${encodeURIComponent(key)}`);
    // Twelve Data reports errors (including "out of credits") inside a 200 response.
    if (j.status === 'error' && wanted.length > 1) throw httpError(j.code, `twelvedata: ${j.message}`);
    const got = {};
    for (const w of wanted) {
      const row = wanted.length === 1 ? j : j[TD_SYMBOLS[w]];
      if (row?.status === 'error') {
        if (row.code === 429) throw httpError(429, `twelvedata: ${row.message}`);
        if (row.code === 403 || /not available with your plan/i.test(row.message || '')) {
          tdUnavailable.add(w);
          console.warn(`[rates] twelvedata plan does not include ${TD_SYMBOLS[w]}; will not request it again`);
        }
      }
      const v = Number(row?.price);
      if (valid(v)) got[w] = v;
    }
    if (!valid(got.XAU) && j.status === 'error') throw httpError(j.code, `twelvedata: ${j.message}`);
    if (slowRound) slow.twelvedata = { at: Date.now(), data: { XPT: got.XPT, XPD: got.XPD, PKR: got.PKR } };
    const s = slow.twelvedata.data || {};
    return {
      usdPerOz: { XAU: perOz(got.XAU), XAG: perOz(got.XAG), XPT: perOz(got.XPT ?? s.XPT), XPD: perOz(got.XPD ?? s.XPD) },
      fx: { PKR: perUsd(got.PKR ?? s.PKR) },
    };
  },

  // Massive (formerly Polygon.io) — https://massive.com  (env: MASSIVE_API_KEY)
  // Tries the real-time forex snapshot first (needs a paid Currencies plan). If the key
  // isn't entitled to it, falls back to the previous day's close and marks prices delayed.
  async massive() {
    const key = env('MASSIVE_API_KEY');
    if (!key) return null;
    const tickers = Object.values(MASSIVE_TICKERS).join(',');
    try {
      const j = await getJson(`https://api.massive.com/v2/snapshot/locale/global/markets/forex/tickers?tickers=${tickers}&apiKey=${encodeURIComponent(key)}`);
      const byTicker = Object.fromEntries((j.tickers || []).map((t) => [t.ticker, t]));
      const usdPerOz = {}, range = {}, fx = {};
      for (const [sym, tk] of Object.entries(MASSIVE_TICKERS)) {
        const t = byTicker[tk];
        if (!t) continue;
        const q = t.lastQuote || {};
        const v = valid(q.a) && valid(q.b) ? (q.a + q.b) / 2 : Number(t.min?.c || t.day?.c || t.prevDay?.c);
        if (sym === 'PKR') fx.PKR = perUsd(v);
        else {
          usdPerOz[sym] = perOz(v);
          if (valid(t.day?.l) && valid(t.day?.h)) range[sym] = { low: t.day.l, high: t.day.h };
        }
      }
      return { usdPerOz, range, fx };
    } catch (e) {
      if (e.status !== 403) throw e; // 403 = plan doesn't include real-time forex
    }
    // Free plan: previous close, one call per ticker (5 calls/min limit), so slow metals hourly.
    const wanted = ['XAU', 'XAG', ...(slowDue('massive') ? ['XPT', 'XPD', 'PKR'] : [])];
    const out = await Promise.all(wanted.map((w) =>
      getJson(`https://api.massive.com/v2/aggs/ticker/${MASSIVE_TICKERS[w]}/prev?apiKey=${encodeURIComponent(key)}`)
        .then((j) => j.results?.[0] || null).catch((err) => { if (err.status === 429) throw err; return null; })));
    const got = {}, range = {};
    wanted.forEach((w, i) => {
      const r = out[i];
      if (!r) return;
      got[w] = Number(r.c);
      if (w !== 'PKR' && valid(r.l) && valid(r.h)) range[w] = { low: r.l, high: r.h };
    });
    if (wanted.includes('XPT')) slow.massive = { at: Date.now(), data: { XPT: got.XPT, XPD: got.XPD, PKR: got.PKR } };
    const s = slow.massive.data || {};
    return {
      delayed: true,
      usdPerOz: { XAU: perOz(got.XAU), XAG: perOz(got.XAG), XPT: perOz(got.XPT ?? s.XPT), XPD: perOz(got.XPD ?? s.XPD) },
      range,
      fx: { PKR: perUsd(got.PKR ?? s.PKR) },
    };
  },

  async goldapi() {
    const key = env('GOLDAPI_KEY');
    if (!key) return null;
    const out = await Promise.all(METALS.map((m) =>
      getJson(`https://www.goldapi.io/api/${m}/USD`, { 'x-access-token': key })));
    const usdPerOz = {}, range = {};
    METALS.forEach((m, i) => {
      usdPerOz[m] = perOz(Number(out[i].price));
      const lo = Number(out[i].low_price), hi = Number(out[i].high_price);
      if (lo > 0 && hi > 0) range[m] = { low: lo, high: hi };
    });
    return { usdPerOz, range, fx: {} };
  },

  async metalpriceapi() {
    const key = env('METALPRICE_API_KEY');
    if (!key) return null;
    const j = await getJson(`https://api.metalpriceapi.com/v1/latest?api_key=${encodeURIComponent(key)}&base=USD&currencies=${METALS.join(',')},AED,PKR`);
    if (j.success === false) throw new Error(j.error?.info || 'metalpriceapi error');
    const r = j.rates || {};
    const usdPerOz = {};
    for (const m of METALS) usdPerOz[m] = perOz(Number(r[`USD${m}`] || r[m]));
    return { usdPerOz, fx: { AED: perUsd(Number(r.AED)), PKR: perUsd(Number(r.PKR)) } };
  },

  async metalsdev() {
    const key = env('METALS_DEV_API_KEY');
    if (!key) return null;
    const j = await getJson(`https://api.metals.dev/v1/latest?api_key=${encodeURIComponent(key)}&currency=USD&unit=toz`);
    if (j.status && j.status !== 'success') throw new Error(j.error_message || 'metals.dev error');
    const m = j.metals || {}, c = j.currencies || {};
    return {
      usdPerOz: { XAU: perOz(+m.gold), XAG: perOz(+m.silver), XPT: perOz(+m.platinum), XPD: perOz(+m.palladium) },
      fx: { AED: perUsd(Number(c.AED)), PKR: perUsd(Number(c.PKR)) },
    };
  },

  async metalsapi() {
    const key = env('METALS_API_KEY');
    if (!key) return null;
    const j = await getJson(`https://metals-api.com/api/latest?access_key=${encodeURIComponent(key)}&base=USD&symbols=${METALS.join(',')},AED,PKR`);
    if (j.success === false) throw new Error(j.error?.info || 'metals-api error');
    const r = j.rates || {};
    const usdPerOz = {};
    for (const m of METALS) usdPerOz[m] = perOz(Number(r[`USD${m}`] || r[m]));
    return { usdPerOz, fx: { AED: perUsd(Number(r.AED)), PKR: perUsd(Number(r.PKR)) } };
  },
};

async function exchangeRates() {
  const key = env('EXCHANGERATE_API_KEY');
  if (!key) return {};
  const j = await getJson(`https://v6.exchangerate-api.com/v6/${encodeURIComponent(key)}/latest/USD`);
  const c = j.conversion_rates || {};
  return { AED: Number(c.AED), PKR: Number(c.PKR) };
}

// Demo numbers so the site works before any key is added. Clearly flagged demo:true.
function demo() {
  const wobble = (v) => +(v * (1 + (Math.random() - 0.5) * 0.003)).toFixed(2);
  return {
    source: 'demo',
    demo: true,
    usdPerOz: { XAU: wobble(4050), XAG: wobble(50.4), XPT: wobble(1580), XPD: wobble(1410) },
    range: { XAU: { low: 4018.4, high: 4071.9 }, XAG: { low: 49.82, high: 50.95 }, XPT: { low: 1561, high: 1594 }, XPD: { low: 1392, high: 1428 } },
    fx: { USD: 1, AED: AED_PEG, PKR: 281.5 },
  };
}

const valid = (n) => Number.isFinite(n) && n > 0;

// Bid (we buy) and Ask (we sell) derived from spot using margins set in .env
function withQuotes(r) {
  const buy = (Number(env('BUY_MARGIN_PCT')) || 0.5) / 100;
  const sell = (Number(env('SELL_MARGIN_PCT')) || 0.5) / 100;
  const quotes = {};
  for (const m of METALS) {
    const spot = r.usdPerOz[m];
    quotes[m] = { bid: spot * (1 - buy), ask: spot * (1 + sell), low: r.range?.[m]?.low ?? null, high: r.range?.[m]?.high ?? null };
  }
  return { ...r, quotes, margins: { buyPct: buy * 100, sellPct: sell * 100 } };
}
let cache = null, cachedAt = 0, lastGood = null;

// When a provider runs out of credits or rejects the key, stop calling it for a while
// instead of wasting a request on every refresh. The next provider in line is used meanwhile.
const cooldownUntil = {};
function coolDown(name, e) {
  const msg = String(e.message).toLowerCase();
  const now = new Date();
  if (e.status === 429 || /credit|limit|quota/.test(msg)) {
    if (/day|daily/.test(msg)) {
      // Daily allowance used up: wait until it resets at midnight UTC.
      cooldownUntil[name] = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
    } else {
      cooldownUntil[name] = Date.now() + 65 * 1000; // per-minute limit: try again shortly
    }
  } else if (e.status === 401 || e.status === 403) {
    cooldownUntil[name] = Date.now() + 30 * 60 * 1000; // bad or unentitled key
  }
  if (cooldownUntil[name] > Date.now()) {
    console.warn(`[rates] ${name} paused until ${new Date(cooldownUntil[name]).toISOString()}: ${e.message}`);
  }
}

// When the main provider can't supply a metal (e.g. Twelve Data's free plan only covers gold),
// fill it with Massive's previous close. That changes once a day, so each metal is cached an hour.
const backfill = {};
async function massiveBackfill(metals) {
  const key = env('MASSIVE_API_KEY');
  if (!key || !metals.length || cooldownUntil.massive > Date.now()) return {};
  const need = metals.filter((m) => !(backfill[m] && Date.now() - backfill[m].at < SLOW_MS));
  await Promise.all(need.map((m) =>
    getJson(`https://api.massive.com/v2/aggs/ticker/${MASSIVE_TICKERS[m]}/prev?apiKey=${encodeURIComponent(key)}`)
      .then((j) => { const c = Number(j.results?.[0]?.c); if (valid(c)) backfill[m] = { v: perOz(c), at: Date.now() }; })
      .catch((e) => { if (e.status === 429 || e.status === 401) coolDown('massive', e); })));
  return Object.fromEntries(metals.filter((m) => backfill[m]).map((m) => [m, backfill[m].v]));
}

export async function getRates() {
  const refreshSeconds = Math.max(15, Number(env('REFRESH_INTERVAL_SECONDS')) || 60);
  const dc = env('DEFAULT_CURRENCY').toUpperCase();
  const meta = { refreshSeconds, defaultCurrency: SUPPORTED.includes(dc) ? dc : 'USD' };

  if (cache && Date.now() - cachedAt < refreshSeconds * 1000) return { ...cache, ...meta };

  // GOLD_PROVIDER goes first, then the rest in this order. Providers without a key are skipped.
  const order = [env('GOLD_PROVIDER').toLowerCase(), 'twelvedata', 'massive', 'goldapi', 'metalpriceapi', 'metalsdev', 'metalsapi']
    .filter((p, i, a) => providers[p] && a.indexOf(p) === i);

  let result = null; const errors = [];
  for (const name of order) {
    if (cooldownUntil[name] > Date.now()) { errors.push(`${name}: paused (out of credits or key rejected)`); continue; }
    try {
      const r = await providers[name]();
      if (!r) continue; // no key for this provider
      // Gold is required. Missing secondary metals come from Massive's previous close,
      // or failing that from the last good reading.
      if (!valid(r.usdPerOz.XAU)) throw new Error('no gold price returned');
      const missing = METALS.filter((m) => !valid(r.usdPerOz[m]));
      if (missing.length && name !== 'massive') {
        const filled = await massiveBackfill(missing);
        Object.assign(r.usdPerOz, filled);
        r.delayedMetals = Object.keys(filled);
      }
      for (const m of METALS) if (!valid(r.usdPerOz[m]) && lastGood) r.usdPerOz[m] = lastGood.usdPerOz[m];
      if (r.delayed) console.warn(`[rates] ${name} plan has no real-time forex; showing previous close`);
      result = { source: name, demo: false, stale: !!r.delayed, ...r };
      if (lastGood?.source !== name) console.log(`[rates] now using ${name}`);
      break;
    } catch (e) { errors.push(`${name}: ${e.message}`); coolDown(name, e); }
  }

  if (result) {
    const fx = { USD: 1, AED: AED_PEG, PKR: null, ...Object.fromEntries(Object.entries(result.fx).filter(([, v]) => valid(v))) };
    if (!valid(fx.PKR)) {
      try { const ex = await exchangeRates(); if (valid(ex.PKR)) fx.PKR = ex.PKR; if (valid(ex.AED)) fx.AED = ex.AED; }
      catch (e) { errors.push(`exchangerate: ${e.message}`); }
    }
    result.fx = fx;
    result.updated = new Date().toISOString();
    result = withQuotes(result);
    cache = lastGood = result; cachedAt = Date.now();
    return { ...result, ...meta };
  }

  if (errors.length && lastGood) return { ...lastGood, stale: true, ...meta };
  if (errors.length) console.warn('[rates] all providers failed:', errors.join(' | '));
  const d = withQuotes({ ...demo(), updated: new Date().toISOString() });
  cache = d; cachedAt = Date.now();
  return { ...d, ...meta };
}
