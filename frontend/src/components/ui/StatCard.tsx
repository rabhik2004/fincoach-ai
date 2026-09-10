import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  color?: 'green' | 'blue' | 'amber' | 'red' | 'purple';
  loading?: boolean;
}

const colorMap = {
  green: 'bg-green-50 text-green-600',
  blue: 'bg-blue-50 text-blue-600',
  amber: 'bg-amber-50 text-amber-600',
  red: 'bg-red-50 text-red-600',
  purple: 'bg-purple-50 text-purple-600',
};

export default function StatCard({
  title, value, subtitle, icon: Icon, trend, color = 'green', loading
}: StatCardProps) {
  if (loading) {
    return (
      <div className="stat-card animate-pulse">
        <div className="h-4 bg-gray-100 rounded w-1/2 mb-3" />
        <div className="h-8 bg-gray-100 rounded w-2/3 mb-2" />
        <div className="h-3 bg-gray-100 rounded w-1/3" />
      </div>
    );
  }

  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', colorMap[color])}>
          <Icon size={18} />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
      {subtitle && <p className="text-sm text-gray-400">{subtitle}</p>}
      {trend && (
        <div className="mt-1 flex items-center gap-1 text-xs">
          <span className={cn('font-medium', trend.value >= 0 ? 'text-red-500' : 'text-green-500')}>
            {trend.value >= 0 ? '+' : ''}{trend.value.toFixed(1)}%
          </span>
          <span className="text-gray-400">{trend.label}</span>
        </div>
      )}
    </div>
  );
}
