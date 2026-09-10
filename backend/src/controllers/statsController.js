const Expense = require('../models/Expense');

// GET /api/stats/summary
exports.getSummary = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [thisMonthAgg, lastMonthAgg, categoryAgg, dailyAgg] = await Promise.all([
      // This month total
      Expense.aggregate([
        { $match: { user: userId, date: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      // Last month total
      Expense.aggregate([
        { $match: { user: userId, date: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      // Category breakdown (this month)
      Expense.aggregate([
        { $match: { user: userId, date: { $gte: startOfMonth } } },
        { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ]),
      // Daily spending (last 30 days)
      Expense.aggregate([
        {
          $match: {
            user: userId,
            date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            total: { $sum: '$amount' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const thisMonth = thisMonthAgg[0]?.total || 0;
    const lastMonth = lastMonthAgg[0]?.total || 0;
    const budget = req.user.monthlyBudget || 3000;
    const changePercent = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0;

    res.json({
      success: true,
      data: {
        thisMonth,
        lastMonth,
        changePercent: parseFloat(changePercent.toFixed(1)),
        budget,
        budgetUsed: parseFloat(((thisMonth / budget) * 100).toFixed(1)),
        transactionCount: thisMonthAgg[0]?.count || 0,
        avgDailySpend: parseFloat((thisMonth / now.getDate()).toFixed(2)),
        categoryBreakdown: categoryAgg,
        dailySpending: dailyAgg,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/stats/monthly  (last 6 months for line chart)
exports.getMonthlyTrend = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const monthly = await Expense.aggregate([
      { $match: { user: userId, date: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$date' }, month: { $month: '$date' } },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formatted = monthly.map((m) => ({
      month: `${months[m._id.month - 1]} ${m._id.year}`,
      total: parseFloat(m.total.toFixed(2)),
      count: m.count,
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    next(error);
  }
};
