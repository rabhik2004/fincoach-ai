/**
 * ollamaService.js — uses http module (works on ALL Node.js versions)
 */

const http = require('http');
const OLLAMA_BASE = 'http://127.0.0.1:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';

// ── Generic HTTP helper (replaces fetch) ──────────────────────────────────
const httpRequest = (url, options = {}) => {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 11434,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      timeout: options.timeout || 5000,
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve({ ok: res.statusCode < 400, status: res.statusCode, text: () => Promise.resolve(data), json: () => {
  try {
    return Promise.resolve(JSON.parse(data));
  } catch (e) {
    console.log("JSON ERROR:", data);
    throw e;
  }
} }));
    });

    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
};

// ── Streaming HTTP helper ─────────────────────────────────────────────────
const httpStream = (url, body, onChunk) => {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 11434,
      path: urlObj.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    };

    const req = http.request(reqOptions, (res) => {
      let fullText = '';
      res.on('data', (chunk) => {
        const lines = chunk.toString().split('\n').filter(Boolean);
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            const token = parsed.message?.content || '';
            if (token) { fullText += token; if (onChunk) onChunk(token); }
          } catch { /* partial chunk */ }
        }
      });
      res.on('end', () => resolve(fullText));
    });

    req.on('error', reject);
    req.write(JSON.stringify(body));
    req.end();
  });
};

// ── Check if Ollama is running ────────────────────────────────────────────
const isOllamaAvailable = async () => {
  try {
    const res = await httpRequest(`${OLLAMA_BASE}/api/tags`, { timeout: 3000 });

    if (!res.ok) return false;

    const data = await res.json();

    return Array.isArray(data.models); // ✅ THIS FIXES YOUR ISSUE

  } catch (err) {
    console.log("OLLAMA ERROR:", err.message);
    return false;
  }
};

// ── List installed models ─────────────────────────────────────────────────
const listModels = async () => {
  try {
    const res = await httpRequest(`${OLLAMA_BASE}/api/tags`);
    const data = await res.json();
    return (data.models || []).map((m) => ({ name: m.name, size: m.size, modified: m.modified_at }));
  } catch {
    return [];
  }
};

// ── Non-streaming chat ────────────────────────────────────────────────────
const chat = async (systemPrompt, userMessage, conversationHistory = [], model = DEFAULT_MODEL) => {
  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory,
    { role: 'user', content: userMessage },
  ];

  let res;
  try {
    res = await httpRequest(`${OLLAMA_BASE}/api/chat`, {
      method: 'POST',
      body: JSON.stringify({ model, messages, stream: false, options: { temperature: 0.7, num_predict: 900 } }),
      timeout: 120000,
    });
  } catch (err) {
    throw new Error(
      `Cannot connect to Ollama at ${OLLAMA_BASE}.\n` +
      `Make sure Ollama is installed and running.\n` +
      `Run: ollama serve  (keep that terminal open)\n` +
      `Then: ollama pull ${model}`
    );
  }

  if (!res.ok) {
    const body = res.text ? await res.text() : '';
    if (typeof body === 'string' && body.includes('not found')) {
      throw new Error(`Model "${model}" is not downloaded. Run: ollama pull ${model}`);
    }
    throw new Error(`Ollama responded with status ${res.status}`);
  }

  const data = await res.json();
  return data.message?.content || '';
};

// ── Streaming chat (SSE) ──────────────────────────────────────────────────
const chatStream = async (systemPrompt, userMessage, conversationHistory = [], model = DEFAULT_MODEL, onChunk) => {
  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory,
    { role: 'user', content: userMessage },
  ];

  return httpStream(`${OLLAMA_BASE}/api/chat`, { model, messages, stream: true }, onChunk);
};

// ── Smart router: Ollama first, cloud fallback ────────────────────────────
const smartChat = async (systemPrompt, userMessage, conversationHistory = []) => {
  const provider = process.env.AI_PROVIDER || 'openai';
  if (provider === 'ollama') {
    return chat(systemPrompt, userMessage, conversationHistory);
  }
  const { callAI } = require('./aiService');
  return callAI(systemPrompt, userMessage, conversationHistory);
};

// ── Pull model (streaming progress) ──────────────────────────────────────
const pullModel = async (modelName, onProgress) => {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(`${OLLAMA_BASE}/api/pull`);
    const req = http.request({
      hostname: urlObj.hostname,
      port: urlObj.port || 11434,
      path: urlObj.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, (res) => {
      let lastStatus = '';
      res.on('data', (chunk) => {
        const lines = chunk.toString().split('\n').filter(Boolean);
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.status !== lastStatus) {
              lastStatus = parsed.status;
              if (onProgress) onProgress(parsed);
            }
          } catch { /* ignore */ }
        }
      });
      res.on('end', resolve);
    });
    req.on('error', reject);
    req.write(JSON.stringify({ name: modelName, stream: true }));
    req.end();
  });
};

module.exports = { chat, chatStream, smartChat, isOllamaAvailable, listModels, pullModel };
