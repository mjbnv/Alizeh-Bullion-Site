// Cloudflare Worker entry point.
// Pages and assets in dist/ are served directly by Cloudflare. Anything else lands here:
//  - /api/stream and /api/admin/*  -> the RateHub Durable Object (live gold price, pricing settings, admin sign-in)
//  - /api/rates, /api/watch-prices -> the regular rate code
//  - everything else               -> the static site
import { onRequestGet as rates } from '../functions/api/rates.js';
import { onRequestGet as watchPrices } from '../functions/api/watch-prices.js';
export { RateHub } from './rate-hub.js';

const routes = { '/api/rates': rates, '/api/watch-prices': watchPrices };

export default {
  async fetch(request, env, ctx) {
    const path = new URL(request.url).pathname;
    if (path === '/api/stream' || path.startsWith('/api/admin/')) {
      return env.RATE_HUB.get(env.RATE_HUB.idFromName('gold')).fetch(request);
    }
    const handler = routes[path];
    if (handler) {
      if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405 });
      return handler({ request, env, waitUntil: (p) => ctx.waitUntil(p) });
    }
    return env.ASSETS.fetch(request);
  },
};
