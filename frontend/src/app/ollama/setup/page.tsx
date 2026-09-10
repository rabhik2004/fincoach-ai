'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import api from '@/lib/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { cn } from '@/lib/utils';
import { Cpu, CheckCircle, Download, Play, RefreshCw, ExternalLink, Lock, Zap, DollarSign } from 'lucide-react';
import Link from 'next/link';

interface Model { name: string; size: number }
interface OllamaStatus {
  available: boolean;
  activeModel: string;
  models: Model[];
  recommended: string[];
}

const RECOMMENDED_MODELS = [
  { name: 'llama3.2',       size: '2.0 GB', speed: '⚡ Fast',    desc: 'Best overall. Great at finance Q&A.',   default: true },
  { name: 'mistral',        size: '4.1 GB', speed: '🔥 Good',    desc: 'Excellent reasoning and analysis.' },
  { name: 'gemma3',         size: '3.3 GB', speed: '⚡ Fast',    desc: 'Google\'s model — very capable.' },
  { name: 'phi4',           size: '8.9 GB', speed: '🧠 Smart',   desc: 'Microsoft\'s model — deep reasoning.' },
  { name: 'deepseek-r1:7b', size: '4.7 GB', speed: '🧠 Smart',   desc: 'Excellent for financial analysis.' },
];

