'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { RefreshCw, ChevronRight, Zap, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface Insight {
  type: string;
  emoji: string;
  title: string;
  what: string;
  why: string;
  action: string;
  priority: 'critical' | 'warning' | 'positive' | 'info';
  date: string;
}

const PRIORITY_STYLES = {
  critical: {
    card:  'border-red-200 bg-red-50',
    badge: 'bg-red-100 text-red-700',
    icon:  <AlertTriangle size={14} className="text-red-500" />,
    dot:   'bg-red-500',
    accentBar: 'bg-red-500',
  },
  warning: {
    card:  'border-amber-200 bg-amber-50',
    badge: 'bg-amber-100 text-amber-700',
    icon:  <Zap size={14} className="text-amber-500" />,
    dot:   'bg-amber-500',
    accentBar: 'bg-amber-500',
  },
  positive: {
    card:  'border-green-200 bg-green-50',
    badge: 'bg-green-100 text-green-700',
    icon:  <CheckCircle size={14} className="text-green-500" />,
    dot:   'bg-green-500',
    accentBar: 'bg-green-500',
  },
  info: {
    card:  'border-blue-200 bg-blue-50',
    badge: 'bg-blue-100 text-blue-700',
    icon:  <Info size={14} className="text-blue-500" />,
    dot:   'bg-blue-500',
    accentBar: 'bg-blue-500',
  },
};

const ACTION_LINKS: Record<string, string> = {
  overspend:       '/expenses',
  budget_danger:   '/expenses',
  budget_warning:  '/expenses',
  category_heavy:  '/expenses',
  invest_nudge:    '/investments',
  portfolio_down:  '/investments',
  no_data:         '/expenses',
  weekly_summary:  '/expenses',
  zero_spend:      '/dashboard',
  streak_milestone: '/dashboard',
};

export default function DailyInsightCard() {
  const [insight, setInsight] = useState<Insight | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const fetchInsight = async (force = false) => {
    if (force) setRefreshing(true);
    try {
      const { data } = force
        ? await api.post('/insights/refresh')
        : await api.get('/insights/daily');
      setInsight(data.data);
    } catch {
      // silently fail — insight is non-critical
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchInsight(); }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 mb-6 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 rounded-xl" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 bg-gray-200 rounded w-2/3" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (!insight) return null;

  const s = PRIORITY_STYLES[insight.priority] || PRIORITY_STYLES.info;
  const actionHref = ACTION_LINKS[insight.type] || '/dashboard';

  return (
    <div className={cn(
      'rounded-2xl border p-4 mb-6 transition-all duration-300 animate-fade-in',
      s.card
    )}>
      {/* Accent bar */}
      <div className={cn('h-0.5 w-full rounded-full mb-4', s.accentBar)} />

      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {/* Emoji + pulse dot */}
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 bg-white/70 rounded-xl flex items-center justify-center text-xl shadow-sm">
              {insight.emoji}
            </div>
            <span className={cn(
              'absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white',
              s.dot
            )} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={cn('badge text-xs font-medium flex items-center gap-1', s.badge)}>
                {s.icon} Today's insight
              </span>
            </div>
            <h3 className="font-semibold text-gray-900 text-sm leading-snug">
              {insight.title}
            </h3>
          </div>
        </div>

        {/* Refresh */}
        <button
          onClick={() => fetchInsight(true)}
          disabled={refreshing}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-white/60 transition flex-shrink-0"
          title="Refresh insight"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* What happened */}
      <p className="text-sm text-gray-700 mt-3 leading-relaxed">
        {insight.what}
      </p>

      {/* Expandable: Why + Action */}
      {!expanded ? (
        <button
          onClick={() => setExpanded(true)}
          className="mt-2 text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 transition"
        >
          Why this matters <ChevronRight size={12} />
        </button>
      ) : (
        <div className="mt-3 space-y-2 animate-slide-up">
          <div className="bg-white/60 rounded-xl p-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Why it matters</p>
            <p className="text-sm text-gray-700 leading-relaxed">{insight.why}</p>
          </div>
          <div className="bg-white/80 rounded-xl p-3 border border-white">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              → What to do
            </p>
            <p className="text-sm text-gray-800 font-medium leading-relaxed">{insight.action}</p>
          </div>
        </div>
      )}

      {/* CTA row */}
      <div className="flex items-center justify-between mt-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-gray-400 hover:text-gray-600 transition"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
        <Link
          href={actionHref}
          className="flex items-center gap-1 text-xs font-semibold text-gray-700 hover:text-gray-900 bg-white/70 hover:bg-white px-3 py-1.5 rounded-lg border border-white transition"
        >
          Take action <ChevronRight size={11} />
        </Link>
      </div>
    </div>
  );
}
