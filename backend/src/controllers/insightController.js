const UserStats = require('../models/UserStats');
const { generateDailyInsight } = require('../services/insightService');

// GET /api/insights/daily
exports.getDailyInsight = async (req, res, next) => {
  try {
    const today = UserStats.todayStr();
    const stats = await UserStats.getOrCreate(req.user._id);

    // Return cached insight if already generated today
    if (stats.lastInsight && stats.lastInsight.date === today) {
      return res.json({ success: true, data: stats.lastInsight, cached: true });
    }

    // Generate fresh insight
    const insight = await generateDailyInsight(req.user._id, req.user);
    if (!insight) {
      return res.json({ success: true, data: null });
    }

    // Cache it
    stats.lastInsight = { ...insight, date: today, generatedAt: new Date() };
    await stats.save();

    res.json({ success: true, data: stats.lastInsight, cached: false });
  } catch (err) {
    next(err);
  }
};

// POST /api/insights/refresh — force regenerate (skips cache)
exports.refreshInsight = async (req, res, next) => {
  try {
    const insight = await generateDailyInsight(req.user._id, req.user);
    if (!insight) return res.json({ success: true, data: null });

    const today = UserStats.todayStr();
    const stats = await UserStats.getOrCreate(req.user._id);
    stats.lastInsight = { ...insight, date: today, generatedAt: new Date() };
    await stats.save();

    res.json({ success: true, data: stats.lastInsight, cached: false });
  } catch (err) {
    next(err);
  }
};
