'use client';
import { useState, useEffect, useRef } from 'react';
import AppShell from '@/components/layout/AppShell';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import {
  Bot, Send, Loader2, Cpu, CheckCircle, XCircle,
  ChevronDown, Download, Zap, Lock, User, RefreshCw,
} from 'lucide-react';

interface OllamaStatus {
  available: boolean;
  activeModel: string;
  models: { name: string; size: number }[];
  recommended: string[];
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  local: boolean;
  model?: string;
  timestamp: Date;
}

const SUGGESTED = [
  'Analyze my spending habits this month',
  'Should I start a SIP? How much?',
  'Explain the 50/30/20 budget rule for my income',
  'What\'s the difference between ELSS and PPF?',
  'How can I reduce my food expenses?',
  'Give me a 6-month savings plan',
];

function ChatMessage({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';
  return (
    <div className={cn('flex gap-3 animate-slide-up', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1',
        isUser ? 'bg-brand-600 text-white' : 'bg-purple-100 text-purple-600'
      )}>
        {isUser ? <User size={14} /> : <Cpu size={14} />}
      </div>
      <div className={cn('max-w-[85%] rounded-2xl px-4 py-3',
        isUser ? 'bg-brand-600 text-white rounded-tr-sm' : 'bg-white border border-gray-100 shadow-sm rounded-tl-sm'
      )}>
        <div className={cn('text-sm leading-relaxed', isUser ? '' : 'text-gray-800')}>
          {msg.content.split('\n').map((line, i) => {
            if (!line) return <br key={i} />;
            if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="font-semibold">{line.slice(2, -2)}</p>;
            if (line.startsWith('- ')) return <div key={i} className="flex gap-2"><span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-current flex-shrink-0 opacity-50" /><span>{line.slice(2)}</span></div>;
            const numMatch = line.match(/^(\d+)\.\s(.+)/);
            if (numMatch) return <div key={i} className="flex gap-2"><span className="font-bold text-xs min-w-[16px]">{numMatch[1]}.</span><span>{numMatch[2]}</span></div>;
            return <p key={i}>{line}</p>;
          })}
        </div>
        <div className={cn('flex items-center gap-2 mt-1.5',
          isUser ? 'text-brand-200' : 'text-gray-300'
        )}>
          <span className="text-[10px]">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          {!isUser && msg.local && (
            <span className="flex items-center gap-0.5 text-[10px] text-purple-400">
              <Lock size={9} /> local · {msg.model}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OllamaChatPage() {
  const { user } = useRequireAuth();
  const [status, setStatus] = useState<OllamaStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('llama3.2');
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [pullingModel, setPullingModel] = useState('');
  const [pullProgress, setPullProgress] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    api.get('/ollama/status').then(({ data }) => {
      setStatus(data.data);
      if (data.data.models?.length > 0) {
        setSelectedModel(data.data.activeModel || data.data.models[0].name);
      }
    }).catch(() => {}).finally(() => setStatusLoading(false));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    const msg = text.trim();
    if (!msg || loading) return;
    setInput('');
    setLoading(true);

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: msg, local: false, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const { data } = await api.post('/ollama/chat', { message: msg, model: selectedModel });
      const aiMsg: Message = {
        id: Date.now().toString() + '_ai',
        role: 'assistant',
        content: data.data.reply,
        local: data.data.local,
        model: data.data.model,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to get response';
      toast.error(errorMsg);
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
      setInput(msg);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const pullModel = async (model: string) => {
    setPullingModel(model);
    setPullProgress('Starting download...');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ollama/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('fc_token')}`,
        },
        body: JSON.stringify({ model }),
      });
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split('\n').filter((l) => l.startsWith('data:'));
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line.slice(5));
            if (parsed.status === 'complete') {
              setPullProgress('');
              setPullingModel('');
              toast.success(`${model} downloaded!`);
              const { data } = await api.get('/ollama/status');
              setStatus(data.data);
              return;
            }
            setPullProgress(parsed.status || 'Downloading...');
          } catch { /* ignore */ }
        }
      }
    } catch {
      toast.error('Failed to pull model');
    } finally {
      setPullingModel('');
      setPullProgress('');
    }
  };

  if (!user) return null;

  const isEmpty = messages.length === 0;

  return (
    <AppShell>
      <div className="flex flex-col h-[calc(100vh-8rem)] lg:h-[calc(100vh-4rem)] animate-fade-in">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
              <Cpu className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900">Local AI chat</h1>
              <div className="flex items-center gap-2">
                <span className={cn('w-1.5 h-1.5 rounded-full', status?.available ? 'bg-green-500' : 'bg-red-400')} />
                <span className="text-xs text-gray-400">
                  {statusLoading ? 'Checking...' : status?.available ? 'Ollama running' : 'Ollama offline'}
                </span>
              </div>
            </div>
          </div>

          {/* Model picker */}
          <div className="relative">
            <button
              onClick={() => setShowModelPicker(!showModelPicker)}
              className="flex items-center gap-2 px-3 py-2 bg-purple-50 border border-purple-100 rounded-xl text-sm font-medium text-purple-700 hover:bg-purple-100 transition"
            >
              <Cpu size={14} /> {selectedModel} <ChevronDown size={12} />
            </button>
            {showModelPicker && (
              <div className="absolute right-0 top-full mt-1 w-72 bg-white border border-gray-100 rounded-2xl shadow-xl z-20 p-3 animate-slide-up">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">Installed models</p>
                {status?.models?.length ? (
                  <div className="space-y-1 mb-3">
                    {status.models.map((m) => (
                      <button
                        key={m.name}
                        onClick={() => { setSelectedModel(m.name); setShowModelPicker(false); }}
                        className={cn('w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition',
                          selectedModel === m.name ? 'bg-purple-50 text-purple-700' : 'hover:bg-gray-50 text-gray-700'
                        )}
                      >
                        <span className="font-medium">{m.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">{(m.size / 1e9).toFixed(1)}GB</span>
                          {selectedModel === m.name && <CheckCircle size={14} className="text-purple-600" />}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 px-1 mb-3">No models installed</p>
                )}
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">Download a model</p>
                <div className="space-y-1">
                  {(status?.recommended || ['llama3.2', 'mistral', 'gemma3', 'phi4']).filter(
                    (r) => !status?.models?.find((m) => m.name === r)
                  ).slice(0, 4).map((rec) => (
                    <button
                      key={rec}
                      onClick={() => { pullModel(rec); setShowModelPicker(false); }}
                      disabled={pullingModel === rec}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm hover:bg-gray-50 transition"
                    >
                      <span className="text-gray-600 font-medium">{rec}</span>
                      {pullingModel === rec ? (
                        <Loader2 size={13} className="animate-spin text-purple-500" />
                      ) : (
                        <div className="flex items-center gap-1 text-purple-500 text-xs font-medium">
                          <Download size={11} /> Pull
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pull progress */}
        {pullingModel && pullProgress && (
          <div className="flex-shrink-0 mb-3 px-4 py-2 bg-purple-50 border border-purple-100 rounded-xl flex items-center gap-2">
            <Loader2 size={14} className="animate-spin text-purple-500 flex-shrink-0" />
            <span className="text-sm text-purple-700 truncate">Pulling {pullingModel}: {pullProgress}</span>
          </div>
        )}

        {/* Offline state */}
        {!statusLoading && !status?.available && (
          <div className="flex-shrink-0 mb-4 card p-5 border-orange-200 bg-orange-50">
            <div className="flex items-start gap-3">
              <XCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-orange-800">Ollama is not running</p>
                <p className="text-sm text-orange-600 mt-1">Install and start Ollama to use local AI — 100% private, no API costs.</p>
                <div className="mt-3 bg-orange-100 rounded-lg p-3 font-mono text-xs text-orange-800 space-y-1">
                  <p># 1. Install from ollama.com/download</p>
                  <p># 2. Open terminal and run:</p>
                  <p className="font-bold">ollama serve</p>
                  <p># 3. Pull a model:</p>
                  <p className="font-bold">ollama pull llama3.2</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4 pb-16">
              <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mb-4">
                <Cpu className="w-8 h-8 text-purple-500" />
              </div>
              <h2 className="font-semibold text-gray-900 text-lg mb-1">Local AI, zero cloud 🔒</h2>
              <p className="text-gray-400 text-sm max-w-sm mb-2">
                Your conversations never leave your machine. Powered by Ollama + {selectedModel}.
              </p>
              <div className="flex items-center gap-3 mb-6 text-xs text-gray-400">
                <span className="flex items-center gap-1"><Lock size={10} /> 100% private</span>
                <span>·</span>
                <span className="flex items-center gap-1"><Zap size={10} /> No API costs</span>
                <span>·</span>
                <span className="flex items-center gap-1"><Cpu size={10} /> Runs locally</span>
              </div>
              <div className="w-full max-w-lg">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Try asking</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SUGGESTED.map((q) => (
                    <button key={q} onClick={() => sendMessage(q)}
                      className="text-left text-sm px-4 py-3 bg-white border border-gray-100 rounded-xl hover:border-purple-200 hover:bg-purple-50 hover:text-purple-700 transition text-gray-600 shadow-sm"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-4 px-1">
              {messages.map((msg) => <ChatMessage key={msg.id} msg={msg} />)}
              {loading && (
                <div className="flex gap-3 items-start animate-slide-up">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <Cpu size={14} className="text-purple-600" />
                  </div>
                  <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        {[0,1,2].map((i) => <div key={i} className="w-1.5 h-1.5 rounded-full bg-purple-300 animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}
                      </div>
                      <span className="text-xs text-gray-400">{selectedModel} is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="flex-shrink-0 pt-4 border-t border-gray-100">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-3 items-end bg-white border border-gray-200 rounded-2xl p-2 shadow-sm focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-100 transition-all">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
                placeholder={status?.available ? `Ask ${selectedModel} anything... (Enter to send)` : 'Start Ollama to chat locally...'}
                className="flex-1 resize-none text-sm outline-none px-2 py-1.5 max-h-32 min-h-[40px] text-gray-800 placeholder-gray-400 bg-transparent"
                rows={1}
                disabled={loading || !status?.available}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading || !status?.available}
                className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all',
                  input.trim() && !loading && status?.available
                    ? 'bg-purple-600 text-white hover:bg-purple-700 active:scale-95'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                )}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
            <p className="text-center text-xs text-gray-300 mt-2">
              {status?.available ? `Running locally · ${selectedModel} · no data leaves your device` : 'Start Ollama: ollama serve'}
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
