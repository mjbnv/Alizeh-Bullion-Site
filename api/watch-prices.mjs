// Average market value per watch reference — stub until a price API is chosen.
// Response shape (USD): { [ref]: { avg, low?, high?, currency: 'USD', updated } }
// The browser converts to AED/PKR with the same FX as the metal rates.
// To connect a provider: set WATCH_PRICE_API_KEY (and WATCH_PRICE_PROVIDER) in .env and fill in fetchPrices().

const env = (k) => (process.env[k] || '').trim();
let cache = null, cachedAt = 0;
const TTL = 6 * 60 * 60 * 1000; // market values move slowly: refresh every 6 hours

async function fetchPrices(/* refs */) {
  // Example:
  // const res = await fetch(`https://api.example.com/v1/prices?refs=${refs.join(',')}`, { headers: { Authorization: `Bearer ${env('WATCH_PRICE_API_KEY')}` } });
  // const j = await res.json();
  // return Object.fromEntries(j.items.map(i => [i.reference, { avg: i.average, currency: 'USD', updated: i.date }]));
  return {};
}

export async function getWatchPrices(refs = []) {
  if (!env('WATCH_PRICE_API_KEY')) return {};
  if (cache && Date.now() - cachedAt < TTL) return cache;
  try { cache = await fetchPrices(refs); cachedAt = Date.now(); return cache; }
  catch (e) { console.warn('[watch-prices]', e.message); return cache || {}; }
}
