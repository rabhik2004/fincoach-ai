'use client';
import { useEffect, useState, useRef } from 'react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ScoreData {
  score: number;
  label: string;
  color: string;
  breakdown: {
    budgetScore: number;
    savingsScore: number;
    investmentScore: number;
    streakScore: number;
    consistencyScore: number;
  };
  streak: number;
  longestStreak: number;
  weeklyChange: number;
  totalActiveDays: number;
  weeklyActivityCount: number;
  scoreHistory: { date: string; score: number }[];
}

// Animated ring SVG — pure CSS stroke-dashoffset trick
function ScoreRing({ score, color }: { score: number; color: string }) {
  const [displayed, setDisplayed] = useState(0);
  const R = 52;
  const CIRC = 2 * Math.PI * R;

  const colorMap: Record<string, { stroke: string; text: string; glow: string }> = {
    green: { stroke: '#22c55e', text: '#15803d', glow: '#bbf7d0' },
    blue:  { stroke: '#3b82f6', text: '#1d4ed8', glow: '#bfdbfe' },
    amber: { stroke: '#f59e0b', text: '#b45309', glow: '#fde68a' },
    red:   { stroke: '#ef4444', text: '#b91c1c', glow: '#fecaca' },
  };
  const c = colorMap[color] || colorMap.blue;
  const offset = CIRC * (1 - displayed / 100);

  // Animate score on mount
  useEffect(() => {
    let frame: number;
    let start: number | null = null;
    const duration = 1200;
    const animate = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setDisplayed(Math.round(eased * score));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  return (
    <div className="relative flex items-center justify-center">
      <svg width="128" height="128" viewBox="0 0 128 128">
        {/* Background track */}
        <circle cx="64" cy="64" r={R} fill="none" stroke="#f3f4f6" strokeWidth="10" />
        {/* Glow ring */}
        <circle cx="64" cy="64" r={R} fill="none" stroke={c.glow} strokeWidth="14"
          strokeDasharray={CIRC} strokeDashoffset={offset}
          strokeLinecap="round" style={{ transform: 'rotate(-90deg)', transformOrigin: '64px 64px', transition: 'stroke-dashoffset 0.05s' }}
        />
        {/* Main score ring */}
        <circle cx="64" cy="64" r={R} fill="none" stroke={c.stroke} strokeWidth="9"
          strokeDasharray={CIRC} strokeDashoffset={offset}
          strokeLinecap="round" style={{ transform: 'rotate(-90deg)', transformOrigin: '64px 64px', transition: 'stroke-dashoffset 0.05s' }}
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold" style={{ color: c.stroke, lineHeight: 1 }}>
          {displayed}
        </span>
        <span className="text-[10px] font-semibold text-gray-400 tracking-wide mt-0.5">
          SCORE
        </span>
      </div>
    </div>
  );
}

// Mini bar chart for 14-day history
function MiniScoreChart({ history }: { history: { date: string; score: number }[] }) {
  if (!history.length) return null;
  const max = Math.max(...history.map((h) => h.score), 1);
  const last14 = history.slice(-14);

  return (
    <div className="flex items-end gap-0.5 h-8">
      {last14.map((h, i) => {
        const heightPct = (h.score / max) * 100;
        const isToday = i === last14.length - 1;
        return (
          <div
            key={h.date}
            title={`${h.date}: ${h.score}`}
            className={cn(
              'flex-1 rounded-sm min-w-[3px] transition-all duration-300',
              isToday ? 'bg-brand-500' : 'bg-gray-200 hover:bg-gray-300'
            )}
            style={{ height: `${Math.max(heightPct, 8)}%` }}
          />
        );
      })}
    </div>
  );
}

// Breakdown bar
function BreakdownBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-xs">
        <span className="text-gray-500">{label}</span>
        <span className="font-medium text-gray-700">{value}/{max}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${(value / max) * 100}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// Flame SVG icon
function FlameIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C9.5 7 14 9 12 14c-1 2-3 3-5 3 1-2 .5-4-.5-5.5C4 9 6 5 8 3c-.5 2 1 4 2.5 4.5C9 5.5 10.5 3.5 12 2z"/>
      <path d="M12 14c.5 3-1 5-3 6 3 0 7-2 7-6s-4-5-4-5c0 2-1.5 4-3 3 1-1 3-3 3-5z"/>
    </svg>
  );
}

