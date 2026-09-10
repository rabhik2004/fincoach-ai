const Expense = require('../models/Expense');
const Investment = require('../models/Investment');
const ChatSession = require('../models/ChatSession');
const { callAI, buildAdvisorSystemPrompt, buildChatSystemPrompt, buildInvestmentSystemPrompt } = require('../services/aiService');

// Friendly AI error → 503 response
const handleAIError = (err, res) => {
  const provider = process.env.AI_PROVIDER || 'openai';
  const msg = err.message || '';
  if (provider === 'ollama' || msg.toLowerCase().includes('ollama')) {
    return res.status(503).json({
      error: 'Ollama is not running. Start it in your terminal.',
      detail: 'ollama serve',
      hint: 'Then pull a model: ollama pull ' + (process.env.OLLAMA_MODEL || 'llama3.2'),
      provider: 'ollama',
    });
  }
  if (msg.includes('OPENAI_API_KEY') || msg.includes('apiKey')) {
    return res.status(503).json({
      error: 'OpenAI API key missing.',
      detail: 'Add OPENAI_API_KEY to .env, or set AI_PROVIDER=ollama to use local AI for free.',
      provider: 'openai',
    });
  }
  return res.status(500).json({ error: msg || 'AI request failed.' });
};


const getFinancialContext = async (userId, monthlyBudget) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
  const [thisMonthAgg, lastMonthAgg, categoryAgg] = await Promise.all([
    Expense.aggregate([{ $match: { user: userId, date: { $gte: startOfMonth } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Expense.aggregate([{ $match: { user: userId, date: { $gte: startOfLastMonth, $lte: endOfLastMonth } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Expense.aggregate([{ $match: { user: userId, date: { $gte: startOfMonth } } }, { $group: { _id: '$category', total: { $sum: '$amount' } } }, { $sort: { total: -1 } }]),
  ]);
  const thisMonth = thisMonthAgg[0]?.total || 0;
  const lastMonth = lastMonthAgg[0]?.total || 0;
  return {
    thisMonth, lastMonth, budget: monthlyBudget || 3000,
    changePercent: lastMonth > 0 ? parseFloat((((thisMonth - lastMonth) / lastMonth) * 100).toFixed(1)) : 0,
    categoryBreakdown: categoryAgg, topCategory: categoryAgg[0]?._id || 'N/A',
  };
};

const getPortfolioContext = async (userId) => {
  const investments = await Investment.find({ user: userId }).lean({ virtuals: true });
  if (!investments.length) return { totalInvested: 0, currentValue: 0, absoluteReturn: 0, percentReturn: 0, totalHoldings: 0, byType: [], bySector: [], topGainers: [], topLosers: [] };
  const totalInvested = investments.reduce((s, i) => s + i.investedAmount, 0);
  const currentValue = investments.reduce((s, i) => s + i.currentValue, 0);
  const absoluteReturn = currentValue - totalInvested;
  const percentReturn = totalInvested > 0 ? (absoluteReturn / totalInvested) * 100 : 0;
  const typeMap = {};
  investments.forEach((i) => {
    if (!typeMap[i.type]) typeMap[i.type] = { type: i.type, invested: 0, current: 0, count: 0 };
    typeMap[i.type].invested += i.investedAmount;
    typeMap[i.type].current += i.currentValue;
    typeMap[i.type].count += 1;
  });
  const byType = Object.values(typeMap).map((t) => ({
    ...t, allocation: parseFloat(((t.current / currentValue) * 100).toFixed(1)),
    return: parseFloat((((t.current - t.invested) / t.invested) * 100).toFixed(2)),
  })).sort((a, b) => b.current - a.current);
  const sorted = [...investments].sort((a, b) => b.percentReturn - a.percentReturn);
  return {
    totalInvested: parseFloat(totalInvested.toFixed(2)), currentValue: parseFloat(currentValue.toFixed(2)),
    absoluteReturn: parseFloat(absoluteReturn.toFixed(2)), percentReturn: parseFloat(percentReturn.toFixed(2)),
    totalHoldings: investments.length, byType,
    topGainers: sorted.filter((i) => i.percentReturn > 0).slice(0, 5),
    topLosers: sorted.filter((i) => i.percentReturn < 0).slice(-5).reverse(),
  };
};

exports.analyzeFinances = async (req, res, next) => {
  try {
    const expenseData = await getFinancialContext(req.user._id, req.user.monthlyBudget);
    const analysis = await callAI(buildAdvisorSystemPrompt(req.user, expenseData), `Analyze my finances:\n1. Brief assessment\n2. Top 2-3 savings areas\n3. Suggested budget allocation\n4. One actionable tip for today`);
    res.json({ success: true, data: { analysis, context: expenseData } });
  } catch (err) { return handleAIError(err, res); }
};

exports.getSavingTips = async (req, res, next) => {
  try {
    const expenseData = await getFinancialContext(req.user._id, req.user.monthlyBudget);
    const tips = await callAI(buildAdvisorSystemPrompt(req.user, expenseData), `Give me 5 specific, personalized money-saving tips as a numbered list.`);
    res.json({ success: true, data: { tips } });
  } catch (err) { return handleAIError(err, res); }
};

exports.getBudgetPlan = async (req, res, next) => {
  try {
    const expenseData = await getFinancialContext(req.user._id, req.user.monthlyBudget);
    const plan = await callAI(buildAdvisorSystemPrompt(req.user, expenseData), `Create a monthly budget plan using 50/30/20 rule. Format: category | recommended | current | difference`);
    res.json({ success: true, data: { plan } });
  } catch (err) { return handleAIError(err, res); }
};

exports.analyzePortfolio = async (req, res, next) => {
  try {
    const portfolioData = await getPortfolioContext(req.user._id);
    const analysis = await callAI(buildInvestmentSystemPrompt(req.user, portfolioData), `Analyze my portfolio:\n1. Overall health assessment\n2. Concentration risks or gaps\n3. Top 3 specific improvement actions\n4. Asset allocation appropriateness`);
    res.json({ success: true, data: { analysis, context: portfolioData } });
  } catch (err) { return handleAIError(err, res); }
};

exports.getRebalancePlan = async (req, res, next) => {
  try {
    const portfolioData = await getPortfolioContext(req.user._id);
    const plan = await callAI(buildInvestmentSystemPrompt(req.user, portfolioData), `Create a rebalancing plan:\n1. Ideal target allocation\n2. Changes needed to reach it\n3. Which positions to increase/decrease/exit\n4. Tax-efficient moves to prioritize`);
    res.json({ success: true, data: { plan } });
  } catch (err) { return handleAIError(err, res); }
};

exports.getInvestmentTips = async (req, res, next) => {
  try {
    const portfolioData = await getPortfolioContext(req.user._id);
    const tips = await callAI(buildInvestmentSystemPrompt(req.user, portfolioData), `Give 5 specific actionable investment tips for my portfolio. Consider SIP, underperformers, overweight positions, missing asset classes.`);
    res.json({ success: true, data: { tips } });
  } catch (err) { return handleAIError(err, res); }
};

exports.getRiskAssessment = async (req, res, next) => {
  try {
    const portfolioData = await getPortfolioContext(req.user._id);
    const risk = await callAI(buildInvestmentSystemPrompt(req.user, portfolioData), `Risk assessment:\n1. Risk score 1-10 with explanation\n2. Volatility analysis by asset class\n3. Key risk factors\n4. Hedging/defensive strategies`);
    res.json({ success: true, data: { risk } });
  } catch (err) { return handleAIError(err, res); }
};

exports.chat = async (req, res, next) => {
  try {
    const { message, sessionId } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'Message is required.' });
    const expenseData = await getFinancialContext(req.user._id, req.user.monthlyBudget);
    let session;
    if (sessionId) session = await ChatSession.findOne({ _id: sessionId, user: req.user._id });
    if (!session) {
      session = new ChatSession({ user: req.user._id, title: message.slice(0, 60), financialContext: { monthlyTotal: expenseData.thisMonth, topCategory: expenseData.topCategory, budgetUsed: parseFloat(((expenseData.thisMonth / expenseData.budget) * 100).toFixed(1)) } });
    }
    const conversationHistory = session.messages.slice(-10).map((m) => ({ role: m.role, content: m.content }));
    const aiResponse = await callAI(buildChatSystemPrompt(req.user, expenseData), message, conversationHistory);
    session.messages.push({ role: 'user', content: message });
    session.messages.push({ role: 'assistant', content: aiResponse });
    await session.save();
    res.json({ success: true, data: { reply: aiResponse, sessionId: session._id } });
  } catch (err) { return handleAIError(err, res); }
};

exports.getSessions = async (req, res, next) => {
  try {
    const sessions = await ChatSession.find({ user: req.user._id }).select('title createdAt messages financialContext').sort('-createdAt').limit(20).lean();
    res.json({ success: true, data: sessions.map((s) => ({ ...s, messageCount: s.messages.length, lastMessage: s.messages[s.messages.length - 1]?.content?.slice(0, 80) })) });
  } catch (err) { return handleAIError(err, res); }
};
