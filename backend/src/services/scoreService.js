/**
 * scoreService.js
 * Calculates FinScore (0–100) and manages streak.
 *
 * Scoring breakdown:
 *  Budget adherence   0–30 pts  (are you within budget?)
 *  Savings rate       0–25 pts  (investments vs spending)
 *  Investment activity 0–20 pts (do you invest?)
 *  Streak bonus       0–15 pts  (daily consistency)
 *  Weekly consistency  0–10 pts  (how many days logged this week)
 */

const Expense = require('../models/Expense');
const Investment = require('../models/Investment');
const UserStats = require('../models/UserStats');

// ── Budget adherence score (0–30) ──────────────────────────────────────────
const getBudgetScore = (spentThisMonth, budget) => {
  if (!budget || budget === 0) return 15; // neutral if no budget set
  const pct = (spentThisMonth / budget) * 100;
  if (pct <= 50)  return 30;
  if (pct <= 70)  return 25;
  if (pct <= 85)  return 18;
  if (pct <= 100) return 10;
  if (pct <= 120) return 4;
  return 0;  // way over budget
};

// ── Savings rate score (0–25) ──────────────────────────────────────────────
const getSavingsScore = (totalInvested, monthlySpend) => {
  if (!totalInvested) return 0;
  if (!monthlySpend || monthlySpend === 0) return 20;
  const ratio = totalInvested / (totalInvested + monthlySpend * 6);  // 6-month baseline
  if (ratio >= 0.4)  return 25;
  if (ratio >= 0.25) return 20;
  if (ratio >= 0.15) return 14;
  if (ratio >= 0.05) return 8;
  return 3;
};

// ── Investment activity score (0–20) ───────────────────────────────────────
const getInvestmentScore = (totalHoldings, portfolioReturn) => {
  if (!totalHoldings) return 0;
  let score = 0;
  // Holdings diversity
  if (totalHoldings >= 10) score += 10;
  else if (totalHoldings >= 5) score += 7;
  else if (totalHoldings >= 2) score += 4;
  else score += 2;
  // Portfolio performance
  if (portfolioReturn > 10) score += 10;
  else if (portfolioReturn > 0) score += 7;
  else if (portfolioReturn > -5) score += 4;
  else score += 2;
  return Math.min(score, 20);
};

// ── Streak score (0–15) ────────────────────────────────────────────────────
const getStreakScore = (streak) => {
  if (streak >= 30) return 15;
  if (streak >= 14) return 12;
  if (streak >= 7)  return 9;
  if (streak >= 3)  return 6;
  if (streak >= 1)  return 3;
  return 0;
};

// ── Weekly consistency score (0–10) ───────────────────────────────────────
const getConsistencyScore = (weeklyActivity) => {
  if (weeklyActivity >= 7) return 10;
  if (weeklyActivity >= 5) return 8;
  if (weeklyActivity >= 3) return 5;
  if (weeklyActivity >= 1) return 2;
  return 0;
};

// ── Main score calculation ─────────────────────────────────────────────────
const calculateScore = async (userId, monthlyBudget) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [expenseAgg, investments, stats] = await Promise.all([
    Expense.aggregate([
      { $match: { user: userId, date: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Investment.find({ user: userId }).lean({ virtuals: true }),
    UserStats.getOrCreate(userId),
  ]);

  const spentThisMonth = expenseAgg[0]?.total || 0;
  const totalInvested = investments.reduce((s, i) => s + i.investedAmount, 0);
  const currentValue = investments.reduce((s, i) => s + i.currentValue, 0);
  const portfolioReturn = totalInvested > 0 ? ((currentValue - totalInvested) / totalInvested) * 100 : 0;

  const breakdown = {
    budgetScore:      getBudgetScore(spentThisMonth, monthlyBudget || 3000),
    savingsScore:     getSavingsScore(totalInvested, spentThisMonth),
    investmentScore:  getInvestmentScore(investments.length, portfolioReturn),
    streakScore:      getStreakScore(stats.streak),
    consistencyScore: getConsistencyScore(stats.weeklyActivityCount),
  };

  const total = Object.values(breakdown).reduce((s, v) => s + v, 0);
  const score = Math.min(Math.round(total), 100);

  return { score, breakdown, streak: stats.streak, spentThisMonth };
};

// ── Record activity + update streak ───────────────────────────────────────
const recordActivity = async (userId, activityType = 'expense') => {
  const stats = await UserStats.getOrCreate(userId);
  const today = UserStats.todayStr();
  const thisWeek = UserStats.weekStr();

  // ── Streak logic ──────────────────────────────────────────────────────
  if (stats.lastActivityDate !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().split('T')[0];

    if (stats.lastActivityDate === yStr) {
      // Consecutive day → extend streak
      stats.streak += 1;
    } else if (!stats.lastActivityDate) {
      // First ever activity
      stats.streak = 1;
    } else {
      // Gap in days → reset
      stats.streak = 1;
    }

    stats.lastActivityDate = today;
    stats.totalActiveDays = (stats.totalActiveDays || 0) + 1;
    if (stats.streak > (stats.longestStreak || 0)) {
      stats.longestStreak = stats.streak;
    }
  }

  // ── Weekly activity counter ───────────────────────────────────────────
  if (stats.lastWeekReset !== thisWeek) {
    stats.weeklyActivityCount = 0;
    stats.lastWeekReset = thisWeek;
  }
  stats.weeklyActivityCount = (stats.weeklyActivityCount || 0) + 1;

  // ── Activity type count ───────────────────────────────────────────────
  if (activityType === 'expense') {
    stats.totalExpensesLogged = (stats.totalExpensesLogged || 0) + 1;
  } else if (activityType === 'investment') {
    stats.totalInvestmentsLogged = (stats.totalInvestmentsLogged || 0) + 1;
  }

  await stats.save();
  return stats;
};

// ── Persist score snapshot ─────────────────────────────────────────────────
const persistScore = async (userId, score, breakdown) => {
  const stats = await UserStats.getOrCreate(userId);
  const today = UserStats.todayStr();

  // Replace today's snapshot or append
  const idx = stats.scoreHistory.findIndex((s) => s.date === today);
  if (idx >= 0) {
    stats.scoreHistory[idx] = { date: today, score, breakdown };
  } else {
    stats.scoreHistory.push({ date: today, score, breakdown });
    // Keep only last 30 days
    if (stats.scoreHistory.length > 30) {
      stats.scoreHistory = stats.scoreHistory.slice(-30);
    }
  }

  // Weekly change: compare to 7 days ago
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const oldStr = sevenDaysAgo.toISOString().split('T')[0];
  const oldSnap = stats.scoreHistory.find((s) => s.date === oldStr);
  stats.weeklyScoreChange = oldSnap ? score - oldSnap.score : 0;
  stats.currentScore = score;

  await stats.save();
};

module.exports = { calculateScore, recordActivity, persistScore };
