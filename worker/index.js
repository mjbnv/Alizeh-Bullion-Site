// Cloudflare Worker entry point.
// Pages and assets in dist/ are served directly by Cloudflare. Anything else lands here:
// the two API routes run the live-rate code, everything else falls back to the static site.
import { onRequestGet as rates } from '../functions/api/rates.js';
import { onRequestGet as watchPrices } from '../functions/api/watch-prices.js';

const routes = { '/api/rates': rates, '/api/watch-prices': watchPrices };

export default {
  async fetch(request, env, ctx) {
    const handler = routes[new URL(request.url).pathname];
    if (handler) {
      if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405 });
      return handler({ request, env, waitUntil: (p) => ctx.waitUntil(p) });
    }
    return env.ASSETS.fetch(request);
  },
};
