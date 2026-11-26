// Alizeh Bullion pricing rules: turns the raw live gold price into our buy and sell prices.
// Gold only, USD per troy ounce, no rounding (for now).
//
//   Our sell price (customer buys)  = market ask + sell premium
//   Our buy price  (customer sells) = market bid - buy discount
//
// Each adjustment is either a percentage of the market price or a fixed USD amount per ounce.
// A negative value reverses it (e.g. a negative premium sells below the market ask).

export const DEFAULT_RULES = {
  sell: { type: 'pct', value: 0 },
  buy: { type: 'pct', value: 0 },
  paused: false,
  message: 'Please contact our trading desk for today\'s price.',
  updatedAt: null,
  updatedBy: null,
};

const adjust = (price, { type, value }) => (type === 'pct' ? price * (value / 100) : value);

export function applyRules(market, rules) {
  const { bid, ask } = market || {};
  return {
    sell: ask ? ask + adjust(ask, rules.sell) : null,
    buy: bid ? bid - adjust(bid, rules.buy) : null,
  };
}

// Validates admin input. Returns { rules } or { error }.
export function validateRules(input, current = DEFAULT_RULES) {
  const side = (s, name) => {
    if (!s || !['pct', 'usd'].includes(s.type)) return `${name}: choose percent or USD`;
    const v = Number(s.value);
    if (!Number.isFinite(v)) return `${name}: enter a number`;
    if (s.type === 'pct' && Math.abs(v) > 20) return `${name}: percentage must be between -20 and 20`;
    if (s.type === 'usd' && Math.abs(v) > 1000) return `${name}: amount must be between -1000 and 1000 USD`;
    return null;
  };
  const err = side(input?.sell, 'Sell premium') || side(input?.buy, 'Buy discount');
  if (err) return { error: err };
  const message = String(input.message ?? current.message).slice(0, 200);
  return {
    rules: {
      sell: { type: input.sell.type, value: Number(input.sell.value) },
      buy: { type: input.buy.type, value: Number(input.buy.value) },
      paused: Boolean(input.paused),
      message,
    },
  };
}

// Builds the public payload: raw market numbers plus our prices (or a pause message).
export function publicView(snap, rules) {
  const g = snap?.symbols?.XAU || {};
  const market = { bid: g.bid, ask: g.ask, last: g.last, high: g.high, low: g.low, open: g.open, time: g.time };
  return {
    status: snap?.status || 'offline',
    updated: snap?.updated || null,
    gold: market,
    ours: rules.paused ? { paused: true, message: rules.message } : { paused: false, ...applyRules(market, rules) },
  };
}
