'use client';
import { useState, useRef, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { getErrorMessage, formatCurrency } from '@/lib/utils';
import { MessageCircle, Send, Loader2, Bot, User, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const SUGGESTED = [
  'How can I reduce my food spending?',
  'Am I on track with my budget?',
  'Give me a savings plan for next month',
  "What's my biggest spending category?",
  'How much should I save each month?',
  'Explain the 50/30/20 rule for my income'
];

// Simple markdown renderer for chat
function ChatMessage({ content }: { content: string }) {
  const parts = content.split(/(\*\*.*?\*\*|`.*?`|\n)/g);
  return (
    <div className="chat-prose text-sm leading-relaxed space-y-1">
      {content.split('\n').map((line, i) => {
        if (!line) return <br key={i} />;
        const numMatch = line.match(/^(\d+)\.\s+(.+)/);
        if (numMatch) {
          return (
            <div key={i} className="flex gap-2 items-start">
              <span className="font-semibold text-xs mt-0.5 min-w-[18px]">{numMatch[1]}.</span>
              <span dangerouslySetInnerHTML={{ __html: line.slice(numMatch[1].length + 2).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />
            </div>
          );
        }
        if (line.startsWith('- ') || line.startsWith('• ')) {
          return (
            <div key={i} className="flex gap-2 items-start">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-current flex-shrink-0 opacity-50" />
              <span dangerouslySetInnerHTML={{ __html: line.slice(2).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />
            </div>
          );
        }
        if (line.startsWith('## ') || line.startsWith('### ')) {
          return <p key={i} className="font-semibold mt-2" dangerouslySetInnerHTML={{ __html: line.replace(/^#+\s/, '') }} />;
        }
        return (
          <p key={i} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`(.+?)`/g, '<code class="bg-black/10 rounded px-1 text-xs font-mono">$1</code>') }} />
        );
      })}
    </div>
  );
}

export default function ChatPage() {
  const { user } = useRequireAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    const msg = text.trim();
    if (!msg || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: msg,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const { data } = await api.post('/ai/chat', {
        message: msg,
        sessionId,
      });
      const aiMsg: Message = {
        id: Date.now().toString() + '_ai',
        role: 'assistant',
        content: data.data.reply,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
      if (data.data.sessionId) setSessionId(data.data.sessionId);
    } catch (err) {
      toast.error(getErrorMessage(err));
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
      setInput(msg);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  if (!user) return null;

  const isEmpty = messages.length === 0;

  return (
    <AppShell>
      <div className="animate-fade-in flex flex-col h-[calc(100vh-8rem)] lg:h-[calc(100vh-4rem)]">
        {/* Header */}
        <div className="page-header flex-shrink-0 pb-4 border-b border-gray-100 mb-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-brand-600" />
              </div>
              <div>
                <h1 className="page-title">Finance Chatbot</h1>
                <p className="page-subtitle">Ask anything about your finances</p>
              </div>
            </div>
            {messages.length > 0 && (
              <button
                onClick={() => { setMessages([]); setSessionId(null); }}
                className="btn-ghost text-sm py-1.5 px-3"
              >
                New chat
              </button>
            )}
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto py-6 space-y-6">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4 pb-16">
              <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mb-4">
                <Bot className="w-8 h-8 text-brand-500" />
              </div>
              <h2 className="font-semibold text-gray-900 text-lg mb-1">
                Hi {user.name.split(' ')[0]}! 👋
              </h2>
              <p className="text-gray-400 text-sm max-w-sm mb-6">
                I'm your AI financial advisor. Ask me anything about your spending, budgets, or saving strategies.
              </p>

              {/* Context pill */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full text-xs text-gray-500 mb-8">
                <Sparkles size={12} className="text-brand-500" />
                I can see your expense data to give personalized advice
              </div>

              {/* Suggested questions */}
              <div className="w-full max-w-lg">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Suggested questions</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SUGGESTED.map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="text-left text-sm px-4 py-3 bg-white border border-gray-100 rounded-xl hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 transition text-gray-600 shadow-sm"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-4 px-1">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    'flex gap-3 animate-slide-up',
                    msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  )}
                >
                  {/* Avatar */}
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1',
                    msg.role === 'user'
                      ? 'bg-brand-600 text-white'
                      : 'bg-gray-100 text-gray-600'
                  )}>
                    {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                  </div>

                  {/* Bubble */}
                  <div className={cn(
                    'max-w-[85%] rounded-2xl px-4 py-3',
                    msg.role === 'user'
                      ? 'bg-brand-600 text-white rounded-tr-sm'
                      : 'bg-white border border-gray-100 shadow-sm rounded-tl-sm'
                  )}>
                    {msg.role === 'user' ? (
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                    ) : (
                      <ChatMessage content={msg.content} />
                    )}
                    <p className={cn(
                      'text-xs mt-1.5',
                      msg.role === 'user' ? 'text-brand-200 text-right' : 'text-gray-300'
                    )}>
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {loading && (
                <div className="flex gap-3 items-start animate-slide-up">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Bot size={14} className="text-gray-600" />
                  </div>
                  <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex gap-1 items-center h-4">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className="flex-shrink-0 pt-4 border-t border-gray-100">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-3 items-end bg-white border border-gray-200 rounded-2xl p-2 shadow-sm focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100 transition-all">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your finances... (Enter to send)"
                className="flex-1 resize-none text-sm outline-none px-2 py-1.5 max-h-32 min-h-[40px] text-gray-800 placeholder-gray-400 bg-transparent"
                rows={1}
                disabled={loading}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                className={cn(
                  'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all',
                  input.trim() && !loading
                    ? 'bg-brand-600 text-white hover:bg-brand-700 active:scale-95'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                )}
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
              </button>
            </div>
            <p className="text-center text-xs text-gray-300 mt-2">
              AI responses are for informational purposes only — not financial advice
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
