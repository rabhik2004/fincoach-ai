const { isOllamaAvailable, listModels, chat, chatStream, pullModel } = require('../services/ollamaService');
const { buildChatSystemPrompt } = require('../services/aiService');
const Expense = require('../models/Expense');

// GET /api/ollama/status
exports.getStatus = async (req, res, next) => {
  try {
    const available = await isOllamaAvailable();
    const models = available ? await listModels() : [];
    res.json({
      success: true,
      data: {
        available,
        baseUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
        activeModel: process.env.OLLAMA_MODEL || 'llama3.2',
        models,
        recommended: ['llama3.2', 'mistral', 'gemma3', 'phi4', 'deepseek-r1:7b'],
      },
    });
  } catch (err) { next(err); }
};

// GET /api/ollama/models
exports.getModels = async (req, res, next) => {
  try {
    const models = await listModels();
    res.json({ success: true, data: models });
  } catch (err) { next(err); }
};

// POST /api/ollama/chat — non-streaming Ollama chat with financial context
exports.ollamaChat = async (req, res, next) => {
  try {
    const { message, sessionId, model } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'Message is required' });

    const available = await isOllamaAvailable();
    if (!available) {
      return res.status(503).json({
        error: 'Ollama is not running. Start it with: ollama serve',
        hint: 'Install from https://ollama.com/download then run: ollama pull llama3.2',
      });
    }

    // Build financial context for Ollama
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const [expAgg, catAgg] = await Promise.all([
      Expense.aggregate([{ $match: { user: req.user._id, date: { $gte: startOfMonth } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Expense.aggregate([{ $match: { user: req.user._id, date: { $gte: startOfMonth } } }, { $group: { _id: '$category', total: { $sum: '$amount' } } }, { $sort: { total: -1 } }, { $limit: 3 }]),
    ]);

    const expenseCtx = {
      thisMonth: expAgg[0]?.total || 0,
      budget: req.user.monthlyBudget || 3000,
      topCategory: catAgg[0]?._id || 'N/A',
    };

    const systemPrompt = `You are FinCoach AI, a personal finance assistant running locally on the user's device.
You are privacy-first — all data stays on their machine.

USER: ${req.user.name}
This month's spending: ₹${Math.round(expenseCtx.thisMonth)} of ₹${expenseCtx.budget} budget
Top category: ${expenseCtx.topCategory}

Be helpful, specific with numbers, and concise (max 3 paragraphs).
Use markdown formatting for clarity.`;

    const reply = await chat(systemPrompt, message, [], model || process.env.OLLAMA_MODEL || 'llama3.2');

    res.json({ success: true, data: { reply, model: model || 'llama3.2', local: true } });
  } catch (err) { next(err); }
};

// POST /api/ollama/stream — streaming chat (SSE)
exports.ollamaChatStream = async (req, res, next) => {
  try {
    const { message, model } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'Message required' });

    const available = await isOllamaAvailable();
    if (!available) {
      return res.status(503).json({ error: 'Ollama not running' });
    }

    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const systemPrompt = `You are FinCoach AI, a local privacy-first financial assistant for ${req.user.name}. Be helpful and concise.`;

    await chatStream(systemPrompt, message, [], model || 'llama3.2', (token) => {
      res.write(`data: ${JSON.stringify({ token })}\n\n`);
    });

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
};

// POST /api/ollama/pull — pull a model (admin)
exports.pullModel = async (req, res, next) => {
  try {
    const { model } = req.body;
    if (!model) return res.status(400).json({ error: 'Model name required' });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.flushHeaders();

    await pullModel(model, (progress) => {
      res.write(`data: ${JSON.stringify(progress)}\n\n`);
    });

    res.write('data: {"status":"complete"}\n\n');
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
};
