'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import StatCard from '@/components/ui/StatCard';
import BudgetBar from '@/components/ui/BudgetBar';
import MonthlyChart from '@/components/charts/MonthlyChart';
import CategoryChart from '@/components/charts/CategoryChart';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { formatCurrency, formatRelativeDate, CATEGORY_COLORS } from '@/lib/utils';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  DollarSign, TrendingUp, TrendingDown, CreditCard,
  Brain, ArrowRight, Sparkles, BarChart2,
} from 'lucide-react';
import Link from 'next/link';
import DailyInsightCard from '@/components/gamification/DailyInsightCard';
import FinScoreWidget from '@/components/gamification/FinScoreWidget';
import LivePriceTicker from '@/components/investments/LivePriceTicker';
import WeeklyChallengesWidget from '@/components/gamification/WeeklyChallengesWidget';

interface Summary {
  thisMonth: number;
  lastMonth: number;
  changePercent: number;
  budget: number;
  budgetUsed: number;
  transactionCount: number;
  avgDailySpend: number;
  categoryBreakdown: { _id: string; total: number; count: number }[];
  dailySpending: { _id: string; total: number }[];
}

interface Expense {
  _id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
}

export default function DashboardPage() {
  const { user } = useRequireAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [monthly, setMonthly] = useState<any[]>([]);
  const [recent, setRecent] = useState<Expense[]>([]);
  const [portfolio, setPortfolio] = useState<{ currentValue: number; absoluteReturn: number; percentReturn: number; totalHoldings: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const [s, m, e, p, inv] = await Promise.all([
  api.get('/stats/summary'),
  api.get('/stats/monthly'),
  api.get('/expenses?limit=5&sort=-date'),
  api.get('/investments/stats'),
  api.get('/investments'), // 🔥 ADD THIS
]);
        setSummary(s.data.data);
        setMonthly(m.data.data);
        setRecent(e.data.data);
        setPortfolio(p.data.data);
      } catch {
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  if (!user) return null;

  return (
    <AppShell>
      <div className="animate-fade-in">
        {/* Header */}
        <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="page-title">Welcome back, {user.name.split(' ')[0]} 👋</h1>
            <p className="page-subtitle">Here's your financial snapshot for this month</p>
          </div>
          <Link href="/advisor" className="btn-primary flex items-center gap-2 self-start">
            <Sparkles size={16} />
            Get AI insights
          </Link>
        </div>

        {/* Live market ticker */}
        <LivePriceTicker />

        {/* ── GAMIFICATION ROW ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
          {/* Daily insight takes 2/3 width */}
          <div className="lg:col-span-2">
            <DailyInsightCard />
          </div>
          {/* FinScore takes 1/3 */}
          <div>
            <FinScoreWidget />
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="This month's spending"
            value={formatCurrency(summary?.thisMonth || 0, user.currency)}
            icon={DollarSign}
            color="green"
            trend={summary ? { value: summary.changePercent, label: 'vs last month' } : undefined}
            loading={loading}
          />
          <StatCard
            title="Budget used"
            value={`${summary?.budgetUsed || 0}%`}
            subtitle={`of ${formatCurrency(summary?.budget || 0, user.currency)}`}
            icon={TrendingUp}
            color={(summary?.budgetUsed || 0) > 90 ? 'red' : (summary?.budgetUsed || 0) > 70 ? 'amber' : 'blue'}
            loading={loading}
          />
          <StatCard
            title="Transactions"
            value={String(summary?.transactionCount || 0)}
            subtitle="this month"
            icon={CreditCard}
            color="purple"
            loading={loading}
          />
          <StatCard
            title="Avg daily spend"
            value={formatCurrency(summary?.avgDailySpend || 0, user.currency)}
            subtitle="per day this month"
            icon={TrendingDown}
            color="amber"
            loading={loading}
          />
        </div>

        {/* Budget bar */}
        {summary && (
          <div className="card p-6 mb-8">
            <BudgetBar
              spent={summary.thisMonth}
              budget={summary.budget}
              currency={user.currency}
            />
          </div>
        )}

        {/* Portfolio snapshot */}
        {portfolio && portfolio.totalHoldings > 0 && (
          <Link href="/investments" className="card p-5 mb-8 flex items-center justify-between hover:shadow-md transition group">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 bg-purple-50 rounded-xl flex items-center justify-center">
                <BarChart2 size={20} className="text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Investment portfolio</p>
                <p className="text-xs text-gray-400">{portfolio.totalHoldings} holdings</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right hidden sm:block">
                <p className="text-xs text-gray-400">Current value</p>
                <p className="text-sm font-bold text-gray-900">₹{(portfolio.currentValue ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Total return</p>
                <p className={`text-sm font-bold ${portfolio.absoluteReturn >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {portfolio.absoluteReturn >= 0 ? '+' : ''}{portfolio.percentReturn.toFixed(1)}%
                </p>
              </div>
              <ArrowRight size={16} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        )}

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Spending trend */}
          <div className="card p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-semibold text-gray-900">Spending trend</h2>
                <p className="text-xs text-gray-400">Last 6 months</p>
              </div>
            </div>
            <MonthlyChart data={monthly} currency={user.currency} />
          </div>

          {/* Category breakdown */}
          <div className="card p-6">
            <div className="mb-5">
              <h2 className="font-semibold text-gray-900">This month</h2>
              <p className="text-xs text-gray-400">By category</p>
            </div>
            <CategoryChart data={summary?.categoryBreakdown || []} currency={user.currency} />
          </div>
        </div>

        {/* Recent + Top Categories + Challenges */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent expenses */}
          <div className="card p-6 lg:col-span-1">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-gray-900">Recent expenses</h2>
              <Link href="/expenses" className="text-xs text-brand-600 hover:underline flex items-center gap-1">
                View all <ArrowRight size={12} />
              </Link>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="w-9 h-9 bg-gray-100 rounded-xl" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 bg-gray-100 rounded w-2/3" />
                      <div className="h-3 bg-gray-100 rounded w-1/3" />
                    </div>
                    <div className="h-4 bg-gray-100 rounded w-16" />
                  </div>
                ))}
              </div>
            ) : recent.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 text-sm">No expenses yet.</p>
                <Link href="/expenses" className="btn-primary mt-3 inline-block text-sm">Add expense</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recent.map((exp) => (
                  <div key={exp._id} className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: CATEGORY_COLORS[exp.category] || '#6b7280' }}
                    >
                      {exp.category[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{exp.title}</p>
                      <p className="text-xs text-gray-400">{formatRelativeDate(exp.date)}</p>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 flex-shrink-0">
                      {formatCurrency(exp.amount, user.currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top categories */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-gray-900">Top categories</h2>
              <span className="text-xs text-gray-400">This month</span>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse space-y-1">
                    <div className="h-3.5 bg-gray-100 rounded w-full" />
                    <div className="h-2 bg-gray-100 rounded w-full" />
                  </div>
                ))}
              </div>
            ) : (summary?.categoryBreakdown || []).slice(0, 5).map((cat) => {
              const pct = summary ? (cat.total / summary.thisMonth) * 100 : 0;
              return (
                <div key={cat._id} className="mb-4 last:mb-0">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700 font-medium">{cat._id}</span>
                    <span className="text-gray-500">{formatCurrency(cat.total, user.currency)}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: CATEGORY_COLORS[cat._id] || '#6b7280',
                      }}
                    />
                  </div>
                </div>
              );
            })}

            {/* AI Tip */}
            <Link href="/advisor" className="mt-6 flex items-start gap-3 p-3 bg-brand-50 rounded-xl hover:bg-brand-100 transition group">
              <Brain size={18} className="text-brand-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-brand-800">Get AI advice</p>
                <p className="text-xs text-brand-600">Personalized tips based on your spending</p>
              </div>
              <ArrowRight size={14} className="text-brand-500 ml-auto mt-0.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Weekly challenges */}
          <div className="lg:col-span-1">
            <WeeklyChallengesWidget />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
