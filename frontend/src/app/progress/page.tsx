'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import ScoreHistoryChart from '@/components/charts/ScoreHistoryChart';
import AchievementBadge from '@/components/gamification/AchievementBadge';
import FinScoreWidget from '@/components/gamification/FinScoreWidget';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { computeAchievements, type Achievement, type ScoreData } from '@/lib/achievements';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { Trophy, Flame, Calendar, TrendingUp, Star, Target } from 'lucide-react';

type FilterCat = 'all' | 'streak' | 'score' | 'budget' | 'investment' | 'consistency';

const CATEGORY_FILTERS: { id: FilterCat; label: string }[] = [
  { id: 'all',         label: 'All' },
  { id: 'streak',      label: 'Streak' },
  { id: 'score',       label: 'Score' },
  { id: 'budget',      label: 'Budget' },
  { id: 'investment',  label: 'Investment' },
  { id: 'consistency', label: 'Consistency' },
];

// Animated stat number
function AnimatedStat({ value, label, icon: Icon, color }: {
  value: number | string; label: string; icon: React.ElementType; color: string;
}) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-gray-400">{label}</p>
        <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center', color)}>
          <Icon size={15} />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
    </div>
  );
}

export default function ProgressPage() {
  const { user } = useRequireAuth();
  const [scoreData, setScoreData] = useState<ScoreData | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterCat>('all');
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const [scoreRes, statsRes, invRes] = await Promise.all([
          api.get('/score'),
          api.get('/stats/summary'),
          api.get('/investments/stats'),
        ]);
        const sd: ScoreData = scoreRes.data.data;
        setScoreData(sd);
        setAchievements(computeAchievements(sd, {
          totalExpenses: statsRes.data.data.transactionCount || 0,
          totalInvested: invRes.data.data.totalInvested || 0,
          totalHoldings: invRes.data.data.totalHoldings || 0,
          monthlyBudget: user.monthlyBudget || 3000,
          spentThisMonth: statsRes.data.data.thisMonth || 0,
        }));
      } catch {
        toast.error('Failed to load progress data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  if (!user) return null;

  const unlocked = achievements.filter((a) => a.unlocked);
  const locked   = achievements.filter((a) => !a.unlocked);
  const filtered = achievements.filter((a) => filter === 'all' || a.category === filter);
  const displayed = showAll ? filtered : filtered.slice(0, 8);

  const streakLabel =
    (scoreData?.streak || 0) >= 30 ? 'Legendary' :
    (scoreData?.streak || 0) >= 14 ? 'On fire' :
    (scoreData?.streak || 0) >= 7  ? 'Rolling' :
    (scoreData?.streak || 0) >= 3  ? 'Building' :
    'Just started';

  return (
    <AppShell>
      <div className="animate-fade-in">
        {/* Header */}
        <div className="page-header">
          <h1 className="page-title flex items-center gap-2">
            <Trophy size={22} className="text-brand-600" /> My Progress
          </h1>
          <p className="page-subtitle">Your financial journey — streaks, score history, and achievements</p>
        </div>

        {/* Top row: score widget + streak summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
          <div className="lg:col-span-1">
            <FinScoreWidget />
          </div>
          <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3 content-start">
            <AnimatedStat
              value={scoreData?.streak ?? '—'}
              label="Current streak"
              icon={Flame}
              color="bg-orange-50 text-orange-500"
            />
            <AnimatedStat
              value={scoreData?.longestStreak ?? '—'}
              label="Longest streak"
              icon={Star}
              color="bg-yellow-50 text-yellow-500"
            />
            <AnimatedStat
              value={scoreData?.totalActiveDays ?? '—'}
              label="Active days"
              icon={Calendar}
              color="bg-blue-50 text-blue-500"
            />
            <AnimatedStat
              value={`${unlocked.length}/${achievements.length}`}
              label="Badges earned"
              icon={Trophy}
              color="bg-purple-50 text-purple-500"
            />
          </div>
        </div>

        {/* Streak story */}
        {scoreData && (
          <div className="card p-5 mb-8 flex items-center gap-5">
            <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center">
              <Flame size={28} className={cn(
                (scoreData.streak >= 30) ? 'text-purple-500' :
                (scoreData.streak >= 14) ? 'text-orange-500' :
                (scoreData.streak >= 7)  ? 'text-orange-400' :
                (scoreData.streak >= 3)  ? 'text-amber-500' :
                'text-gray-300'
              )} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-gray-900 text-lg">{scoreData.streak}-day streak</span>
                <span className="badge bg-orange-100 text-orange-700 text-xs">{streakLabel}</span>
              </div>
              <p className="text-sm text-gray-500">
                {scoreData.streak === 0
                  ? 'Log an expense or investment today to start your streak!'
                  : scoreData.streak === 1
                  ? "Great start! Come back tomorrow to keep the streak alive."
                  : scoreData.streak < 7
                  ? `${7 - scoreData.streak} more days to hit your first week milestone!`
                  : scoreData.streak < 30
                  ? `${30 - scoreData.streak} more days until the legendary 30-day badge!`
                  : "You're a financial legend. Keep it up!"}
              </p>
              {/* Progress to next milestone */}
              {scoreData.streak < 30 && (
                <div className="mt-2">
                  {[3, 7, 14, 30].filter((m) => m > scoreData.streak).slice(0, 1).map((next) => (
                    <div key={next}>
                      <div className="flex justify-between text-xs text-gray-400 mb-0.5">
                        <span>Progress to {next}-day badge</span>
                        <span>{scoreData.streak}/{next}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-orange-400 rounded-full transition-all duration-700"
                          style={{ width: `${(scoreData.streak / next) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Score history chart */}
        <div className="card p-6 mb-8">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-gray-900">FinScore history</h2>
              <p className="text-xs text-gray-400 mt-0.5">Your score over the last 30 days</p>
            </div>
            {scoreData?.weeklyChange !== undefined && (
              <div className={cn('flex items-center gap-1 text-sm font-semibold',
                scoreData.weeklyChange > 0 ? 'text-green-600' :
                scoreData.weeklyChange < 0 ? 'text-red-500' : 'text-gray-400'
              )}>
                <TrendingUp size={14} />
                {scoreData.weeklyChange > 0 ? '+' : ''}{scoreData.weeklyChange} this week
              </div>
            )}
          </div>
          {loading
            ? <div className="h-48 bg-gray-50 rounded-xl animate-pulse" />
            : <ScoreHistoryChart data={scoreData?.scoreHistory || []} />
          }
        </div>

        {/* Score breakdown */}
        {scoreData && (
          <div className="card p-6 mb-8">
            <h2 className="font-semibold text-gray-900 mb-5">Score breakdown</h2>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
              {[
                { label: 'Budget', value: scoreData.breakdown.budgetScore,      max: 30, color: '#22c55e', icon: Target },
                { label: 'Savings', value: scoreData.breakdown.savingsScore,    max: 25, color: '#3b82f6', icon: TrendingUp },
                { label: 'Investing', value: scoreData.breakdown.investmentScore, max: 20, color: '#8b5cf6', icon: Star },
                { label: 'Streak', value: scoreData.breakdown.streakScore,      max: 15, color: '#f59e0b', icon: Flame },
                { label: 'Consistency', value: scoreData.breakdown.consistencyScore, max: 10, color: '#06b6d4', icon: Calendar },
              ].map(({ label, value, max, color, icon: Icon }) => (
                <div key={label} className="text-center">
                  <div className="relative w-16 h-16 mx-auto mb-2">
                    <svg width="64" height="64" viewBox="0 0 64 64">
                      <circle cx="32" cy="32" r="26" fill="none" stroke="#f3f4f6" strokeWidth="6" />
                      <circle
                        cx="32" cy="32" r="26" fill="none"
                        stroke={color} strokeWidth="6"
                        strokeDasharray={`${2 * Math.PI * 26}`}
                        strokeDashoffset={`${2 * Math.PI * 26 * (1 - value / max)}`}
                        strokeLinecap="round"
                        style={{ transform: 'rotate(-90deg)', transformOrigin: '32px 32px' }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-bold" style={{ color }}>{value}</span>
                    </div>
                  </div>
                  <p className="text-xs font-medium text-gray-600">{label}</p>
                  <p className="text-xs text-gray-400">of {max}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Achievements section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-900">Achievements</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {unlocked.length} of {achievements.length} unlocked
              </p>
            </div>
            {/* Progress bar */}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-500 rounded-full transition-all duration-700"
                  style={{ width: `${achievements.length > 0 ? (unlocked.length / achievements.length) * 100 : 0}%` }}
                />
              </div>
              <span>{achievements.length > 0 ? Math.round((unlocked.length / achievements.length) * 100) : 0}%</span>
            </div>
          </div>

          {/* Category filter */}
          <div className="flex gap-1.5 mb-5 flex-wrap">
            {CATEGORY_FILTERS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setFilter(id)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize',
                  filter === id
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                )}
              >
                {label}
                {id !== 'all' && (
                  <span className={cn('ml-1.5 text-[10px]',
                    filter === id ? 'opacity-70' : 'text-gray-400'
                  )}>
                    {achievements.filter((a) => a.category === id && a.unlocked).length}/
                    {achievements.filter((a) => a.category === id).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Achievement grid */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array(8).fill(0).map((_, i) => (
                <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {displayed.map((a) => (
                  <AchievementBadge key={a.id} achievement={a} size="md" />
                ))}
              </div>
              {filtered.length > 8 && (
                <button
                  onClick={() => setShowAll(!showAll)}
                  className="mt-4 btn-ghost text-sm mx-auto block"
                >
                  {showAll ? 'Show less' : `Show all ${filtered.length} achievements`}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
