const express = require('express');
const { getScore, logActivity, getScoreHistory } = require('../controllers/scoreController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.get('/', getScore);
router.post('/activity', logActivity);
router.get('/history', getScoreHistory);

module.exports = router;
