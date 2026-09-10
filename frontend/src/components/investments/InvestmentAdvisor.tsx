'use client';
import { useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/utils';
import { Brain, Scale, Lightbulb, ShieldAlert, Loader2, RefreshCw, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tab = 'analyze' | 'rebalance' | 'tips' | 'risk';
const TABS: { id: Tab; label: string; icon: React.ElementType; endpoint: string; desc: string }[] = [
  { id: 'analyze',   label: 'Portfolio review', icon: Brain,       endpoint: '/ai/invest/analyze',   desc: 'Overall health, gaps & top 3 improvement actions' },
  { id: 'rebalance', label: 'Rebalance plan',   icon: Scale,       endpoint: '/ai/invest/rebalance', desc: 'Target allocation and what to buy/sell/hold' },
  { id: 'tips',      label: 'Investment tips',  icon: Lightbulb,   endpoint: '/ai/invest/tips',      desc: '5 specific tips for your current holdings' },
  { id: 'risk',      label: 'Risk assessment',  icon: ShieldAlert, endpoint: '/ai/invest/risk',      desc: 'Risk score, volatility breakdown & hedging ideas' },
];

function MarkdownContent({ text }: { text: string }) {
  return (
    <div className="space-y-1.5 text-sm text-gray-700 leading-relaxed">
      {text.split('\n').map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />;
        if (line.startsWith('## ') || line.startsWith('### ')) return <p key={i} className="font-semibold text-gray-900 mt-3 first:mt-0" dangerouslySetInnerHTML={{ __html: line.replace(/^#+\s/, '') }} />;
        const num = line.match(/^(\d+)\.\s+(.+)/);
        if (num) return (
          <div key={i} className="flex gap-2.5">
            <span className="w-5 h-5 bg-brand-100 text-brand-700 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{num[1]}</span>
            <span dangerouslySetInnerHTML={{ __html: num[2].replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />
          </div>
        );
        if (line.startsWith('- ') || line.startsWith('• ')) return (
          <div key={i} className="flex gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-2 flex-shrink-0" />
            <span dangerouslySetInnerHTML={{ __html: line.slice(2).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />
          </div>
        );
        return <p key={i} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />;
      })}
    </div>
  );
}

export default function InvestmentAdvisor() {
  const [active, setActive] = useState<Tab>('analyze');
  const [results, setResults] = useState<Partial<Record<Tab, string>>>({});
  const [loading, setLoading] = useState<Partial<Record<Tab, boolean>>>({});

  const generate = async (tab: Tab) => {
    const endpoint = TABS.find(t => t.id === tab)!.endpoint;
    setLoading(l => ({ ...l, [tab]: true }));
    try {
      const { data } = await api.post(endpoint);
      const result = data.data.analysis || data.data.plan || data.data.tips || data.data.risk;
      setResults(r => ({ ...r, [tab]: result }));
      setActive(tab);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(l => ({ ...l, [tab]: false })); }
  };

  const cur = TABS.find(t => t.id === active)!;

  return (
    <div className="space-y-5">
      {/* Tab grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = active === tab.id;
          const isLoading = loading[tab.id];
          const hasResult = !!results[tab.id];
          return (
            <button key={tab.id} onClick={() => hasResult ? setActive(tab.id) : generate(tab.id)} disabled={!!isLoading}
              className={cn('card p-4 text-left transition-all hover:shadow-md group', isActive ? 'ring-2 ring-brand-500 shadow-md' : 'hover:ring-1 hover:ring-gray-200')}>
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-2.5', isActive ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-brand-50 group-hover:text-brand-600')}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
              </div>
              <p className="font-medium text-gray-900 text-sm leading-tight">{tab.label}</p>
              <p className="text-xs text-gray-400 mt-1 leading-tight">{tab.desc}</p>
              <div className="mt-2.5 text-xs font-medium">
                {isLoading ? <span className="text-brand-500">Generating…</span>
                  : hasResult ? <span className="text-brand-600 flex items-center gap-1">View result <ChevronRight size={10} /></span>
                  : <span className="text-gray-400 group-hover:text-brand-500 transition">Click to generate</span>}
              </div>
            </button>
          );
        })}
      </div>

      {/* Result panel */}
      <div className="card p-5 min-h-[260px]">
        {loading[active] ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center">
              <Brain className="w-6 h-6 text-brand-400" />
            </div>
            <p className="font-medium text-gray-600 text-sm">Analyzing your portfolio…</p>
            <div className="flex gap-1">
              {[0, 1, 2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-brand-300 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
            </div>
          </div>
        ) : results[active] ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <cur.icon className="w-4 h-4 text-brand-600" />
                <span className="font-semibold text-gray-900 text-sm">{cur.label}</span>
                <span className="badge bg-brand-50 text-brand-700 text-xs">AI</span>
              </div>
              <button onClick={() => generate(active)} disabled={!!loading[active]} className="btn-ghost flex items-center gap-1.5 text-xs py-1.5 px-2.5">
                <RefreshCw size={12} /> Regenerate
              </button>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <MarkdownContent text={results[active]!} />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <Brain className="w-10 h-10 text-gray-200 mb-3" />
            <p className="font-medium text-gray-400 text-sm">Select an analysis type above</p>
            <p className="text-xs text-gray-300 mt-1">AI will analyze your portfolio and give personalized advice</p>
            <button onClick={() => generate('analyze')} className="btn-primary mt-4 text-sm flex items-center gap-2">
              <Brain size={14} /> Analyze my portfolio
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
