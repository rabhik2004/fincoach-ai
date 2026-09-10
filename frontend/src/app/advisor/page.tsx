'use client';
import { useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/utils';
import {
  Brain, Lightbulb, PiggyBank, TrendingUp,
  Loader2, RefreshCw, Sparkles, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type TabId = 'analysis' | 'tips' | 'budget';

const TABS: { id: TabId; label: string; icon: React.ElementType; endpoint: string; description: string }[] = [
  {
    id: 'analysis',
    label: 'Full analysis',
    icon: TrendingUp,
    endpoint: '/ai/analyze',
    description: 'Comprehensive review of your spending habits with personalized recommendations',
  },
  {
    id: 'tips',
    label: 'Saving tips',
    icon: Lightbulb,
    endpoint: '/ai/tips',
    description: '5 specific, actionable tips based on your highest spending categories',
  },
  {
    id: 'budget',
    label: 'Budget plan',
    icon: PiggyBank,
    endpoint: '/ai/budget-plan',
    description: 'A personalized monthly budget plan using your actual spending data',
  },
];

// Simple markdown → JSX renderer
function MarkdownContent({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-2 text-sm text-gray-700 leading-relaxed">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />;

        // Bold headers (### or **)
        if (line.startsWith('### ')) {
          return <h3 key={i} className="font-semibold text-gray-900 text-base mt-4 first:mt-0">{line.slice(4)}</h3>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={i} className="font-bold text-gray-900 text-lg mt-4 first:mt-0">{line.slice(3)}</h2>;
        }
        if (line.startsWith('# ')) {
          return <h1 key={i} className="font-bold text-gray-900 text-xl mt-4 first:mt-0">{line.slice(2)}</h1>;
        }

        // Numbered list
        const numMatch = line.match(/^(\d+)\.\s+(.+)/);
        if (numMatch) {
          return (
            <div key={i} className="flex gap-3">
              <span className="w-5 h-5 bg-brand-100 text-brand-700 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                {numMatch[1]}
              </span>
              <span dangerouslySetInnerHTML={{ __html: parseBold(numMatch[2]) }} />
            </div>
          );
        }

        // Bullet list
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return (
            <div key={i} className="flex gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-2 flex-shrink-0" />
              <span dangerouslySetInnerHTML={{ __html: parseBold(line.slice(2)) }} />
            </div>
          );
        }

        return (
          <p key={i} dangerouslySetInnerHTML={{ __html: parseBold(line) }} />
        );
      })}
    </div>
  );
}

function parseBold(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>');
}

