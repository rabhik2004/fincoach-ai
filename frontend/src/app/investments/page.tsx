'use client';
import { useEffect, useState, useCallback } from 'react';
import AppShell from '@/components/layout/AppShell';
import StatCard from '@/components/ui/StatCard';
import AllocationChart from '@/components/charts/AllocationChart';
import HoldingRow from '@/components/investments/HoldingRow';
import InvestmentForm from '@/components/investments/InvestmentForm';
import UpdatePriceModal from '@/components/investments/UpdatePriceModal';
import LivePriceTicker from '@/components/investments/LivePriceTicker';
import InvestmentAdvisor from '@/components/investments/InvestmentAdvisor';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Investment, PortfolioStats } from '@/types/investment';
import { ASSET_TYPE_COLORS, INVESTMENT_TYPES, formatINR, getErrorMessage } from '@/lib/utils';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Plus, TrendingUp, TrendingDown, Wallet,
  PieChart, Filter, Search, Loader2, BarChart3, Brain, Package,
} from 'lucide-react';

type TabView = 'holdings' | 'allocation' | 'advisor';

// ─── Build byType breakdown directly from investments array ────────────────
function buildByType(investments: Investment[]) {
  const map: Record<string, { type: string; invested: number; current: number; count: number }> = {};
  for (const inv of investments) {
    const invested = (inv.quantity ?? 0) * (inv.avgBuyPrice ?? 0);
    const current  = (inv.quantity ?? 0) * (inv.currentPrice ?? 0);
    if (!map[inv.type]) map[inv.type] = { type: inv.type, invested: 0, current: 0, count: 0 };
    map[inv.type].invested += invested;
    map[inv.type].current  += current;
    map[inv.type].count    += 1;
  }
  const totalCurrent = Object.values(map).reduce((s, v) => s + v.current, 0);
  return Object.values(map).map((t) => ({
    ...t,
    invested:   parseFloat(t.invested.toFixed(2)),
    current:    parseFloat(t.current.toFixed(2)),
    allocation: totalCurrent > 0 ? parseFloat(((t.current / totalCurrent) * 100).toFixed(1)) : 0,
    return:     t.invested > 0 ? parseFloat((((t.current - t.invested) / t.invested) * 100).toFixed(2)) : 0,
  })).sort((a, b) => b.current - a.current);
}

function buildBySector(investments: Investment[]) {
  const map: Record<string, { sector: string; invested: number; current: number; count: number }> = {};
  for (const inv of investments) {
    const sector   = inv.sector || 'Other';
    const invested = (inv.quantity ?? 0) * (inv.avgBuyPrice ?? 0);
    const current  = (inv.quantity ?? 0) * (inv.currentPrice ?? 0);
    if (!map[sector]) map[sector] = { sector, invested: 0, current: 0, count: 0 };
    map[sector].invested += invested;
    map[sector].current  += current;
    map[sector].count    += 1;
  }
  const totalCurrent = Object.values(map).reduce((s, v) => s + v.current, 0);
  return Object.values(map).map((s) => ({
    ...s,
    invested:   parseFloat(s.invested.toFixed(2)),
    current:    parseFloat(s.current.toFixed(2)),
    allocation: totalCurrent > 0 ? parseFloat(((s.current / totalCurrent) * 100).toFixed(1)) : 0,
  })).sort((a, b) => b.current - a.current);
}

