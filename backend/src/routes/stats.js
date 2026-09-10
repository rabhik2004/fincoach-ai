const express = require('express');
const { getSummary, getMonthlyTrend } = require('../controllers/statsController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.get('/summary', getSummary);
router.get('/monthly', getMonthlyTrend);

module.exports = router;
