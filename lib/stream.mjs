// Live metal prices from AllTick over one WebSocket connection.
// The server holds a single upstream connection (AllTick's free plan allows only one per token)
// and fans every update out to all visitors, so visitor count never affects the feed.
//
// Uses only the global WebSocket and fetch, so it runs both in Node (serve.mjs) and on Cloudflare.
//
//   const feed = createStream({ token, onUpdate(snapshot) {} });
//   feed.snapshot()  -> { status, updated, symbols: { XAU: { bid, ask, last, high, low, open, time }, XAG: {...} } }
//
// Docs: https://github.com/AllTick-Official/alltick-realtime-forex-crypto-stock-tick-finance-websocket-api

const WS_URL = 'wss://quote.alltick.co/quote-b-ws-api';
const KLINE_URL = 'https://quote.alltick.co/quote-b-api/kline';
const CMD = { HEARTBEAT: 22000, ORDER_BOOK: 22002, TRADES: 22004, TRADE_PUSH: 22998, BOOK_PUSH: 22999 };

const num = (v) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : null; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function createStream({ token, codes = { XAU: 'GOLD', XAG: 'Silver' }, onUpdate = () => {}, log = console.log, flushMs = 100 }) {
  const byCode = Object.fromEntries(Object.entries(codes).map(([sym, code]) => [code, sym]));
  const symbols = Object.fromEntries(Object.keys(codes).map((s) => [s, { bid: null, ask: null, last: null, high: null, low: null, open: null, time: null }]));
  let status = 'connecting', updated = null, ws = null, seq = 1, beat = null, retry = 0, dirty = false, stopped = false;

  const snapshot = () => ({ status, updated, symbols });
  const markDirty = () => { dirty = true; };
  // Coalesce bursts of ticks into at most one broadcast per flushMs.
  const flusher = setInterval(() => { if (dirty) { dirty = false; onUpdate(snapshot()); } }, flushMs);
  const setStatus = (s) => { if (status !== s) { status = s; markDirty(); } };

  const send = (cmd_id, data = {}) => {
    if (ws?.readyState === 1) ws.send(JSON.stringify({ cmd_id, seq_id: seq++, trace: `ab-${Date.now()}-${seq}`, data }));
  };

  // Track the day's range from live prices between daily-candle refreshes.
  const widen = (s, p) => {
    if (p == null) return;
    if (s.high == null || p > s.high) s.high = p;
    if (s.low == null || p < s.low) s.low = p;
  };

  function onMessage(raw) {
    let m; try { m = JSON.parse(raw); } catch { return; }
    const d = m.data || {};
    const sym = byCode[d.code];
    if (m.cmd_id === CMD.BOOK_PUSH && sym) {
      const s = symbols[sym];
      s.bid = num(d.bids?.[0]?.price) ?? s.bid;
      s.ask = num(d.asks?.[0]?.price) ?? s.ask;
      s.time = Number(d.tick_time) || Date.now();
      if (s.bid && s.ask) widen(s, (s.bid + s.ask) / 2);
    } else if (m.cmd_id === CMD.TRADE_PUSH && sym) {
      const s = symbols[sym];
      s.last = num(d.price) ?? s.last;
      s.time = Number(d.tick_time) || Date.now();
      widen(s, s.last);
    } else {
      if (m.ret && m.ret !== 200) log(`[stream] AllTick ${m.cmd_id}: ${m.ret} ${m.msg || ''}`);
      return;
    }
    updated = Date.now();
    setStatus('live');
    markDirty();
  }

  function connect() {
    if (stopped) return;
    setStatus(retry ? 'reconnecting' : 'connecting');
    try { ws = new WebSocket(`${WS_URL}?token=${encodeURIComponent(token)}`); } catch (e) { log(`[stream] ${e.message}`); return reconnect(); }
    ws.onopen = async () => {
      retry = 0;
      log('[stream] connected to AllTick');
      const list = Object.values(codes).map((code) => ({ code }));
      send(CMD.ORDER_BOOK, { symbol_list: list.map((c) => ({ ...c, depth_level: 1 })) }); // bid / ask
      await sleep(1200); // AllTick: at least 1 s between requests on one connection
      send(CMD.TRADES, { symbol_list: list }); // last traded price
      clearInterval(beat); beat = setInterval(() => send(CMD.HEARTBEAT), 10000);
    };
    ws.onmessage = (e) => onMessage(typeof e.data === 'string' ? e.data : String(e.data));
    ws.onerror = () => {};
    ws.onclose = (e) => { clearInterval(beat); log(`[stream] closed ${e.code} ${e.reason || ''}`.trim()); reconnect(); };
  }

  function reconnect() {
    if (stopped) return;
    setStatus('reconnecting');
    const wait = Math.min(30000, 1000 * 2 ** retry++);
    setTimeout(connect, wait);
  }

  // Day open / high / low from the daily candle. Free plan: 1 request per 10 s, 1000 a day,
  // so codes are fetched 11 s apart and refreshed every 10 minutes (about 300 requests a day).
  async function loadDaily() {
    for (const [sym, code] of Object.entries(codes)) {
      try {
        const query = encodeURIComponent(JSON.stringify({ trace: `ab-k-${Date.now()}`, data: { code, kline_type: 8, kline_timestamp_end: 0, query_kline_num: 1, adjust_type: 0 } }));
        const j = await fetch(`${KLINE_URL}?token=${encodeURIComponent(token)}&query=${query}`, { signal: AbortSignal.timeout(8000) }).then((r) => r.json());
        const k = j?.data?.kline_list?.[0];
        if (k) {
          const s = symbols[sym];
          s.open = num(k.open_price) ?? s.open;
          s.high = Math.max(num(k.high_price) ?? 0, s.high ?? 0) || null;
          s.low = Math.min(num(k.low_price) ?? Infinity, s.low ?? Infinity);
          if (!Number.isFinite(s.low)) s.low = null;
          markDirty();
        } else if (j?.ret !== 200) log(`[stream] daily ${code}: ${j?.ret} ${j?.msg || ''}`);
      } catch (e) { log(`[stream] daily ${code}: ${e.message}`); }
      await sleep(11000);
    }
  }
  // A new trading day resets the range, so drop the live-widened values before each refresh.
  let day = new Date().getUTCDate();
  const daily = async () => {
    const today = new Date().getUTCDate();
    if (today !== day) { day = today; for (const s of Object.values(symbols)) { s.high = s.low = s.open = null; } }
    await loadDaily();
  };
  daily();
  const dailyTimer = setInterval(daily, 10 * 60 * 1000);

  connect();

  return {
    snapshot,
    stop() { stopped = true; clearInterval(beat); clearInterval(flusher); clearInterval(dailyTimer); ws?.close(); },
  };
}