export default function OllamaSetupPage() {
  const { user } = useRequireAuth();
  const [status, setStatus] = useState<OllamaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [pulling, setPulling] = useState<string | null>(null);
  const [pullProgress, setPullProgress] = useState('');

  const checkStatus = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/ollama/status');
      setStatus(data.data);
    } catch { setStatus(null); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (user) checkStatus(); }, [user]);

  const pullModel = async (model: string) => {
    setPulling(model);
    setPullProgress('Connecting...');
    try {
      const token = localStorage.getItem('fc_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ollama/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
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
            const p = JSON.parse(line.slice(5));
            if (p.status === 'complete') { setPullProgress(''); setPulling(null); await checkStatus(); return; }
            if (p.completed && p.total) {
              const pct = Math.round((p.completed / p.total) * 100);
              setPullProgress(`${p.status} ${pct}%`);
            } else {
              setPullProgress(p.status || 'Downloading...');
            }
          } catch { /* ignore */ }
        }
      }
    } catch { setPullProgress('Failed'); }
    finally { setPulling(null); setPullProgress(''); }
  };

  if (!user) return null;

  const isInstalled = (name: string) => status?.models?.some((m) => m.name === name || m.name.startsWith(name));

  return (
    <AppShell>
      <div className="max-w-2xl animate-fade-in">
        <div className="page-header">
          <h1 className="page-title flex items-center gap-2">
            <Cpu size={22} className="text-purple-600" /> Local AI setup
          </h1>
          <p className="page-subtitle">Run AI 100% on your device — free, private, no API costs</p>
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { icon: Lock, label: '100% private', desc: 'Data never leaves your device', color: 'bg-green-50 text-green-600' },
            { icon: DollarSign, label: 'Zero cost', desc: 'No API keys, no billing', color: 'bg-blue-50 text-blue-600' },
            { icon: Zap, label: 'Fast responses', desc: 'No network latency', color: 'bg-amber-50 text-amber-600' },
          ].map(({ icon: Icon, label, desc, color }) => (
            <div key={label} className="card p-4 text-center">
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-2', color)}><Icon size={16} /></div>
              <p className="text-sm font-semibold text-gray-900">{label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
            </div>
          ))}
        </div>

        {/* Step 1: Install Ollama */}
        <div className="card p-6 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold', status?.available ? 'bg-green-500' : 'bg-gray-300')}>
              {status?.available ? <CheckCircle size={16} /> : '1'}
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Install Ollama</h2>
              <p className="text-xs text-gray-400">Download and start the local AI server</p>
            </div>
            {status?.available && <span className="ml-auto badge bg-green-50 text-green-700">Running ✓</span>}
          </div>

          {!status?.available ? (
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-xl p-4 font-mono text-sm space-y-2">
                <p className="text-gray-400 text-xs">Step 1: Download from ollama.com</p>
                <p className="text-gray-400 text-xs mt-2">Step 2: Start the server</p>
                <p className="font-semibold text-gray-900">ollama serve</p>
              </div>
              <div className="flex gap-3">
                <a href="https://ollama.com/download" target="_blank" rel="noopener noreferrer"
                  className="btn-primary flex items-center gap-2 flex-1 justify-center text-sm">
                  <Download size={14} /> Download Ollama <ExternalLink size={11} />
                </a>
                <button onClick={checkStatus} disabled={loading} className="btn-secondary flex items-center gap-2 text-sm">
                  <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Check
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-green-700 bg-green-50 rounded-xl px-4 py-2">
              Ollama is running at {status ? 'http://localhost:11434' : '...'}
            </p>
          )}
        </div>

        {/* Step 2: Pull a model */}
        <div className="card p-6 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold',
              status?.models?.length ? 'bg-green-500' : status?.available ? 'bg-brand-600' : 'bg-gray-200'
            )}>
              {status?.models?.length ? <CheckCircle size={16} /> : '2'}
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Download a model</h2>
              <p className="text-xs text-gray-400">Pick one — llama3.2 is the best starting point</p>
            </div>
            {status?.models?.length ? (
              <span className="ml-auto badge bg-green-50 text-green-700">{status.models.length} installed ✓</span>
            ) : null}
          </div>

          <div className="space-y-2">
            {RECOMMENDED_MODELS.map((m) => {
              const installed = isInstalled(m.name);
              const isPulling = pulling === m.name;
              return (
                <div key={m.name} className={cn('flex items-center gap-3 p-3 rounded-xl border transition',
                  installed ? 'border-green-200 bg-green-50' : 'border-gray-100 hover:border-gray-200 bg-gray-50'
                )}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-gray-900">{m.name}</span>
                      {m.default && <span className="badge bg-brand-50 text-brand-700 text-[10px]">Recommended</span>}
                      <span className="text-xs text-gray-400">{m.speed}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{m.desc} · {m.size}</p>
                    {isPulling && pullProgress && (
                      <p className="text-xs text-purple-600 font-medium mt-1">{pullProgress}</p>
                    )}
                  </div>
                  {installed ? (
                    <CheckCircle size={18} className="text-green-500 flex-shrink-0" />
                  ) : (
                    <button
                      onClick={() => pullModel(m.name)}
                      disabled={!status?.available || !!pulling}
                      className={cn('flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition flex-shrink-0',
                        status?.available && !pulling
                          ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      )}
                    >
                      {isPulling ? <RefreshCw size={11} className="animate-spin" /> : <Download size={11} />}
                      {isPulling ? 'Pulling...' : 'Pull'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 3: Use it */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold',
              status?.available && status?.models?.length ? 'bg-brand-600' : 'bg-gray-200'
            )}>3</div>
            <div>
              <h2 className="font-semibold text-gray-900">Start chatting</h2>
              <p className="text-xs text-gray-400">Your private AI financial advisor is ready</p>
            </div>
          </div>

          <Link
            href="/ollama"
            className={cn('flex items-center justify-center gap-2 w-full py-3 rounded-xl font-medium text-sm transition',
              status?.available && status?.models?.length
                ? 'bg-purple-600 text-white hover:bg-purple-700'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed pointer-events-none'
            )}
          >
            <Play size={16} /> Open Local AI chat
          </Link>

          {(!status?.available || !status?.models?.length) && (
            <p className="text-xs text-gray-400 text-center mt-2">
              Complete steps 1 and 2 first
            </p>
          )}
        </div>

        {/* Also set AI_PROVIDER tip */}
        <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-4">
          <p className="text-sm font-medium text-blue-800 mb-1">Use Ollama as default AI</p>
          <p className="text-xs text-blue-600">Set in your backend <code className="bg-blue-100 rounded px-1">AI_PROVIDER=ollama</code> to use local AI for all features — advisor, chat, insights.</p>
        </div>
      </div>
    </AppShell>
  );
}
