const Investment = require('../models/Investment');
const { fetchPrice, fetchPrices, searchSymbol, getHistory } = require('../services/priceService');

// GET /api/prices/quote/:symbol?type=Stock&exchange=NSE
exports.getQuote = async (req, res, next) => {
  try {
    const { symbol } = req.params;
    const { type = 'Stock', exchange = '' } = req.query;
    const data = await fetchPrice(symbol, type, exchange);
    if (!data) return res.status(404).json({ error: `No price data found for ${symbol}` });
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// GET /api/prices/search?q=reliance
exports.searchSymbols = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 1) return res.json({ success: true, data: [] });
    const results = await searchSymbol(q);
    res.json({ success: true, data: results });
  } catch (err) { next(err); }
};

// GET /api/prices/history/:symbol?type=Stock&exchange=NSE&days=30
exports.getHistory = async (req, res, next) => {
  try {
    const { symbol } = req.params;
    const { type = 'Stock', exchange = '', days = '30' } = req.query;
    const { getHistory } = require('../services/priceService');
    const data = await getHistory(symbol, type, exchange, parseInt(days));
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// POST /api/prices/portfolio-refresh
// Fetches live prices for all user holdings and updates currentPrice in DB
exports.refreshPortfolioPrices = async (req, res, next) => {
  try {
    const investments = await Investment.find({
      user: req.user._id,
      symbol: { $exists: true, $ne: null, $ne: '' },
    }).lean();

    if (!investments.length) {
      return res.json({ success: true, updated: 0, prices: {} });
    }

    const priceMap = await fetchPrices(investments);
    let updated = 0;

    const bulkOps = [];
    for (const inv of investments) {
      const priceData = priceMap[inv.symbol];
      if (priceData && priceData.price) {
        bulkOps.push({
          updateOne: {
            filter: { _id: inv._id },
            update: { $set: { currentPrice: priceData.price } },
          },
        });
        updated++;
      }
    }

    if (bulkOps.length) await Investment.bulkWrite(bulkOps);

    res.json({ success: true, updated, prices: priceMap });
  } catch (err) { next(err); }
};

// GET /api/prices/market-summary — index prices for dashboard widget
exports.getMarketSummary = async (req, res, next) => {
  try {
    const INDICES = [
      { symbol: '^NSEI',   name: 'NIFTY 50',   type: 'Index' },
      { symbol: '^BSESN',  name: 'SENSEX',      type: 'Index' },
      { symbol: '^GSPC',   name: 'S&P 500',     type: 'Index' },
      { symbol: 'BTC-USD', name: 'Bitcoin',     type: 'Crypto' },
      { symbol: 'GLD',     name: 'Gold ETF',    type: 'ETF' },
    ];

    const { fetchPrices } = require('../services/priceService');
    const priceMap = await fetchPrices(INDICES.map((i) => ({ symbol: i.symbol, type: i.type, exchange: '' })));

    const summary = INDICES.map((idx) => ({
      ...idx,
      ...(priceMap[idx.symbol] || { price: null, changePct: null }),
    }));

    res.json({ success: true, data: summary });
  } catch (err) { next(err); }
};
