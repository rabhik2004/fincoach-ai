const express = require('express');
const { getQuote, searchSymbols, getHistory, refreshPortfolioPrices, getMarketSummary } = require('../controllers/priceController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.get('/summary', getMarketSummary);
router.get('/search', searchSymbols);
router.get('/history/:symbol', getHistory);
router.get('/quote/:symbol', getQuote);
router.post('/portfolio-refresh', refreshPortfolioPrices);

module.exports = router;
