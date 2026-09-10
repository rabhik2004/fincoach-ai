'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import {
  LayoutDashboard, CreditCard, Brain, MessageCircle,
  TrendingUp, LogOut, Settings, User, BarChart2, Trophy, Cpu, Target,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/expenses',    icon: CreditCard,       label: 'Expenses' },
  { href: '/investments', icon: BarChart2,        label: 'Investments' },
  { href: '/advisor',     icon: Brain,            label: 'AI Advisor' },
  { href: '/chat',        icon: MessageCircle,    label: 'Chat' },
  { href: '/ollama',      icon: Cpu,              label: 'Local AI', badge: 'LOCAL' },
  { href: '/challenges',  icon: Target,           label: 'Challenges' },
  { href: '/progress',    icon: Trophy,           label: 'Progress', hasStreak: true },
];

interface SidebarProps {
  onClose?: () => void;
}

function FlameIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" className="text-orange-400">
      <path d="M12 2C9.5 7 14 9 12 14c-1 2-3 3-5 3 1-2 .5-4-.5-5.5C4 9 6 5 8 3c-.5 2 1 4 2.5 4.5C9 5.5 10.5 3.5 12 2z"/>
    </svg>
  );
}

export default function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [streak, setStreak] = useState<number | null>(null);
  const [score, setScore] = useState<number | null>(null);

  useEffect(() => {
    api.get('/score').then(({ data }) => {
      setStreak(data.data.streak);
      setScore(data.data.score);
    }).catch(() => {});
  }, []);

  return (
    <aside className="h-full flex flex-col bg-white border-r border-gray-100 w-64">
      {/* Logo */}
      <div className="p-6 border-b border-gray-100">
        <Link href="/dashboard" className="flex items-center gap-3" onClick={onClose}>
          <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center shadow-sm">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900 leading-tight">FinCoach AI</p>
            <p className="text-xs text-gray-400">Your financial advisor</p>
          </div>
        </Link>
      </div>

      {/* Score + streak mini banner */}
      {(score !== null || streak !== null) && (
        <div className="mx-4 mt-3 flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
          {score !== null && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-brand-500" />
              <span className="text-xs font-bold text-gray-700">{score}</span>
              <span className="text-[10px] text-gray-400">score</span>
            </div>
          )}
          {streak !== null && (
            <div className="flex items-center gap-1">
              <FlameIcon />
              <span className="text-xs font-bold text-gray-700">{streak}</span>
              <span className="text-[10px] text-gray-400">streak</span>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto mt-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-3">Menu</p>
        {navItems.map(({ href, icon: Icon, label, hasStreak, badge }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                active
                  ? 'bg-brand-50 text-brand-700 shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <Icon className={cn('flex-shrink-0', active ? 'text-brand-600' : 'text-gray-400')} size={18} />
              <span className="flex-1">{label}</span>
              {badge && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">{badge}</span>
              )}
              {hasStreak && streak !== null && streak > 0 && (
                <span className="flex items-center gap-0.5 bg-orange-100 text-orange-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  <FlameIcon /> {streak}
                </span>
              )}
              {active && !hasStreak && !badge && (
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-gray-100 space-y-1">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all"
          onClick={onClose}
        >
          <Settings size={18} className="text-gray-400" />
          Settings
        </Link>
        <button
          onClick={() => { logout(); onClose?.(); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all"
        >
          <LogOut size={18} className="text-gray-400" />
          Log out
        </button>
        {user && (
          <div className="mt-3 flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-xl">
            <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center">
              <User size={14} className="text-brand-700" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

