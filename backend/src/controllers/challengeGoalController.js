const { Challenge, Goal } = require('../models/ChallengeGoal');
const { generateWeeklyChallengess, refreshChallengeProgress, weekStr } = require('../services/challengeService');
const { validationResult } = require('express-validator');

// ── CHALLENGES ─────────────────────────────────────────────────────────────

// GET /api/challenges/weekly
exports.getWeeklyChallenges = async (req, res, next) => {
  try {
    const week = weekStr();
    let challenges = await Challenge.find({ user: req.user._id, week }).sort('createdAt');

    if (!challenges.length) {
      challenges = await generateWeeklyChallengess(req.user._id, req.user.monthlyBudget);
    } else {
      // Refresh progress silently
      challenges = await refreshChallengeProgress(req.user._id);
    }

    const totalXP = challenges.filter((c) => c.completed).reduce((s, c) => s + c.xpReward, 0);
    const completedCount = challenges.filter((c) => c.completed).length;

    res.json({
      success: true,
      data: {
        week,
        challenges,
        totalXP,
        completedCount,
        totalCount: challenges.length,
      },
    });
  } catch (err) { next(err); }
};

// POST /api/challenges/refresh — force regenerate
exports.refreshChallenges = async (req, res, next) => {
  try {
    const week = weekStr();
    await Challenge.deleteMany({ user: req.user._id, week });
    const challenges = await generateWeeklyChallengess(req.user._id, req.user.monthlyBudget);
    res.json({ success: true, data: { challenges } });
  } catch (err) { next(err); }
};

// ── GOALS ──────────────────────────────────────────────────────────────────

// GET /api/goals
exports.getGoals = async (req, res, next) => {
  try {
    const goals = await Goal.find({ user: req.user._id }).sort('-createdAt').lean({ virtuals: true });
    res.json({ success: true, data: goals });
  } catch (err) { next(err); }
};

// POST /api/goals
exports.createGoal = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const goal = await Goal.create({ ...req.body, user: req.user._id });
    res.status(201).json({ success: true, data: goal.toJSON() });
  } catch (err) { next(err); }
};

// PUT /api/goals/:id
exports.updateGoal = async (req, res, next) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id });
    if (!goal) return res.status(404).json({ error: 'Goal not found' });

    const { title, targetAmount, currentAmount, deadline, notes, emoji, color, type } = req.body;
    if (title !== undefined) goal.title = title;
    if (targetAmount !== undefined) goal.targetAmount = targetAmount;
    if (currentAmount !== undefined) {
      goal.currentAmount = currentAmount;
      if (currentAmount >= goal.targetAmount && !goal.isCompleted) {
        goal.isCompleted = true;
        goal.completedAt = new Date();
      }
    }
    if (deadline !== undefined) goal.deadline = deadline;
    if (notes !== undefined) goal.notes = notes;
    if (emoji !== undefined) goal.emoji = emoji;
    if (color !== undefined) goal.color = color;
    if (type !== undefined) goal.type = type;

    await goal.save();
    res.json({ success: true, data: goal.toJSON() });
  } catch (err) { next(err); }
};

// POST /api/goals/:id/contribute — add money to goal
exports.contributeToGoal = async (req, res, next) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Valid amount required' });

    const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id });
    if (!goal) return res.status(404).json({ error: 'Goal not found' });

    goal.currentAmount = Math.min(goal.currentAmount + Number(amount), goal.targetAmount);
    if (goal.currentAmount >= goal.targetAmount && !goal.isCompleted) {
      goal.isCompleted = true;
      goal.completedAt = new Date();
    }
    await goal.save();
    res.json({ success: true, data: goal.toJSON(), justCompleted: goal.isCompleted });
  } catch (err) { next(err); }
};

// DELETE /api/goals/:id
exports.deleteGoal = async (req, res, next) => {
  try {
    const goal = await Goal.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!goal) return res.status(404).json({ error: 'Goal not found' });
    res.json({ success: true, message: 'Goal deleted' });
  } catch (err) { next(err); }
};
