/**
 * insightService.js
 *
 * Generates one personalized daily insight per user.
 * Rule engine → picks the highest-priority signal from user data.
 * Falls back to AI if no strong rule fires AND AI is enabled.
 *
 * Insight shape: { type, emoji, title, what, why, action, priority }
 */

const Expense = require('../models/Expense');
const Investment = require('../models/Investment');
const UserStats = require('../models/UserStats');

// ─── Helpers ───────────────────────────────────────────────────────────────
const fmt = (n, currency = '₹') =>
  `${currency}${Math.round(n).toLocaleString('en-IN')}`;

const pct = (n) => `${Math.round(n)}%`;

// ─── Rule 1: Overspending category (CRITICAL) ──────────────────────────────
const ruleOverspendCategory = async (userId) => {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const ydStart = new Date(yesterday.setHours(0, 0, 0, 0));
  const ydEnd = new Date(yesterday.setHours(23, 59, 59, 999));
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Yesterday's spend by category
  const [ydAgg, weekAgg] = await Promise.all([
    Expense.aggregate([
      { $match: { user: userId, date: { $gte: ydStart, $lte: ydEnd } } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } },
    ]),
    Expense.aggregate([
      { $match: { user: userId, date: { $gte: sevenDaysAgo } } },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
  ]);

  if (!ydAgg.length) return null;

  const topYd = ydAgg[0];
  const weekEntry = weekAgg.find((w) => w._id === topYd._id);
  if (!weekEntry) return null;

  const weekDailyAvg = weekEntry.total / 7;
  const overspendPct = weekDailyAvg > 0 ? ((topYd.total - weekDailyAvg) / weekDailyAvg) * 100 : 0;

  if (overspendPct >= 30) {
    const saving = Math.round(topYd.total - weekDailyAvg);
    return {
      type: 'overspend',
      emoji: '⚡',
      title: `${topYd._id} spike detected`,
      what: `You spent ${fmt(topYd.total)} on ${topYd._id} yesterday — ${pct(overspendPct)} above your 7-day average.`,
      why: `Small daily spikes compound fast. That gap adds up to ${fmt(saving * 30)} extra per month.`,
      action: `Cut back on ${topYd._id} today. Try to stay under ${fmt(weekDailyAvg)} — you'll save ${fmt(saving)} in 24 hours.`,
      priority: 'critical',
      meta: { category: topYd._id, amount: topYd.total, avg: weekDailyAvg, overspendPct },
    };
  }
  return null;
};

// ─── Rule 2: Budget danger zone (CRITICAL) ─────────────────────────────────
const ruleBudgetDanger = async (userId, budget) => {
  if (!budget) return null;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const agg = await Expense.aggregate([
    { $match: { user: userId, date: { $gte: startOfMonth } } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  const spent = agg[0]?.total || 0;
  const pctUsed = (spent / budget) * 100;
  const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();

  if (pctUsed >= 90) {
    const remaining = Math.max(0, budget - spent);
    return {
      type: 'budget_danger',
      emoji: '🔴',
      title: 'Budget almost exhausted',
      what: `You've used ${pct(pctUsed)} of your ${fmt(budget)} budget with ${daysLeft} days left this month.`,
      why: `At this pace you'll overshoot by ${fmt(Math.max(0, spent - budget + (spent / now.getDate()) * daysLeft))}.`,
      action: `You have ${fmt(remaining)} left. Aim for ${fmt(remaining / Math.max(daysLeft, 1))} per day max — log every spend to stay aware.`,
      priority: 'critical',
      meta: { pctUsed, remaining, daysLeft },
    };
  }
  if (pctUsed >= 75) {
    return {
      type: 'budget_warning',
      emoji: '🟡',
      title: 'Budget getting tight',
      what: `${pct(pctUsed)} of your monthly budget used with ${daysLeft} days remaining.`,
      why: 'The last week of the month is when most people overshoot — staying aware now makes a real difference.',
      action: `Stick to essentials for the rest of the month. You have ${fmt(budget - spent)} left.`,
      priority: 'warning',
      meta: { pctUsed, daysLeft },
    };
  }
  return null;
};

// ─── Rule 3: Top category is too heavy (WARNING) ───────────────────────────
const ruleCategoryHeavy = async (userId) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const [totalAgg, catAgg] = await Promise.all([
    Expense.aggregate([{ $match: { user: userId, date: { $gte: startOfMonth } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Expense.aggregate([{ $match: { user: userId, date: { $gte: startOfMonth } } }, { $group: { _id: '$category', total: { $sum: '$amount' } } }, { $sort: { total: -1 } }]),
  ]);
  if (!totalAgg[0]?.total || !catAgg.length) return null;
  const total = totalAgg[0].total;
  const top = catAgg[0];
  const share = (top.total / total) * 100;
  if (share >= 45) {
    return {
      type: 'category_heavy',
      emoji: '📊',
      title: `${top._id} is ${pct(share)} of your spending`,
      what: `This month, ${top._id} alone accounts for ${pct(share)} of all your expenses (${fmt(top.total)} of ${fmt(total)}).`,
      why: 'Concentration in one area makes budgets fragile — one bad week can blow everything.',
      action: `Review your ${top._id} expenses and see if you can reduce by 15%. That would save ${fmt(top.total * 0.15)} this month.`,
      priority: 'warning',
      meta: { category: top._id, share, amount: top.total },
    };
  }
  return null;
};

// ─── Rule 4: Great budget day (POSITIVE) ──────────────────────────────────
const ruleGoodDay = async (userId) => {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const ydStart = new Date(yesterday.setHours(0, 0, 0, 0));
  const ydEnd = new Date(ydStart.getTime() + 86400000 - 1);

  const agg = await Expense.aggregate([
    { $match: { user: userId, date: { $gte: ydStart, $lte: ydEnd } } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  const ydSpend = agg[0]?.total || 0;
  if (ydSpend === 0) {
    return {
      type: 'zero_spend',
      emoji: '🌟',
      title: 'Zero-spend day yesterday!',
      what: "You didn't log any spending yesterday — a perfect zero-spend day.",
      why: 'Zero-spend days directly accelerate your savings rate and build discipline.',
      action: "Can you do it again today? Two consecutive zero-spend days = real momentum.",
      priority: 'positive',
      meta: { ydSpend },
    };
  }
  return null;
};

// ─── Rule 5: Streak milestone (POSITIVE) ──────────────────────────────────
const ruleStreakMilestone = async (userId) => {
  const stats = await UserStats.getOrCreate(userId);
  const milestones = [3, 7, 14, 21, 30, 50, 100];
  if (milestones.includes(stats.streak)) {
    return {
      type: 'streak_milestone',
      emoji: '🔥',
      title: `${stats.streak}-day streak achieved!`,
      what: `You've logged activity for ${stats.streak} days in a row — hitting a major milestone.`,
      why: 'Financial consistency over 3+ weeks creates lasting habits that compound for years.',
      action: `Keep the streak alive today — log at least one expense or check your portfolio. Don't break the chain!`,
      priority: 'positive',
      meta: { streak: stats.streak },
    };
  }
  return null;
};

// ─── Rule 6: Investment opportunity (INFO) ─────────────────────────────────
const ruleInvestmentOpportunity = async (userId) => {
  const [investments, stats] = await Promise.all([
    Investment.find({ user: userId }).lean({ virtuals: true }),
    UserStats.getOrCreate(userId),
  ]);

  // No investments at all → strong nudge
  if (!investments.length && stats.totalExpensesLogged > 5) {
    return {
      type: 'invest_nudge',
      emoji: '📈',
      title: 'Your money is not working for you',
      what: "You've been tracking expenses but haven't logged any investments yet.",
      why: 'Inflation erodes idle cash by ~6% per year. ₹10,000 today = ₹5,584 in 10 years without investing.',
      action: 'Start small: add a SIP of just ₹500/month in a Nifty 50 index fund. Go to Investments → Add.',
      priority: 'info',
    };
  }

  // Portfolio is deeply negative → flag it
  if (investments.length > 0) {
    const totalInvested = investments.reduce((s, i) => s + i.investedAmount, 0);
    const currentValue = investments.reduce((s, i) => s + i.currentValue, 0);
    const ret = totalInvested > 0 ? ((currentValue - totalInvested) / totalInvested) * 100 : 0;
    if (ret < -15) {
      return {
        type: 'portfolio_down',
        emoji: '📉',
        title: `Portfolio down ${pct(Math.abs(ret))} — stay calm`,
        what: `Your portfolio is currently ${pct(Math.abs(ret))} in the red (${fmt(Math.abs(currentValue - totalInvested))} unrealised loss).`,
        why: "Market corrections are normal. Panic-selling locks in losses — long-term investors recover and grow.",
        action: 'If your investments are fundamentally sound, stay the course. Consider adding to your best positions on the dip.',
        priority: 'warning',
        meta: { return: ret },
      };
    }
  }
  return null;
};

// ─── Rule 7: Savings rate insight (INFO) ──────────────────────────────────
const ruleSavingsRate = async (userId, budget) => {
  if (!budget) return null;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const [expAgg, investments] = await Promise.all([
    Expense.aggregate([{ $match: { user: userId, date: { $gte: startOfMonth } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Investment.find({ user: userId }).lean({ virtuals: true }),
  ]);
  const spent = expAgg[0]?.total || 0;
  const totalInvested = investments.reduce((s, i) => s + i.investedAmount, 0);
  const income = budget * 1.3; // rough estimate — budget is ~77% of income
  const savingsRate = income > 0 ? ((income - spent) / income) * 100 : 0;

  if (savingsRate < 10 && savingsRate >= 0) {
    return {
      type: 'low_savings',
      emoji: '💡',
      title: 'Savings rate below 10%',
      what: `Based on your spending this month, your estimated savings rate is only ${pct(savingsRate)}.`,
      why: 'Financial experts recommend saving at least 20% of income. A 10% rate means retirement takes ~40+ years.',
      action: `Find one recurring expense to cut this month. Even ₹2,000/month saved = ₹24,000/year compounding.`,
      priority: 'info',
      meta: { savingsRate, spent },
    };
  }
  if (savingsRate >= 30) {
    return {
      type: 'high_savings',
      emoji: '🎯',
      title: `Excellent ${pct(savingsRate)} savings rate!`,
      what: `You're saving ${pct(savingsRate)} of your estimated income this month — well above average.`,
      why: 'At this rate you could achieve financial independence significantly ahead of schedule.',
      action: `Don't let savings sit idle. Make sure your surplus is invested — check your portfolio allocation.`,
      priority: 'positive',
      meta: { savingsRate },
    };
  }
  return null;
};

// ─── Rule 8: Weekly spending summary (INFO — fallback) ─────────────────────
const ruleWeeklySummary = async (userId) => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const agg = await Expense.aggregate([
    { $match: { user: userId, date: { $gte: sevenDaysAgo } } },
    { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { total: -1 } },
  ]);
  if (!agg.length) {
    return {
      type: 'no_data',
      emoji: '👋',
      title: 'Start tracking to get insights',
      what: "You haven't logged any expenses recently. Insights get smarter the more you track.",
      why: "People who track expenses save an average of 20% more per year than those who don't.",
      action: 'Log your first expense today — even small ones count. Tap Expenses → Add.',
      priority: 'info',
    };
  }
  const total = agg.reduce((s, c) => s + c.total, 0);
  const top = agg[0];
  return {
    type: 'weekly_summary',
    emoji: '📋',
    title: `Last 7 days: ${fmt(total)} spent`,
    what: `You spent ${fmt(total)} across ${agg.length} categories in the last week. Biggest: ${top._id} at ${fmt(top.total)}.`,
    why: 'Weekly reviews catch drifting habits before they become monthly problems.',
    action: `Is ${top._id} intentional spending? If not, challenge yourself to cut it by 20% next week.`,
    priority: 'info',
    meta: { total, topCategory: top._id },
  };
};

// ─── AI fallback (optional) ────────────────────────────────────────────────
const generateAIInsight = async (userId, user) => {
  if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) return null;
  try {
    const { callAI } = require('./aiService');
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const [expAgg, catAgg] = await Promise.all([
      Expense.aggregate([{ $match: { user: userId, date: { $gte: startOfMonth } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Expense.aggregate([{ $match: { user: userId, date: { $gte: startOfMonth } } }, { $group: { _id: '$category', total: { $sum: '$amount' } } }, { $sort: { total: -1 } }, { $limit: 3 }]),
    ]);
    const spent = expAgg[0]?.total || 0;
    const budget = user.monthlyBudget || 3000;
    const cats = catAgg.map((c) => `${c._id}: ₹${Math.round(c.total)}`).join(', ');

    const system = 'You are a concise financial insight generator. Always respond with ONLY a JSON object, no markdown.';
    const prompt = `User ${user.name} spent ₹${Math.round(spent)} this month (budget ₹${budget}). Top categories: ${cats || 'none'}.
Generate ONE financial insight as JSON: {"emoji":"…","title":"…","what":"…","why":"…","action":"…"}
Rules: title max 8 words. what/why/action each max 20 words. Be specific with numbers. Action must be concrete.`;

    const response = await callAI(system, prompt);
    const clean = response.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    return { ...parsed, type: 'ai_generated', priority: 'info' };
  } catch {
    return null;
  }
};

// ─── Main orchestrator ─────────────────────────────────────────────────────
const generateDailyInsight = async (userId, user) => {
  const budget = user.monthlyBudget;

  // Run all rules in parallel
  const [r1, r2, r3, r4, r5, r6, r7, r8] = await Promise.all([
    ruleOverspendCategory(userId).catch(() => null),
    ruleBudgetDanger(userId, budget).catch(() => null),
    ruleCategoryHeavy(userId).catch(() => null),
    ruleGoodDay(userId).catch(() => null),
    ruleStreakMilestone(userId).catch(() => null),
    ruleInvestmentOpportunity(userId).catch(() => null),
    ruleSavingsRate(userId, budget).catch(() => null),
    ruleWeeklySummary(userId).catch(() => null),
  ]);

  // Priority order: critical → warning → positive → info
  const PRIORITY_ORDER = { critical: 0, warning: 1, positive: 2, info: 3 };
  const candidates = [r1, r2, r3, r4, r5, r6, r7, r8].filter(Boolean);
  candidates.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

  if (candidates.length > 0) {
    return candidates[0];
  }

  // Fallback to AI if no rules fired
  const aiInsight = await generateAIInsight(userId, user);
  if (aiInsight) return aiInsight;

  return r8; // always have at least the weekly summary
};

module.exports = { generateDailyInsight };
