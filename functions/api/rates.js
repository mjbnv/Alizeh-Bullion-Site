// Cloudflare Pages Function: GET /api/rates
// Runs the same rate logic as the local server (lib/rates.mjs). API keys come from the
// project's environment variables in the Cloudflare dashboard and never reach the browser.
//
// Two layers keep API credit use low no matter how many people visit:
//   1. Cloudflare's edge cache answers repeat requests in each city for up to a minute.
//   2. The RATES_KV store (optional but recommended) shares the latest prices, and the
//      credit-saving memory, across all of Cloudflare, so the providers are only asked
//      once per REFRESH_INTERVAL_SECONDS.
import { getRates, useEnv, exportState, importState } from '../../lib/rates.mjs';

const KV_KEY = 'rates-v1';

export async function onRequestGet({ request, env, waitUntil }) {
  useEnv(env);
  const refresh = Math.max(15, Number(env.REFRESH_INTERVAL_SECONDS) || 60);
  const edge = caches.default;
  const cacheKey = new Request(new URL('/api/rates', request.url).toString());

  const hit = await edge.match(cacheKey);
  if (hit) return hit;

  const kv = env.RATES_KV;
  let data = null;
  if (kv) {
    const saved = await kv.get(KV_KEY, 'json');
    if (saved?.data && Date.now() - saved.at < refresh * 1000) data = saved.data;
    else importState(saved?.state);
  }
  if (!data) {
    data = await getRates();
    if (kv && !data.demo) waitUntil(kv.put(KV_KEY, JSON.stringify({ at: Date.now(), data, state: exportState() })));
  }

  const res = new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${Math.min(60, refresh)}` },
  });
  waitUntil(edge.put(cacheKey, res.clone()));
  return res;
}
