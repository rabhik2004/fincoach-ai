'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Trophy, ChevronRight, Zap, CheckCircle } from 'lucide-react';

interface Challenge {
  _id: string;
  type: string;
  title: string;
  emoji: string;
  target: number;
  progress: number;
  completed: boolean;
  xpReward: number;
}

export default function WeeklyChallengesWidget() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [totalXP, setTotalXP] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/challenges/weekly')
      .then(({ data }) => {
        setChallenges(data.data.challenges.slice(0, 3));
        setTotalXP(data.data.totalXP);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="card p-5 animate-pulse">
        <div className="h-4 bg-gray-100 rounded w-1/3 mb-3" />
        {Array(2).fill(0).map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-xl mb-2" />)}
      </div>
    );
  }

  if (!challenges.length) return null;
  const completed = challenges.filter((c) => c.completed).length;

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy size={16} className="text-brand-600" />
          <h2 className="font-semibold text-gray-900">This week</h2>
          <span className="badge bg-yellow-50 text-yellow-700 text-xs flex items-center gap-0.5">
            <Zap size={10} /> {totalXP} XP earned
          </span>
        </div>
        <Link href="/challenges" className="text-xs text-brand-600 hover:underline flex items-center gap-0.5">
          All <ChevronRight size={11} />
        </Link>
      </div>

      <div className="space-y-2.5">
        {challenges.map((ch) => {
          const pct = Math.min((ch.progress / ch.target) * 100, 100);
          return (
            <div key={ch._id} className={cn('flex items-center gap-3 p-2.5 rounded-xl transition',
              ch.completed ? 'bg-green-50' : 'bg-gray-50'
            )}>
              <span className="text-xl flex-shrink-0">{ch.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate">{ch.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full', ch.completed ? 'bg-green-500' : 'bg-brand-500')}
                      style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[10px] text-gray-400 flex-shrink-0">{ch.progress}/{ch.target}</span>
                </div>
              </div>
              {ch.completed
                ? <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
                : <span className="text-[10px] text-yellow-600 font-bold flex-shrink-0">+{ch.xpReward}</span>
              }
            </div>
          );
        })}
      </div>

      {/* Progress summary */}
      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
        <span className="text-xs text-gray-400">{completed}/{challenges.length} challenges done</span>
        <div className="flex gap-0.5">
          {challenges.map((ch) => (
            <div key={ch._id} className={cn('w-6 h-1.5 rounded-full', ch.completed ? 'bg-green-500' : 'bg-gray-200')} />
          ))}
        </div>
      </div>
    </div>
  );
}