export default function AdvisorPage() {
  const { user } = useRequireAuth();
  const [activeTab, setActiveTab] = useState<TabId>('analysis');
  const [results, setResults] = useState<Record<TabId, string>>({
    analysis: '', tips: '', budget: '',
  });
  const [loading, setLoading] = useState<Record<TabId, boolean>>({
    analysis: false, tips: false, budget: false,
  });
  const [aiError, setAiError] = useState<string | null>(null);

  const generate = async (tab: TabId) => {
    const endpoint = TABS.find((t) => t.id === tab)!.endpoint;
    setLoading((l) => ({ ...l, [tab]: true }));
    setAiError(null);
    try {
      const { data } = await api.post(endpoint);
      const result =
        tab === 'analysis' ? data.data.analysis :
        tab === 'tips' ? data.data.tips :
        data.data.plan;
      setResults((r) => ({ ...r, [tab]: result }));
      setActiveTab(tab);
    } catch (err: any) {
      const errData = err.response?.data;
      if (errData?.provider === 'ollama') {
        setAiError('ollama');
      } else if (errData?.provider === 'openai') {
        setAiError('openai');
      } else {
        toast.error(errData?.error || errData?.detail || getErrorMessage(err));
      }
    } finally {
      setLoading((l) => ({ ...l, [tab]: false }));
    }
  };

  if (!user) return null;

  const currentTab = TABS.find((t) => t.id === activeTab)!;

  return (
    <AppShell>
      <div className="animate-fade-in">
        {/* Header */}
        <div className="page-header">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center">
              <Brain className="w-5 h-5 text-brand-600" />
            </div>
            <h1 className="page-title">AI Financial Advisor</h1>
          </div>
          <p className="page-subtitle ml-13">
            Personalized insights powered by AI, based on your actual spending data
          </p>
        </div>

        {/* Tab cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isLoading = loading[tab.id];
            const hasResult = !!results[tab.id];

            return (
              <button
                key={tab.id}
                onClick={() => hasResult ? setActiveTab(tab.id) : generate(tab.id)}
                disabled={isLoading}
                className={cn(
                  'card p-5 text-left transition-all duration-200 hover:shadow-md group',
                  isActive ? 'ring-2 ring-brand-500 shadow-md' : 'hover:ring-1 hover:ring-gray-200'
                )}
              >
                <div className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center mb-3',
                  isActive ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-brand-50 group-hover:text-brand-600'
                )}>
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Icon className="w-5 h-5" />}
                </div>
                <p className="font-semibold text-gray-900 mb-1">{tab.label}</p>
                <p className="text-xs text-gray-400 leading-relaxed">{tab.description}</p>
                <div className="mt-3 flex items-center gap-1 text-xs font-medium">
                  {isLoading ? (
                    <span className="text-brand-500">Generating...</span>
                  ) : hasResult ? (
                    <span className="text-brand-600 flex items-center gap-1">
                      View result <ChevronRight size={12} />
                    </span>
                  ) : (
                    <span className="text-gray-400 flex items-center gap-1 group-hover:text-brand-500 transition">
                      <Sparkles size={12} /> Generate
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Result panel */}
        {/* AI provider error banner */}
        {aiError === 'ollama' && (
          <div className="mb-4 border border-orange-200 bg-orange-50 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <span className="text-orange-500 text-xl flex-shrink-0">⚠️</span>
              <div className="flex-1">
                <p className="font-semibold text-orange-800 mb-1">Ollama is not running</p>
                <p className="text-sm text-orange-600 mb-3">
                  You set <code className="bg-orange-100 rounded px-1">AI_PROVIDER=ollama</code> but Ollama isn't started. Run these commands in a <strong>new terminal window</strong>:
                </p>
                <div className="bg-orange-100 rounded-xl p-3 font-mono text-sm text-orange-900 space-y-1">
                  <p className="text-orange-500 text-xs"># Start Ollama server</p>
                  <p className="font-bold">ollama serve</p>
                  <p className="text-orange-500 text-xs mt-2"># In another terminal, pull a model (once)</p>
                  <p className="font-bold">ollama pull llama3.2</p>
                </div>
                <p className="text-xs text-orange-500 mt-2">
                  No Ollama? Set <code className="bg-orange-100 rounded px-1">AI_PROVIDER=openai</code> in your backend .env and add your OpenAI key.
                </p>
              </div>
            </div>
          </div>
        )}
        {aiError === 'openai' && (
          <div className="mb-4 border border-red-200 bg-red-50 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <span className="text-red-500 text-xl flex-shrink-0">🔑</span>
              <div className="flex-1">
                <p className="font-semibold text-red-800 mb-1">OpenAI API key missing</p>
                <p className="text-sm text-red-600 mb-2">Add this line to your backend <code className="bg-red-100 rounded px-1">.env</code> file:</p>
                <div className="bg-red-100 rounded-xl p-3 font-mono text-sm text-red-900">
                  <p>OPENAI_API_KEY=sk-proj-...</p>
                </div>
                <p className="text-xs text-red-500 mt-2">
                  Get a free key at <strong>platform.openai.com</strong> · Or use Ollama (free, local): set <code className="bg-red-100 rounded px-1">AI_PROVIDER=ollama</code>
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="card p-6 min-h-[300px]">
          {loading[activeTab] ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center">
                  <Brain className="w-7 h-7 text-brand-500" />
                </div>
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-brand-100 rounded-full flex items-center justify-center">
                  <Loader2 className="w-3 h-3 text-brand-600 animate-spin" />
                </div>
              </div>
              <div className="text-center">
                <p className="font-medium text-gray-700">Analyzing your finances...</p>
                <p className="text-sm text-gray-400 mt-1">This takes about 5–10 seconds</p>
              </div>
              <div className="flex gap-1 mt-2">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-brand-300 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          ) : results[activeTab] ? (
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <currentTab.icon className="w-4 h-4 text-brand-600" />
                  <h2 className="font-semibold text-gray-900">{currentTab.label}</h2>
                  <span className="badge bg-brand-50 text-brand-700">AI generated</span>
                </div>
                <button
                  onClick={() => generate(activeTab)}
                  disabled={loading[activeTab]}
                  className="btn-ghost flex items-center gap-1.5 text-sm py-1.5 px-3"
                >
                  <RefreshCw size={13} />
                  Regenerate
                </button>
              </div>
              <div className="bg-gray-50 rounded-xl p-5">
                <MarkdownContent text={results[activeTab]} />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                <Sparkles className="w-7 h-7 text-gray-300" />
              </div>
              <p className="font-medium text-gray-500">Choose an option above to get started</p>
              <p className="text-sm text-gray-300 mt-1 max-w-sm">
                Our AI will analyze your expense data and generate personalized financial advice
              </p>
              <button
                onClick={() => generate('analysis')}
                className="btn-primary mt-6 flex items-center gap-2"
              >
                <Brain size={16} />
                Analyze my finances
              </button>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
