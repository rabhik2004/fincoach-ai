const express = require('express');
const {
  analyzeFinances, getSavingTips, getBudgetPlan,
  analyzePortfolio, getRebalancePlan, getInvestmentTips, getRiskAssessment,
  chat, getSessions,
} = require('../controllers/aiController');
const { protect } = require('../middleware/auth');
const router = express.Router();
router.use(protect);
router.post('/analyze', analyzeFinances);
router.post('/tips', getSavingTips);
router.post('/budget-plan', getBudgetPlan);
router.post('/invest/analyze', analyzePortfolio);
router.post('/invest/rebalance', getRebalancePlan);
router.post('/invest/tips', getInvestmentTips);
router.post('/invest/risk', getRiskAssessment);
router.post('/chat', chat);
router.get('/sessions', getSessions);
module.exports = router;