export default function InvestmentsPage() {
  const { user } = useRequireAuth();
  const [investments, setInvestments]   = useState<Investment[]>([]);
  const [stats, setStats]               = useState<PortfolioStats | null>(null);
  const [loading, setLoading]           = useState(true);
  const [showForm, setShowForm]         = useState(false);
  const [editInv, setEditInv]           = useState<Investment | null>(null);
  const [priceInv, setPriceInv]         = useState<Investment | null>(null);
  const [deletingId, setDeletingId]     = useState<string | null>(null);
  const [search, setSearch]             = useState('');
  const [filterType, setFilterType]     = useState('');
  const [tab, setTab]                   = useState<TabView>('holdings');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, statsRes] = await Promise.all([
        api.get('/investments'),
        api.get('/investments/stats'),
      ]);
      setInvestments(invRes.data.data);
      setStats(statsRes.data.data);
      // Refresh live prices silently in background
      api.post('/prices/portfolio-refresh').catch(() => {});
    } catch {
      toast.error('Failed to load investments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (user) load(); }, [user, load]);

  const handleSaved = (inv: Investment) => {
    setInvestments((prev) => {
      const idx = prev.findIndex((i) => i._id === inv._id);
      if (idx >= 0) { const n = [...prev]; n[idx] = inv; return n; }
      return [inv, ...prev];
    });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this investment?')) return;
    setDeletingId(id);
    try {
      await api.delete(`/investments/${id}`);
      setInvestments((prev) => prev.filter((i) => i._id !== id));
      load();
      toast.success('Investment deleted');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  };

  const handlePriceUpdated = (inv: Investment) => {
    setInvestments((prev) => prev.map((i) => i._id === inv._id ? inv : i));
    load();
  };

  // ── Compute all totals from the investments array (not from stats API) ──
  // This ensures numbers are correct even when currentPrice is 0 in DB
  const totalInvested = investments.reduce((s, inv) => s + (inv.quantity ?? 0) * (inv.avgBuyPrice ?? 0),   0);
  const totalCurrent  = investments.reduce((s, inv) => s + (inv.quantity ?? 0) * (inv.currentPrice ?? 0),  0);
  const totalReturn   = totalCurrent - totalInvested;
  const totalPct      = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;
  const isGain        = totalReturn >= 0;

  // Build chart data locally so allocation works even with 0 currentPrice in DB
  const byType   = buildByType(investments);
  const bySector = buildBySector(investments);

  // Top gainers / losers calculated locally
  const sorted     = [...investments].sort((a, b) => (b.percentReturn ?? 0) - (a.percentReturn ?? 0));
  const topGainers = sorted.filter((i) => (i.percentReturn ?? 0) > 0).slice(0, 5);
  const topLosers  = sorted.filter((i) => (i.percentReturn ?? 0) < 0).reverse().slice(0, 5);

  const filtered = investments.filter((inv) => {
    const ms = !search || inv.name.toLowerCase().includes(search.toLowerCase()) || (inv.symbol || '').toLowerCase().includes(search.toLowerCase());
    const mt = !filterType || inv.type === filterType;
    return ms && mt;
  });

  if (!user) return null;

  return (
    <AppShell>
      <div className="animate-fade-in">
        {/* Header */}
        <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="page-title flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-brand-600" /> Investments
            </h1>
            <p className="page-subtitle">Track stocks, mutual funds, ETFs, crypto & more</p>
          </div>
          <button
            onClick={() => { setEditInv(null); setShowForm(true); }}
            className="btn-primary flex items-center gap-2 self-start"
          >
            <Plus size={16} /> Add holding
          </button>
        </div>

        {/* Live price ticker */}
        <LivePriceTicker refreshInterval={3 * 60 * 1000} />

        {/* Summary cards — all values from local calculation */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Total invested"
            value={loading ? '—' : formatINR(totalInvested)}
            icon={Wallet}
            color="blue"
            loading={loading}
          />
          <StatCard
            title="Current value"
            value={loading ? '—' : formatINR(totalCurrent)}
            icon={BarChart3}
            color={isGain ? 'green' : 'red'}
            loading={loading}
          />
          <StatCard
            title="Total return"
            value={loading ? '—' : `${isGain ? '+' : ''}${formatINR(totalReturn)}`}
            subtitle={loading ? '' : `${isGain ? '+' : ''}${totalPct.toFixed(2)}%`}
            icon={isGain ? TrendingUp : TrendingDown}
            color={isGain ? 'green' : 'red'}
            loading={loading}
          />
          <StatCard
            title="Holdings"
            value={loading ? '—' : String(investments.length)}
            subtitle={loading ? '' : `${topGainers.length} up · ${topLosers.length} down`}
            icon={Package}
            color="purple"
            loading={loading}
          />
        </div>

        {/* Portfolio performance bar */}
        {investments.length > 0 && !loading && (
          <div className="card p-5 mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-500 font-medium">Portfolio performance</span>
              <span className={`font-semibold ${isGain ? 'text-green-600' : 'text-red-500'}`}>
                {isGain ? '+' : ''}{totalPct.toFixed(2)}% overall
              </span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${isGain ? 'bg-green-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(Math.abs(totalPct) * 3, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1.5">
              <span>Invested: {formatINR(totalInvested)}</span>
              <span>Current: {formatINR(totalCurrent)}</span>
            </div>
          </div>
        )}

        {/* Tab switcher */}
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
          {([
            { id: 'holdings'   as TabView, label: 'Holdings',   icon: Package   },
            { id: 'allocation' as TabView, label: 'Allocation', icon: PieChart  },
            { id: 'advisor'    as TabView, label: 'AI Advisor', icon: Brain     },
          ]).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                tab === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {/* ── Holdings tab ─────────────────────────────────────────── */}
        {tab === 'holdings' && (
          <>
            <div className="card p-4 mb-4 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  className="input pl-9 text-sm"
                  placeholder="Search name or ticker…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter size={15} className="text-gray-400 flex-shrink-0" />
                <select
                  className="input w-auto min-w-[150px] text-sm"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <option value="">All types</option>
                  {INVESTMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {loading ? (
              <div className="card p-12 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="card p-16 text-center">
                <TrendingUp className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="font-medium text-gray-400">
                  {search || filterType ? 'No holdings match your filter' : 'No investments yet'}
                </p>
                {!search && !filterType && (
                  <button
                    onClick={() => { setEditInv(null); setShowForm(true); }}
                    className="btn-primary mt-4 inline-flex items-center gap-2 text-sm"
                  >
                    <Plus size={14} /> Add your first investment
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="card overflow-hidden hidden sm:block">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-50">
                        {['Investment', 'Quantity', 'Invested', 'Current value', 'P&L', ''].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filtered.map((inv) => (
                        <HoldingRow
                          key={inv._id}
                          investment={inv}
                          onEdit={(i) => { setEditInv(i); setShowForm(true); }}
                          onDelete={handleDelete}
                          onUpdatePrice={(i) => setPriceInv(i)}
                          deleting={deletingId === inv._id}
                        />
                      ))}
                    </tbody>
                    {/* Portfolio total footer — each value in its own <td> */}
                    {investments.length > 0 && (
                      <tfoot>
                        <tr className="border-t-2 border-gray-100 bg-gray-50/60">
                          <td className="px-4 py-3 text-sm font-semibold text-gray-700">
                            Portfolio total
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-400">
                            {investments.length} holdings
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-700">
                            {formatINR(totalInvested)}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-700">
                            {formatINR(totalCurrent)}
                          </td>
                          <td className="px-4 py-3">
                            <div className={`flex flex-col ${isGain ? 'text-green-600' : 'text-red-500'}`}>
                              <span className="text-sm font-bold">
                                {isGain ? '+' : ''}{formatINR(totalReturn)}
                              </span>
                              <span className="text-xs font-medium">
                                {isGain ? '+' : ''}{totalPct.toFixed(2)}%
                              </span>
                            </div>
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="sm:hidden space-y-3">
                  {filtered.map((inv) => {
                    const g = (inv.percentReturn ?? 0) >= 0;
                    const invAmt = (inv.quantity ?? 0) * (inv.avgBuyPrice ?? 0);
                    const curAmt = (inv.quantity ?? 0) * (inv.currentPrice ?? 0);
                    return (
                      <div key={inv._id} className="card p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                              style={{ backgroundColor: ASSET_TYPE_COLORS[inv.type] || '#6b7280' }}
                            >
                              {(inv.symbol || inv.type).slice(0, 3).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 text-sm">{inv.name}</p>
                              <p className="text-xs text-gray-400">{inv.type} · {inv.quantity} units</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900 text-sm">{formatINR(curAmt)}</p>
                            <p className={`text-xs font-medium ${g ? 'text-green-600' : 'text-red-500'}`}>
                              {g ? '+' : ''}{(inv.percentReturn ?? 0).toFixed(2)}%
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <button onClick={() => setPriceInv(inv)} className="flex-1 btn-secondary text-xs py-1.5">Update price</button>
                          <button onClick={() => { setEditInv(inv); setShowForm(true); }} className="flex-1 btn-secondary text-xs py-1.5">Edit</button>
                          <button onClick={() => handleDelete(inv._id)} className="btn-secondary text-xs py-1.5 px-3 text-red-400">Delete</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}

        {/* ── Allocation tab ────────────────────────────────────────── */}
        {tab === 'allocation' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-6">
              <h2 className="font-semibold text-gray-900 mb-0.5">Asset allocation</h2>
              <p className="text-xs text-gray-400 mb-4">How your portfolio is distributed</p>
              {loading ? (
                <div className="h-64 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-brand-400 animate-spin" />
                </div>
              ) : investments.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-sm text-gray-400">
                  Add investments to see your allocation
                </div>
              ) : (
                <AllocationChart byType={byType} bySector={bySector} />
              )}
            </div>

            <div className="space-y-4">
              {/* Top gainers */}
              <div className="card p-5">
                <h3 className="font-semibold text-gray-900 mb-3 text-sm flex items-center gap-2">
                  <TrendingUp size={14} className="text-green-500" /> Top gainers
                </h3>
                {topGainers.length === 0 ? (
                  <p className="text-xs text-gray-400">No gainers yet</p>
                ) : (
                  topGainers.map((inv) => (
                    <div key={inv._id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <span className="text-sm text-gray-700 truncate">{inv.name}</span>
                      <span className="text-sm font-semibold text-green-600 ml-2 flex-shrink-0">
                        +{(inv.percentReturn ?? 0).toFixed(2)}%
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Underperformers */}
              <div className="card p-5">
                <h3 className="font-semibold text-gray-900 mb-3 text-sm flex items-center gap-2">
                  <TrendingDown size={14} className="text-red-500" /> Underperformers
                </h3>
                {topLosers.length === 0 ? (
                  <p className="text-xs text-gray-400">All holdings in profit</p>
                ) : (
                  topLosers.map((inv) => (
                    <div key={inv._id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <span className="text-sm text-gray-700 truncate">{inv.name}</span>
                      <span className="text-sm font-semibold text-red-500 ml-2 flex-shrink-0">
                        {(inv.percentReturn ?? 0).toFixed(2)}%
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* By type breakdown */}
              {byType.length > 0 && (
                <div className="card p-5">
                  <h3 className="font-semibold text-gray-900 mb-3 text-sm">By asset type</h3>
                  {byType.map((t) => (
                    <div key={t.type} className="mb-3 last:mb-0">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-600 font-medium">{t.type}</span>
                        <span className="text-gray-400">{formatINR(t.current)} · {t.allocation}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-500 rounded-full transition-all duration-700"
                          style={{ width: `${t.allocation}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── AI Advisor tab ────────────────────────────────────────── */}
        {tab === 'advisor' && (
          <div>
            <div className="mb-5">
              <h2 className="font-semibold text-gray-900">AI investment advisor</h2>
              <p className="text-sm text-gray-400 mt-0.5">Personalized insights based on your portfolio</p>
            </div>
            <InvestmentAdvisor />
          </div>
        )}
      </div>

      {showForm && (
        <InvestmentForm
          investment={editInv}
          onClose={() => { setShowForm(false); setEditInv(null); }}
          onSaved={handleSaved}
        />
      )}
      {priceInv && (
        <UpdatePriceModal
          investment={priceInv}
          onClose={() => setPriceInv(null)}
          onUpdated={handlePriceUpdated}
        />
      )}
    </AppShell>
  );
}
