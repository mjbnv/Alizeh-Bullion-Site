// Cloudflare Pages Function: GET /api/watch-prices
// Same logic as the local server (lib/watch-prices.mjs). Returns {} until a watch price API is configured.
import { getWatchPrices, useEnv } from '../../lib/watch-prices.mjs';

export async function onRequestGet({ env }) {
  useEnv(env);
  return new Response(JSON.stringify(await getWatchPrices()), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },
  });
}
