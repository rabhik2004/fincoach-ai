/**
 * priceService.js
 * Fetches live stock / crypto / ETF / mutual fund prices via yahoo-finance2.
 * Zero API key required. Caches results for 5 minutes to avoid rate limits.
 */

const yahooFinance = require('yahoo-finance2').default;

// ── In-memory cache: symbol → { price, change, changePct, name, currency, updatedAt } ──
const cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ── Symbol normalizer ──────────────────────────────────────────────────────
const normalizeSymbol = (symbol, type = 'Stock', exchange = '') => {
  if (!symbol) return null;
  const s = symbol.trim().toUpperCase();

  // Crypto: add -USD suffix for yahoo
  if (type === 'Crypto') {
    if (s === 'BTC') return 'BTC-USD';
    if (s === 'ETH') return 'ETH-USD';
    if (s === 'SOL') return 'SOL-USD';
    if (s === 'BNB') return 'BNB-USD';
    if (!s.includes('-')) return `${s}-USD`;
    return s;
  }

  // Indian stocks: append .NS (NSE) or .BO (BSE)
  if (exchange === 'NSE' || exchange === 'BSE') {
    if (!s.includes('.')) return exchange === 'BSE' ? `${s}.BO` : `${s}.NS`;
  }

  // Gold ETFs (Indian)
  if (s === 'GOLDBEES') return 'GOLDBEES.NS';
  if (s === 'NIFTYBEES') return 'NIFTYBEES.NS';

  return s;
};

// ── Fetch single symbol ────────────────────────────────────────────────────
const fetchPrice = async (symbol, type = 'Stock', exchange = '') => {
  const ysymbol = normalizeSymbol(symbol, type, exchange);
  if (!ysymbol) return null;

  // Check cache
  const cached = cache.get(ysymbol);
  if (cached && Date.now() - cached.updatedAt < CACHE_TTL_MS) {
    return cached;
  }

  try {
    const quote = await yahooFinance.quote(ysymbol, {
      fields: ['regularMarketPrice', 'regularMarketChange', 'regularMarketChangePercent',
               'regularMarketPreviousClose', 'regularMarketOpen', 'regularMarketDayHigh',
               'regularMarketDayLow', 'regularMarketVolume', 'shortName', 'longName',
               'currency', 'marketState', 'fiftyTwoWeekHigh', 'fiftyTwoWeekLow'],
    });

    const result = {
      symbol: ysymbol,
      originalSymbol: symbol,
      name: quote.shortName || quote.longName || symbol,
      price: quote.regularMarketPrice,
      change: parseFloat((quote.regularMarketChange || 0).toFixed(2)),
      changePct: parseFloat((quote.regularMarketChangePercent || 0).toFixed(2)),
      prevClose: quote.regularMarketPreviousClose,
      open: quote.regularMarketOpen,
      high: quote.regularMarketDayHigh,
      low: quote.regularMarketDayLow,
      volume: quote.regularMarketVolume,
      weekHigh52: quote.fiftyTwoWeekHigh,
      weekLow52: quote.fiftyTwoWeekLow,
      currency: quote.currency || 'USD',
      marketState: quote.marketState || 'CLOSED',
      updatedAt: Date.now(),
    };

    cache.set(ysymbol, result);
    return result;
  } catch (err) {
    console.warn(`[priceService] Failed to fetch ${ysymbol}:`, err.message);
    return null;
  }
};

// ── Fetch multiple symbols in parallel (with concurrency cap) ─────────────
const fetchPrices = async (investments) => {
  const CHUNK = 8; // Yahoo Finance handles ~8 parallel requests comfortably
  const results = {};

  for (let i = 0; i < investments.length; i += CHUNK) {
    const chunk = investments.slice(i, i + CHUNK);
    const fetches = chunk.map((inv) =>
      fetchPrice(inv.symbol, inv.type, inv.exchange)
        .then((data) => { if (data && inv.symbol) results[inv.symbol] = data; })
        .catch(() => {})
    );
    await Promise.all(fetches);
  }

  return results;
};

// ── Search symbols (autocomplete) ─────────────────────────────────────────
const searchSymbol = async (query) => {
  try {
    const results = await yahooFinance.search(query, { quotesCount: 8, newsCount: 0 });
    return (results.quotes || []).map((q) => ({
      symbol: q.symbol,
      name: q.shortname || q.longname || q.symbol,
      type: q.quoteType,
      exchange: q.exchange,
    }));
  } catch {
    return [];
  }
};

// ── Get historical data (for sparklines) ──────────────────────────────────
const getHistory = async (symbol, type = 'Stock', exchange = '', days = 30) => {
  const ysymbol = normalizeSymbol(symbol, type, exchange);
  if (!ysymbol) return [];

  try {
    const from = new Date();
    from.setDate(from.getDate() - days);
    const result = await yahooFinance.historical(ysymbol, {
      period1: from.toISOString().split('T')[0],
      interval: days <= 7 ? '1d' : '1d',
    });
    return result.map((r) => ({
      date: r.date.toISOString().split('T')[0],
      close: parseFloat(r.close.toFixed(2)),
    }));
  } catch {
    return [];
  }
};

// ── Cache stats (for monitoring) ──────────────────────────────────────────
const getCacheStats = () => ({
  size: cache.size,
  symbols: [...cache.keys()],
});

// Clear expired entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of cache.entries()) {
    if (now - val.updatedAt > CACHE_TTL_MS * 2) cache.delete(key);
  }
}, 10 * 60 * 1000);

module.exports = { fetchPrice, fetchPrices, searchSymbol, getHistory, normalizeSymbol, getCacheStats };
