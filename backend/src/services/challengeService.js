/**
 * challengeService.js
 * Generates personalised weekly challenges based on the user's spending patterns.
 * Each week: 3 challenges tailored to their biggest weaknesses + strengths.
 */

const { Challenge } = require('../models/ChallengeGoal');
const Expense = require('../models/Expense');
const Investment = require('../models/Investment');

const weekStr = () => {
  const d = new Date();
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
};

// ── Challenge templates ────────────────────────────────────────────────────
const TEMPLATES = {
  zero_spend_day: {
    emoji: '⚡',
    title: 'Zero-spend day',
    description: 'Go one full day without spending anything. Log it!',
    target: 1,
    xpReward: 80,
    getProgress: async (userId) => {
      const start = new Date(); start.setDate(start.getDate() - 7);
      const agg = await Expense.aggregate([
        { $match: { user: userId, date: { $gte: start } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, total: { $sum: '$amount' } } },
        { $match: { total: { $lt: 1 } } }, // days with < ₹1 spending
      ]);
      return agg.length;
    },
  },
  invest_this_week: {
    emoji: '📈',
    title: 'Invest this week',
    description: 'Add or update at least one investment. Small steps count!',
    target: 1,
    xpReward: 100,
    getProgress: async (userId) => {
      const start = new Date(); start.setDate(start.getDate() - 7);
      const count = await Investment.countDocuments({ user: userId, updatedAt: { $gte: start } });
      return Math.min(count, 1);
    },
  },
  log_every_day: {
    emoji: '📅',
    title: 'Log 5 days this week',
    description: 'Log at least one expense every day for 5 days.',
    target: 5,
    xpReward: 150,
    getProgress: async (userId) => {
      const start = new Date(); start.setDate(start.getDate() - 7);
      const agg = await Expense.aggregate([
        { $match: { user: userId, date: { $gte: start } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } } } },
      ]);
      return Math.min(agg.length, 5);
    },
  },
  portfolio_review: {
    emoji: '🔍',
    title: 'Portfolio check-in',
    description: 'Review your investments and update at least one current price.',
    target: 1,
    xpReward: 60,
    getProgress: async (userId) => {
      const start = new Date(); start.setDate(start.getDate() - 7);
      const count = await Investment.countDocuments({ user: userId, updatedAt: { $gte: start } });
      return Math.min(count, 1);
    },
  },
};

// ── Generate personalised challenges for the week ─────────────────────────
const generateWeeklyChallengess = async (userId, monthlyBudget) => {
  const week = weekStr();

  // Check if already generated this week
  const existing = await Challenge.find({ user: userId, week });
  if (existing.length >= 2) return existing;

  // Analyze user patterns
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [catAgg, investments, monthAgg] = await Promise.all([
    Expense.aggregate([
      { $match: { user: userId, date: { $gte: sevenDaysAgo } } },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]),
    Investment.countDocuments({ user: userId }),
    Expense.aggregate([
      { $match: { user: userId, date: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);

  const monthSpend = monthAgg[0]?.total || 0;
  const topCategory = catAgg[0]?._id;
  const budgetPct = monthlyBudget ? (monthSpend / monthlyBudget) * 100 : 0;

  // Pick 3 challenges based on user situation
  const selected = [];

  // Always include logging challenge
  selected.push({
    type: 'log_every_day',
    ...TEMPLATES.log_every_day,
    user: userId, week,
  });

  // If over 80% budget → zero spend day challenge
  if (budgetPct >= 80) {
    selected.push({
      type: 'zero_spend_day',
      ...TEMPLATES.zero_spend_day,
      user: userId, week,
    });
  }

  // If no investments → invest challenge
  if (!investments) {
    selected.push({
      type: 'invest_this_week',
      ...TEMPLATES.invest_this_week,
      user: userId, week,
    });
  } else {
    selected.push({
      type: 'portfolio_review',
      ...TEMPLATES.portfolio_review,
      user: userId, week,
    });
  }

  // If only 1 selected so far, add zero spend
  if (selected.length < 2) {
    selected.push({
      type: 'zero_spend_day',
      ...TEMPLATES.zero_spend_day,
      user: userId, week,
    });
  }

  // Deduplicate by type (in case of overlap)
  const unique = selected.filter((c, i, arr) => arr.findIndex((x) => x.type === c.type) === i).slice(0, 3);

  // Remove getProgress function before storing (not storable in Mongoose)
  const toSave = unique.map(({ getProgress, ...rest }) => rest);

  await Challenge.deleteMany({ user: userId, week }); // clear stale
  const created = await Challenge.insertMany(toSave);
  return created;
};

// ── Refresh progress for all user challenges this week ────────────────────
const refreshChallengeProgress = async (userId) => {
  const week = weekStr();
  const challenges = await Challenge.find({ user: userId, week });

  for (const ch of challenges) {
    const template = TEMPLATES[ch.type];
    if (!template?.getProgress) continue;

    const progress = await template.getProgress(userId);
    ch.progress = progress;
    if (progress >= ch.target && !ch.completed) {
      ch.completed = true;
      ch.completedAt = new Date();
    }
    await ch.save();
  }

  return challenges;
};

module.exports = { generateWeeklyChallengess, refreshChallengeProgress, weekStr };
