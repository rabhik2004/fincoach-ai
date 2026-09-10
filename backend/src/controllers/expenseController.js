const { validationResult } = require('express-validator');
const Expense = require('../models/Expense');

// GET /api/expenses
exports.getExpenses = async (req, res, next) => {
  try {
    const { category, startDate, endDate, limit = 50, page = 1, sort = '-date' } = req.query;

    const filter = { user: req.user._id };
    if (category) filter.category = category;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [expenses, total] = await Promise.all([
      Expense.find(filter).sort(sort).limit(parseInt(limit)).skip(skip).lean(),
      Expense.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: expenses,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/expenses
exports.createExpense = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const expense = await Expense.create({ ...req.body, user: req.user._id });

    // Fire-and-forget activity tracking (don't block the response)
    const { recordActivity } = require('../services/scoreService');
    recordActivity(req.user._id, 'expense').catch(() => {});

    res.status(201).json({ success: true, data: expense });
  } catch (error) {
    next(error);
  }
};

// PUT /api/expenses/:id
exports.updateExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findOne({ _id: req.params.id, user: req.user._id });
    if (!expense) return res.status(404).json({ error: 'Expense not found.' });

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    Object.assign(expense, req.body);
    await expense.save();
    res.json({ success: true, data: expense });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/expenses/:id
exports.deleteExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!expense) return res.status(404).json({ error: 'Expense not found.' });
    res.json({ success: true, message: 'Expense deleted.' });
  } catch (error) {
    next(error);
  }
};

// GET /api/expenses/:id
exports.getExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findOne({ _id: req.params.id, user: req.user._id });
    if (!expense) return res.status(404).json({ error: 'Expense not found.' });
    res.json({ success: true, data: expense });
  } catch (error) {
    next(error);
  }
};
