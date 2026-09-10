/**
 * aiService.js
 * Unified AI router — OpenAI · Anthropic · Ollama (local)
 * Set AI_PROVIDER in .env to: 'openai' | 'anthropic' | 'ollama'
 */

const callAI = async (systemPrompt, userMessage, conversationHistory = []) => {
  const provider = process.env.AI_PROVIDER || 'openai';

  if (provider === 'ollama') {
    return callOllama(systemPrompt, userMessage, conversationHistory);
  }
  if (provider === 'anthropic') {
    return callAnthropic(systemPrompt, userMessage, conversationHistory);
  }
  return callOpenAI(systemPrompt, userMessage, conversationHistory);
};

// ── Ollama (local) — delegates to ollamaService which uses http module ────
const callOllama = async (systemPrompt, userMessage, conversationHistory = []) => {
  const { chat } = require('./ollamaService');
  return chat(systemPrompt, userMessage, conversationHistory);
};

// ── OpenAI ─────────────────────────────────────────────────────────────────
const callOpenAI = async (systemPrompt, userMessage, conversationHistory = []) => {
  const OpenAI = require('openai');
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory,
    { role: 'user', content: userMessage },
  ];
  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages, max_tokens: 900, temperature: 0.7,
  });
  return response.choices[0].message.content;
};

// ── Anthropic ──────────────────────────────────────────────────────────────
const callAnthropic = async (systemPrompt, userMessage, conversationHistory = []) => {
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const messages = [...conversationHistory, { role: 'user', content: userMessage }];
  const response = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
    max_tokens: 900, system: systemPrompt, messages,
  });
  return response.content[0].text;
};

// ── System prompts ─────────────────────────────────────────────────────────
const buildAdvisorSystemPrompt = (user, expenseData) => {
  const { thisMonth, lastMonth, budget, categoryBreakdown, changePercent } = expenseData;
  const categories = categoryBreakdown.slice(0, 5).map((c) => `  - ${c._id}: ₹${c.total.toFixed(2)}`).join('\n');
  return `You are FinCoach AI, a friendly personal financial advisor.
USER: ${user.name}, Monthly Budget: ₹${budget}, Currency: ${user.currency || 'INR'}
SPENDING: This month ₹${thisMonth.toFixed(2)} (${changePercent > 0 ? '+' : ''}${changePercent}% vs last month)
Budget used: ${((thisMonth / budget) * 100).toFixed(1)}%
TOP CATEGORIES:\n${categories || '  - No data yet'}
Give personalized, specific, actionable financial advice. Be concise — 2-3 short paragraphs. Use ₹ for currency.`;
};

const buildChatSystemPrompt = (user, expenseData) => {
  const { thisMonth, budget, topCategory } = expenseData;
  return `You are FinCoach AI, a helpful financial advisor chatbot.
USER: ${user.name}, Spending ₹${thisMonth.toFixed(2)} of ₹${budget} budget this month
Top category: ${topCategory || 'N/A'}, Currency: ${user.currency || 'INR'}
Answer finance questions clearly, reference the user's actual data, be concise (1-3 paragraphs), use markdown formatting.`;
};

const buildInvestmentSystemPrompt = (user, portfolioData) => {
  const { totalInvested, currentValue, absoluteReturn, percentReturn, totalHoldings, byType, topGainers, topLosers } = portfolioData;
  const typeBreakdown = (byType || []).slice(0, 6).map((t) => `  - ${t.type}: ₹${t.current?.toLocaleString()} (${t.allocation}% of portfolio, ${t.return >= 0 ? '+' : ''}${t.return}%)`).join('\n');
  const gainersStr = (topGainers || []).slice(0, 3).map((g) => `  - ${g.name}: +${g.percentReturn}%`).join('\n');
  const losersStr  = (topLosers  || []).slice(0, 3).map((l) => `  - ${l.name}: ${l.percentReturn}%`).join('\n');
  return `You are FinCoach AI, an expert investment portfolio advisor for Indian markets.
USER: ${user.name}, Currency: ${user.currency || 'INR'}
PORTFOLIO: Invested ₹${totalInvested?.toLocaleString()}, Current ₹${currentValue?.toLocaleString()}, Return ${absoluteReturn >= 0 ? '+' : ''}₹${absoluteReturn?.toLocaleString()} (${percentReturn}%), Holdings: ${totalHoldings}
ALLOCATION:\n${typeBreakdown || '  - No holdings yet'}
${(topGainers || []).length ? `TOP GAINERS:\n${gainersStr}` : ''}
${(topLosers  || []).length ? `TOP LOSERS:\n${losersStr}` : ''}
Provide honest, balanced investment advice. Reference Indian context (SIP, ELSS, NIFTY, Sensex) where relevant.
Always end with: "This is educational guidance, not SEBI-registered financial advice."`;
};

module.exports = { callAI, callOllama, buildAdvisorSystemPrompt, buildChatSystemPrompt, buildInvestmentSystemPrompt };
