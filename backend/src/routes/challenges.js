const express = require('express');
const { body } = require('express-validator');
const {
  getWeeklyChallenges, refreshChallenges,
  getGoals, createGoal, updateGoal, contributeToGoal, deleteGoal,
} = require('../controllers/challengeGoalController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// Challenges
router.get('/weekly', getWeeklyChallenges);
router.post('/refresh', refreshChallenges);

// Goals
router.get('/goals', getGoals);
router.post('/goals', [
  body('title').trim().notEmpty().withMessage('Title required'),
  body('type').notEmpty().withMessage('Type required'),
  body('targetAmount').isFloat({ min: 1 }).withMessage('Target amount must be positive'),
], createGoal);
router.put('/goals/:id', updateGoal);
router.post('/goals/:id/contribute', contributeToGoal);
router.delete('/goals/:id', deleteGoal);

module.exports = router;
