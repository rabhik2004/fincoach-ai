const express = require('express');
const { body } = require('express-validator');
const {
  getInvestments,
  getInvestment,
  createInvestment,
  updateInvestment,
  deleteInvestment,
  addTransaction,
  getPortfolioStats,
} = require('../controllers/investmentController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

const Investment = require('../models/Investment');

const baseValidation = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 120 }),
  body('type').isIn(Investment.schema.path('type').enumValues).withMessage('Invalid asset type'),
  body('quantity').isFloat({ min: 0 }).withMessage('Quantity must be a positive number'),
  body('avgBuyPrice').isFloat({ min: 0 }).withMessage('Buy price must be a positive number'),
  body('currentPrice').isFloat({ min: 0 }).withMessage('Current price must be a positive number'),
];

// Portfolio stats — must come before /:id routes
router.get('/stats', getPortfolioStats);

router.get('/', getInvestments);
router.post('/', baseValidation, createInvestment);
router.get('/:id', getInvestment);
router.put('/:id', baseValidation, updateInvestment);
router.delete('/:id', deleteInvestment);
router.post('/:id/transaction', addTransaction);

module.exports = router;
