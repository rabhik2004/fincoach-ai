const express = require('express');
const { body } = require('express-validator');
const {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpense,
} = require('../controllers/expenseController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect); // All expense routes require auth

const Expense = require('../models/Expense');

const expenseValidation = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 100 }),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
  body('category').isIn(Expense.schema.path('category').enumValues).withMessage('Invalid category'),
  body('date').optional().isISO8601().withMessage('Invalid date format'),
];

router.get('/', getExpenses);
router.post('/', expenseValidation, createExpense);
router.get('/:id', getExpense);
router.put('/:id', expenseValidation, updateExpense);
router.delete('/:id', deleteExpense);

module.exports = router;
