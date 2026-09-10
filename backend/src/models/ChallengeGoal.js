const mongoose = require('mongoose');

// ── Weekly Challenges ──────────────────────────────────────────────────────
const challengeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  week: { type: String, required: true },        // 'YYYY-Www'
  type: {
    type: String,
    enum: [
      'zero_spend_day',          // Log a zero-spend day
      'under_budget',            // Stay under daily budget for 3 days
      'invest_this_week',        // Add an investment
      'cut_top_category',        // Spend 20% less in top category
      'log_every_day',           // Log expenses 5 days this week
      'savings_goal',            // Transfer a fixed amount to savings
      'no_food_delivery',        // No food delivery this week
      'portfolio_review',        // Review investments this week
    ],
    required: true,
  },
  title: String,
  description: String,
  target: Number,               // e.g. 3 (days), 20 (percent), 5000 (amount)
  progress: { type: Number, default: 0 },
  completed: { type: Boolean, default: false },
  completedAt: Date,
  xpReward: { type: Number, default: 50 },
  emoji: { type: String, default: '🎯' },
}, { timestamps: true });

challengeSchema.index({ user: 1, week: 1 });

// ── Financial Goals ────────────────────────────────────────────────────────
const goalSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 100 },
  emoji: { type: String, default: '🎯' },
  type: {
    type: String,
    enum: ['savings', 'investment', 'debt_payoff', 'purchase', 'emergency_fund', 'custom'],
    required: true,
  },
  targetAmount: { type: Number, required: true, min: 0 },
  currentAmount: { type: Number, default: 0, min: 0 },
  deadline: { type: Date },
  category: String,
  notes: String,
  isCompleted: { type: Boolean, default: false },
  completedAt: Date,
  color: { type: String, default: '#16a34a' },
}, { timestamps: true });

goalSchema.virtual('progressPct').get(function () {
  if (!this.targetAmount) return 0;
  return Math.min(parseFloat(((this.currentAmount / this.targetAmount) * 100).toFixed(1)), 100);
});

goalSchema.virtual('remaining').get(function () {
  return Math.max(0, this.targetAmount - this.currentAmount);
});

goalSchema.virtual('daysLeft').get(function () {
  if (!this.deadline) return null;
  const diff = new Date(this.deadline) - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
});

goalSchema.set('toJSON', { virtuals: true });
goalSchema.set('toObject', { virtuals: true });

const Challenge = mongoose.model('Challenge', challengeSchema);
const Goal = mongoose.model('Goal', goalSchema);

module.exports = { Challenge, Goal };