export default function FinScoreWidget() {
  const [data, setData] = useState<ScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBreakdown, setShowBreakdown] = useState(false);

  useEffect(() => {
    api.get('/score')
      .then(({ data: res }) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="card p-5 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-28 h-28 bg-gray-100 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-100 rounded w-1/2" />
            <div className="h-3 bg-gray-100 rounded w-3/4" />
            <div className="h-3 bg-gray-100 rounded w-1/3" />
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const weeklyChangePositive = data.weeklyChange > 0;
  const weeklyChangeNeutral = data.weeklyChange === 0;

  const labelColors: Record<string, string> = {
    green: 'text-green-700 bg-green-50 border-green-200',
    blue:  'text-blue-700 bg-blue-50 border-blue-200',
    amber: 'text-amber-700 bg-amber-50 border-amber-200',
    red:   'text-red-700 bg-red-50 border-red-200',
  };
  const lc = labelColors[data.color] || labelColors.blue;

  // Streak fire color
  const streakFireColor =
    data.streak >= 30 ? 'text-purple-500' :
    data.streak >= 14 ? 'text-orange-500' :
    data.streak >= 7  ? 'text-orange-400' :
    data.streak >= 3  ? 'text-amber-500' :
    'text-gray-300';

  return (
    <div className="card p-5">
      <div className="flex items-center gap-4">
        {/* Score ring */}
        <div className="flex-shrink-0">
          <ScoreRing score={data.score} color={data.color} />
        </div>

        {/* Info column */}
        <div className="flex-1 min-w-0">
          {/* Label + weekly change */}
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className={cn('badge border text-xs font-semibold', lc)}>
              {data.label}
            </span>
            {!weeklyChangeNeutral && (
              <span className={cn('flex items-center gap-0.5 text-xs font-medium',
                weeklyChangePositive ? 'text-green-600' : 'text-red-500'
              )}>
                {weeklyChangePositive
                  ? <TrendingUp size={11} />
                  : <TrendingDown size={11} />
                }
                {weeklyChangePositive ? '+' : ''}{data.weeklyChange} this week
              </span>
            )}
            {weeklyChangeNeutral && (
              <span className="flex items-center gap-0.5 text-xs text-gray-400">
                <Minus size={11} /> no change
              </span>
            )}
          </div>

          {/* Streak badge */}
          <div className="flex items-center gap-2 mb-2.5">
            <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-100 rounded-xl px-2.5 py-1">
              <span className={cn('transition-colors', streakFireColor)}>
                <FlameIcon size={14} />
              </span>
              <span className="text-sm font-bold text-gray-800">
                {data.streak} day{data.streak !== 1 ? 's' : ''}
              </span>
              <span className="text-xs text-gray-400">streak</span>
            </div>
            {data.longestStreak > data.streak && (
              <span className="text-xs text-gray-400">
                Best: {data.longestStreak}
              </span>
            )}
          </div>

          {/* 14-day mini chart */}
          {data.scoreHistory.length > 1 && (
            <div className="mb-1">
              <MiniScoreChart history={data.scoreHistory} />
              <p className="text-[10px] text-gray-300 mt-0.5">14-day score history</p>
            </div>
          )}

          {/* Weekly activity pills */}
          <div className="flex items-center gap-1 mt-1">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'w-4 h-4 rounded-sm border transition-colors',
                  i < data.weeklyActivityCount
                    ? 'bg-brand-500 border-brand-500'
                    : 'bg-gray-100 border-gray-200'
                )}
                title={i < data.weeklyActivityCount ? 'Active' : 'Inactive'}
              />
            ))}
            <span className="text-xs text-gray-400 ml-1">{data.weeklyActivityCount}/7 days</span>
          </div>
        </div>
      </div>

      {/* Score breakdown toggle */}
      <button
        onClick={() => setShowBreakdown(!showBreakdown)}
        className="mt-4 text-xs text-gray-400 hover:text-gray-600 w-full text-left flex items-center gap-1 transition"
      >
        <span className={cn('transition-transform', showBreakdown ? 'rotate-90' : '')}>▶</span>
        {showBreakdown ? 'Hide breakdown' : 'How is my score calculated?'}
      </button>

      {showBreakdown && (
        <div className="mt-3 space-y-2 animate-slide-up">
          <BreakdownBar label="Budget adherence"    value={data.breakdown.budgetScore}      max={30} color="#22c55e" />
          <BreakdownBar label="Savings rate"        value={data.breakdown.savingsScore}     max={25} color="#3b82f6" />
          <BreakdownBar label="Investment activity" value={data.breakdown.investmentScore}  max={20} color="#8b5cf6" />
          <BreakdownBar label="Streak bonus"        value={data.breakdown.streakScore}      max={15} color="#f59e0b" />
          <BreakdownBar label="Weekly consistency"  value={data.breakdown.consistencyScore} max={10} color="#06b6d4" />
          <p className="text-[10px] text-gray-400 pt-1">
            Total active days: {data.totalActiveDays} · Longest streak: {data.longestStreak} days
          </p>
        </div>
      )}
    </div>
  );
}
