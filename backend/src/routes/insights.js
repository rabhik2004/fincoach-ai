const express = require('express');
const { getDailyInsight, refreshInsight } = require('../controllers/insightController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.get('/daily', getDailyInsight);
router.post('/refresh', refreshInsight);

module.exports = router;
