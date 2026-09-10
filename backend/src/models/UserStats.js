const mongoose = require('mongoose');

const scoreSnapshotSchema = new mongoose.Schema({
  date: { type: String, required: true },   // 'YYYY-MM-DD'
  score: { type: Number, required: true },
  breakdown: {
    budgetScore: Number,
    savingsScore: Number,
    investmentScore: Number,
    streakScore: Number,
    consistencyScore: Number,
  },
}, { _id: false });

const insightCacheSchema = new mongoose.Schema({
  date: { type: String },   // 'YYYY-MM-DD' — only one per day
  type: { type: String },
  emoji: { type: String },
  title: { type: String },
  what: { type: String },
  why: { type: String },
  action: { type: String },
  priority: { type: String, enum: ['critical', 'warning', 'positive', 'info'] },
  generatedAt: { type: Date },
}, { _id: false });

const userStatsSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },

    // ── Streak ──────────────────────────────────────────────────────────
    streak: { type: Number, default: 0, min: 0 },
    longestStreak: { type: Number, default: 0 },
    lastActivityDate: { type: String, default: null },  // 'YYYY-MM-DD'
    totalActiveDays: { type: Number, default: 0 },

    // ── FinScore ─────────────────────────────────────────────────────────
    currentScore: { type: Number, default: 0, min: 0, max: 100 },
    scoreHistory: { type: [scoreSnapshotSchema], default: [] },  // last 30 days
    weeklyScoreChange: { type: Number, default: 0 },  // current vs 7 days ago

    // ── Daily Insight Cache ───────────────────────────────────────────────
    lastInsight: { type: insightCacheSchema, default: null },

    // ── Activity counts ───────────────────────────────────────────────────
    totalExpensesLogged: { type: Number, default: 0 },
    totalInvestmentsLogged: { type: Number, default: 0 },
    weeklyActivityCount: { type: Number, default: 0 },  // this week's logs
    lastWeekReset: { type: String, default: null },       // 'YYYY-Www'
  },
  { timestamps: true }
);

// ── Helpers ────────────────────────────────────────────────────────────────
userStatsSchema.statics.todayStr = () => {
  return new Date().toISOString().split('T')[0];  // 'YYYY-MM-DD'
};

userStatsSchema.statics.weekStr = () => {
  const d = new Date();
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
};

// Get or create stats doc for a user
userStatsSchema.statics.getOrCreate = async function (userId) {
  let stats = await this.findOne({ user: userId });
  if (!stats) {
    stats = await this.create({ user: userId });
  }
  return stats;
};

module.exports = mongoose.model('UserStats', userStatsSchema);
