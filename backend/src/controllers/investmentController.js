const { validationResult } = require('express-validator');
const Investment = require('../models/Investment');

// ─── GET /api/investments ──────────────────────────────────────────────────
exports.getInvestments = async (req, res, next) => {
  try {
    const { type, sector, goal, sort = '-createdAt' } = req.query;
    const filter = { user: req.user._id };
    if (type) filter.type = type;
    if (sector) filter.sector = sector;
    if (goal) filter.goal = goal;

    const investments = await Investment.find(filter).sort(sort).lean({ virtuals: true });

    res.json({ success: true, data: investments, count: investments.length });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/investments/:id ──────────────────────────────────────────────
exports.getInvestment = async (req, res, next) => {
  try {
    const inv = await Investment.findOne({ _id: req.params.id, user: req.user._id }).lean({ virtuals: true });
    if (!inv) return res.status(404).json({ error: 'Investment not found' });
    res.json({ success: true, data: inv });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/investments ─────────────────────────────────────────────────
exports.createInvestment = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const inv = await Investment.create({ ...req.body, user: req.user._id });

    // Fire-and-forget activity tracking
    const { recordActivity } = require('../services/scoreService');
    recordActivity(req.user._id, 'investment').catch(() => {});

    res.status(201).json({ success: true, data: inv.toJSON() });
  } catch (err) {
    next(err);
  }
};

// ─── PUT /api/investments/:id ──────────────────────────────────────────────
exports.updateInvestment = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const inv = await Investment.findOne({ _id: req.params.id, user: req.user._id });
    if (!inv) return res.status(404).json({ error: 'Investment not found' });

    const allowedFields = [
      'name', 'symbol', 'type', 'sector', 'quantity', 'avgBuyPrice',
      'currentPrice', 'exchange', 'currency', 'isSIP', 'sipAmount',
      'sipDate', 'notes', 'goal', 'priceHistory',
    ];
    allowedFields.forEach((f) => { if (req.body[f] !== undefined) inv[f] = req.body[f]; });
    await inv.save();

    res.json({ success: true, data: inv.toJSON() });
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /api/investments/:id ───────────────────────────────────────────
exports.deleteInvestment = async (req, res, next) => {
  try {
    const inv = await Investment.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!inv) return res.status(404).json({ error: 'Investment not found' });
    res.json({ success: true, message: 'Investment deleted' });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/investments/:id/transaction ─────────────────────────────────
exports.addTransaction = async (req, res, next) => {
  try {
    const { type, quantity, price, date, notes } = req.body;
    const inv = await Investment.findOne({ _id: req.params.id, user: req.user._id });
    if (!inv) return res.status(404).json({ error: 'Investment not found' });

    inv.transactions.push({ type, quantity, price, date: date || new Date(), notes });

    // Recalculate avgBuyPrice from buy transactions
    const buyTxns = inv.transactions.filter((t) => t.type === 'buy');
    if (buyTxns.length > 0) {
      const totalQty = buyTxns.reduce((s, t) => s + t.quantity, 0);
      const totalCost = buyTxns.reduce((s, t) => s + t.quantity * t.price, 0);
      inv.avgBuyPrice = parseFloat((totalCost / totalQty).toFixed(4));
      inv.quantity = totalQty - inv.transactions.filter((t) => t.type === 'sell').reduce((s, t) => s + t.quantity, 0);
    }

    await inv.save();
    res.json({ success: true, data: inv.toJSON() });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/investments/stats ────────────────────────────────────────────
exports.getPortfolioStats = async (req, res, next) => {
  try {
    const investments = await Investment.find({ user: req.user._id }).lean({ virtuals: true });

    if (!investments.length) {
      return res.json({
        success: true,
        data: {
          totalInvested: 0,
          currentValue: 0,
          absoluteReturn: 0,
          percentReturn: 0,
          totalHoldings: 0,
          gainers: 0,
          losers: 0,
          byType: [],
          bySector: [],
          byGoal: [],
          topGainers: [],
          topLosers: [],
        },
      });
    }

    const totalInvested = investments.reduce((s, i) => s + i.investedAmount, 0);
    const currentValue = investments.reduce((s, i) => s + i.currentValue, 0);
    const absoluteReturn = currentValue - totalInvested;
    const percentReturn = totalInvested > 0 ? ((absoluteReturn / totalInvested) * 100) : 0;

    // Group by type
    const typeMap = {};
    investments.forEach((i) => {
      if (!typeMap[i.type]) typeMap[i.type] = { type: i.type, invested: 0, current: 0, count: 0 };
      typeMap[i.type].invested += i.investedAmount;
      typeMap[i.type].current += i.currentValue;
      typeMap[i.type].count += 1;
    });
    const byType = Object.values(typeMap).map((t) => ({
      ...t,
      invested: parseFloat(t.invested.toFixed(2)),
      current: parseFloat(t.current.toFixed(2)),
      allocation: parseFloat(((t.current / currentValue) * 100).toFixed(1)),
      return: parseFloat((((t.current - t.invested) / t.invested) * 100).toFixed(2)),
    })).sort((a, b) => b.current - a.current);

    // Group by sector
    const sectorMap = {};
    investments.forEach((i) => {
      const s = i.sector || 'Other';
      if (!sectorMap[s]) sectorMap[s] = { sector: s, invested: 0, current: 0, count: 0 };
      sectorMap[s].invested += i.investedAmount;
      sectorMap[s].current += i.currentValue;
      sectorMap[s].count += 1;
    });
    const bySector = Object.values(sectorMap).map((s) => ({
      ...s,
      invested: parseFloat(s.invested.toFixed(2)),
      current: parseFloat(s.current.toFixed(2)),
      allocation: parseFloat(((s.current / currentValue) * 100).toFixed(1)),
    })).sort((a, b) => b.current - a.current);

    // Group by goal
    const goalMap = {};
    investments.forEach((i) => {
      const g = i.goal || 'Untagged';
      if (!goalMap[g]) goalMap[g] = { goal: g, invested: 0, current: 0, count: 0 };
      goalMap[g].invested += i.investedAmount;
      goalMap[g].current += i.currentValue;
      goalMap[g].count += 1;
    });
    const byGoal = Object.values(goalMap).sort((a, b) => b.current - a.current);

    // Top gainers & losers
    const sorted = [...investments].sort((a, b) => b.percentReturn - a.percentReturn);
    const topGainers = sorted.slice(0, 5).filter((i) => i.percentReturn > 0);
    const topLosers = sorted.slice(-5).reverse().filter((i) => i.percentReturn < 0);

    res.json({
      success: true,
      data: {
        totalInvested: parseFloat(totalInvested.toFixed(2)),
        currentValue: parseFloat(currentValue.toFixed(2)),
        absoluteReturn: parseFloat(absoluteReturn.toFixed(2)),
        percentReturn: parseFloat(percentReturn.toFixed(2)),
        totalHoldings: investments.length,
        gainers: investments.filter((i) => i.percentReturn > 0).length,
        losers: investments.filter((i) => i.percentReturn < 0).length,
        byType,
        bySector,
        byGoal,
        topGainers,
        topLosers,
      },
    });
  } catch (err) {
    next(err);
  }
};
