const UserStats = require('../models/UserStats');
const { calculateScore, recordActivity, persistScore } = require('../services/scoreService');

// GET /api/score
exports.getScore = async (req, res, next) => {
  try {
    const { score, breakdown, streak, spentThisMonth } = await calculateScore(
      req.user._id,
      req.user.monthlyBudget
    );
    await persistScore(req.user._id, score, breakdown);

    const stats = await UserStats.getOrCreate(req.user._id);

    // Score label
    const label =
      score >= 85 ? 'Excellent' :
      score >= 70 ? 'Good' :
      score >= 55 ? 'Fair' :
      score >= 40 ? 'Needs work' :
      'Getting started';

    // Score color
    const color =
      score >= 85 ? 'green' :
      score >= 70 ? 'blue' :
      score >= 55 ? 'amber' :
      'red';

    res.json({
      success: true,
      data: {
        score,
        label,
        color,
        breakdown,
        streak: stats.streak,
        longestStreak: stats.longestStreak,
        weeklyChange: stats.weeklyScoreChange,
        totalActiveDays: stats.totalActiveDays,
        weeklyActivityCount: stats.weeklyActivityCount,
        scoreHistory: stats.scoreHistory.slice(-14),  // last 2 weeks
        spentThisMonth,
      },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/score/activity — call after any user action
exports.logActivity = async (req, res, next) => {
  try {
    const { type = 'expense' } = req.body;
    const stats = await recordActivity(req.user._id, type);

    res.json({
      success: true,
      data: {
        streak: stats.streak,
        longestStreak: stats.longestStreak,
        weeklyActivityCount: stats.weeklyActivityCount,
        message: getStreakMessage(stats.streak),
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/score/history — 30-day chart data
exports.getScoreHistory = async (req, res, next) => {
  try {
    const stats = await UserStats.getOrCreate(req.user._id);
    res.json({ success: true, data: stats.scoreHistory });
  } catch (err) {
    next(err);
  }
};

function getStreakMessage(streak) {
  if (streak === 1) return "You're back! Streak started 🔥";
  if (streak === 3) return "3-day streak! You're building a habit 💪";
  if (streak === 7) return "One full week! You're on fire 🔥🔥";
  if (streak === 14) return "Two weeks strong! Incredible consistency 🏆";
  if (streak === 30) return "30-day legend! Financial master 🌟";
  if (streak % 10 === 0) return `${streak} days! Unstoppable 🚀`;
  return `${streak}-day streak — keep going!`;
}
