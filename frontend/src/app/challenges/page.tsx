'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { Trophy, RefreshCw, Loader2, CheckCircle, Target, Zap, Star } from 'lucide-react';

interface Challenge {
  _id: string;
  type: string;
  title: string;
  description: string;
  emoji: string;
  target: number;
  progress: number;
  completed: boolean;
  xpReward: number;
  completedAt?: string;
}

interface Goal {
  _id: string;
  title: string;
  emoji: string;
  type: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  notes?: string;
  color: string;
  isCompleted: boolean;
  progressPct: number;
  remaining: number;
  daysLeft: number | null;
}

const GOAL_TYPES = [
  { id: 'savings', label: 'Savings', emoji: '💰' },
  { id: 'investment', label: 'Investment', emoji: '📈' },
  { id: 'debt_payoff', label: 'Debt payoff', emoji: '💳' },
  { id: 'purchase', label: 'Big purchase', emoji: '🛒' },
  { id: 'emergency_fund', label: 'Emergency fund', emoji: '🛡️' },
  { id: 'custom', label: 'Custom', emoji: '🎯' },
];

const GOAL_COLORS = ['#16a34a', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];

function GoalCard({ goal, onContribute, onDelete }: { goal: Goal; onContribute: (id: string, amount: number) => void; onDelete: (id: string) => void }) {
  const [contributing, setContributing] = useState(false);
  const [amount, setAmount] = useState('');
  const daysLabel = goal.daysLeft !== null ? (goal.daysLeft === 0 ? 'Due today' : `${goal.daysLeft}d left`) : null;

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{goal.emoji}</span>
          <div>
            <p className="font-semibold text-gray-900">{goal.title}</p>
            <p className="text-xs text-gray-400 capitalize">{goal.type.replace('_', ' ')}</p>
          </div>
        </div>
        <div className="text-right">
          {daysLabel && <span className="badge bg-blue-50 text-blue-700 text-xs">{daysLabel}</span>}
          {goal.isCompleted && <span className="badge bg-green-50 text-green-700 text-xs">Completed!</span>}
        </div>
      </div>

      {/* Progress */}
      <div className="mb-3">
        <div className="flex justify-between text-sm mb-1.5">
          <span className="text-gray-500">₹{goal.currentAmount.toLocaleString('en-IN')}</span>
          <span className="font-semibold text-gray-900">₹{goal.targetAmount.toLocaleString('en-IN')}</span>
        </div>
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${goal.progressPct}%`, backgroundColor: goal.color }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">{goal.progressPct}% complete · ₹{goal.progressPct ?? 0}% complete • ₹{(goal.remaining ?? 0).toLocaleString('en-IN')} remaining</p>
      </div>

      {/* Add money */}
      {!goal.isCompleted && (
        contributing ? (
          <div className="flex gap-2">
            <input
              type="number"
              className="input flex-1 py-1.5 text-sm"
              placeholder="Amount to add"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
            />
            <button
              onClick={() => { onContribute(goal._id, parseFloat(amount)); setContributing(false); setAmount(''); }}
              disabled={!amount || parseFloat(amount) <= 0}
              className="btn-primary py-1.5 px-4 text-sm"
            >
              Add
            </button>
            <button onClick={() => setContributing(false)} className="btn-secondary py-1.5 px-3 text-sm">Cancel</button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setContributing(true)} className="btn-primary flex-1 py-1.5 text-sm">Add money</button>
            <button onClick={() => onDelete(goal._id)} className="btn-ghost py-1.5 px-3 text-sm text-red-500 hover:bg-red-50">Delete</button>
          </div>
        )
      )}
    </div>
  );
}

export default function ChallengesPage() {
  const { user } = useRequireAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [totalXP, setTotalXP] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'challenges' | 'goals'>('challenges');
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', type: 'savings', targetAmount: '', deadline: '', emoji: '🎯', color: '#16a34a' });

  const load = async () => {
    try {
      const [chRes, gRes] = await Promise.all([
        api.get('/challenges/weekly'),
        api.get('/challenges/goals'),
      ]);
      setChallenges(chRes.data.data.challenges);
      setTotalXP(chRes.data.data.totalXP);
      setGoals(gRes.data.data);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (user) load(); }, [user]);

  const refresh = async () => {
    setRefreshing(true);
    await api.post('/challenges/refresh');
    await load();
    setRefreshing(false);
    toast.success('New challenges generated!');
  };

  const createGoal = async () => {
    if (!newGoal.title || !newGoal.targetAmount) return toast.error('Fill in all fields');
    try {
      await api.post('/challenges/goals', { ...newGoal, targetAmount: parseFloat(newGoal.targetAmount) });
      setShowGoalForm(false);
      setNewGoal({ title: '', type: 'savings', targetAmount: '', deadline: '', emoji: '🎯', color: '#16a34a' });
      await load();
      toast.success('Goal created!');
    } catch { toast.error('Failed to create goal'); }
  };

  const contribute = async (id: string, amount: number) => {
    try {
      const { data } = await api.post(`/challenges/goals/${id}/contribute`, { amount });
      setGoals((prev) => prev.map((g) => g._id === id ? data.data : g));
      if (data.justCompleted) toast.success('🎉 Goal completed!');
      else toast.success(`₹${amount.toLocaleString()} added!`);
    } catch { toast.error('Failed to update goal'); }
  };

  const deleteGoal = async (id: string) => {
    if (!confirm('Delete this goal?')) return;
    await api.delete(`/challenges/goals/${id}`);
    setGoals((prev) => prev.filter((g) => g._id !== id));
  };

  if (!user) return null;

  const completedChallenges = challenges.filter((c) => c.completed).length;

  return (
    <AppShell>
      <div className="animate-fade-in">
        {/* Header */}
        <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="page-title flex items-center gap-2"><Trophy size={22} className="text-brand-600" /> Challenges & Goals</h1>
            <p className="page-subtitle">Complete weekly missions · track financial goals</p>
          </div>
          <div className="flex items-center gap-3">
            {totalXP > 0 && (
              <div className="flex items-center gap-1.5 bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-1.5">
                <Star size={14} className="text-yellow-500" />
                <span className="text-sm font-bold text-yellow-700">{totalXP} XP</span>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
          {(['challenges', 'goals'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={cn('px-5 py-2 rounded-lg text-sm font-medium transition-all capitalize',
                tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {t}
              {t === 'challenges' && completedChallenges > 0 && (
                <span className="ml-1.5 bg-green-100 text-green-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {completedChallenges}/{challenges.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* CHALLENGES TAB */}
        {tab === 'challenges' && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-gray-500">Weekly challenges — resets every Monday</p>
              <button onClick={refresh} disabled={refreshing} className="btn-ghost py-1.5 px-3 text-sm flex items-center gap-1.5">
                <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> New challenges
              </button>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Array(3).fill(0).map((_, i) => <div key={i} className="card p-6 h-40 animate-pulse bg-gray-50" />)}
              </div>
            ) : challenges.length === 0 ? (
              <div className="card p-12 text-center">
                <Trophy className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="font-medium text-gray-500">No challenges yet</p>
                <button onClick={refresh} className="btn-primary mt-4">Generate challenges</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {challenges.map((ch) => {
                  const pct = Math.min((ch.progress / ch.target) * 100, 100);
                  return (
                    <div key={ch._id} className={cn('card p-5 transition-all', ch.completed ? 'border-green-200 bg-green-50' : 'hover:shadow-md')}>
                      <div className="flex items-start justify-between mb-3">
                        <span className="text-3xl">{ch.emoji}</span>
                        <div className="flex items-center gap-1 bg-yellow-50 border border-yellow-100 rounded-full px-2 py-0.5">
                          <Zap size={10} className="text-yellow-500" />
                          <span className="text-[11px] font-bold text-yellow-700">+{ch.xpReward} XP</span>
                        </div>
                      </div>
                      <p className="font-semibold text-gray-900 mb-1">{ch.title}</p>
                      <p className="text-xs text-gray-400 leading-relaxed mb-3">{ch.description}</p>

                      {/* Progress */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">{ch.progress} / {ch.target}</span>
                          <span className={cn('font-semibold', ch.completed ? 'text-green-600' : 'text-gray-600')}>{Math.round(pct)}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={cn('h-full rounded-full transition-all duration-700', ch.completed ? 'bg-green-500' : 'bg-brand-500')}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      {ch.completed && (
                        <div className="flex items-center gap-1.5 mt-3 text-green-600">
                          <CheckCircle size={14} />
                          <span className="text-xs font-semibold">Challenge completed!</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* GOALS TAB */}
        {tab === 'goals' && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-gray-500">{goals.length} financial goals</p>
              <button onClick={() => setShowGoalForm(true)} className="btn-primary flex items-center gap-2 text-sm">
                <Target size={14} /> New goal
              </button>
            </div>

            {goals.length === 0 && !showGoalForm ? (
              <div className="card p-12 text-center">
                <Target className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="font-medium text-gray-500 mb-1">No goals yet</p>
                <p className="text-sm text-gray-400 mb-4">Set a financial goal and track your progress every day</p>
                <button onClick={() => setShowGoalForm(true)} className="btn-primary">Create first goal</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {goals.map((g) => (
                  <GoalCard key={g._id} goal={g} onContribute={contribute} onDelete={deleteGoal} />
                ))}
              </div>
            )}

            {/* New goal form */}
            {showGoalForm && (
              <div className="card p-6 mt-4">
                <h3 className="font-semibold text-gray-900 mb-4">Create new goal</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="label">Goal title</label>
                    <input className="input" placeholder="e.g. Emergency fund of ₹2 lakh" value={newGoal.title} onChange={(e) => setNewGoal((g) => ({ ...g, title: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Type</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {GOAL_TYPES.map((t) => (
                        <button key={t.id} onClick={() => setNewGoal((g) => ({ ...g, type: t.id, emoji: t.emoji }))}
                          className={cn('p-2 rounded-xl border text-xs font-medium flex flex-col items-center gap-0.5 transition', newGoal.type === t.id ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-gray-100 hover:border-gray-200 text-gray-600')}
                        >
                          <span>{t.emoji}</span><span>{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="label">Target amount (₹)</label>
                      <input type="number" className="input" placeholder="200000" value={newGoal.targetAmount} onChange={(e) => setNewGoal((g) => ({ ...g, targetAmount: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label">Deadline (optional)</label>
                      <input type="date" className="input" value={newGoal.deadline} onChange={(e) => setNewGoal((g) => ({ ...g, deadline: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label">Color</label>
                      <div className="flex gap-2">
                        {GOAL_COLORS.map((c) => (
                          <button key={c} onClick={() => setNewGoal((g) => ({ ...g, color: c }))}
                            className={cn('w-7 h-7 rounded-full border-2 transition', newGoal.color === c ? 'border-gray-800 scale-110' : 'border-transparent')}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="sm:col-span-2 flex gap-3">
                    <button onClick={() => setShowGoalForm(false)} className="btn-secondary flex-1">Cancel</button>
                    <button onClick={createGoal} className="btn-primary flex-1">Create goal</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
