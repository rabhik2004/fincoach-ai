import { cn } from '@/lib/utils';
import type { Achievement } from '@/lib/achievements';
import { TIER_STYLES } from '@/lib/achievements';

interface AchievementBadgeProps {
  achievement: Achievement;
  size?: 'sm' | 'md' | 'lg';
}

export default function AchievementBadge({ achievement, size = 'md' }: AchievementBadgeProps) {
  const s = TIER_STYLES[achievement.tier];
  const locked = !achievement.unlocked;

  const sizeMap = {
    sm: { card: 'p-3', emoji: 'text-xl', title: 'text-xs', badge: 'text-[10px]', bar: 'h-1' },
    md: { card: 'p-4', emoji: 'text-2xl', title: 'text-sm', badge: 'text-xs', bar: 'h-1.5' },
    lg: { card: 'p-5', emoji: 'text-3xl', title: 'text-base', badge: 'text-xs', bar: 'h-2' },
  }[size];

  return (
    <div className={cn(
      'rounded-2xl border transition-all duration-200',
      sizeMap.card,
      locked
        ? 'bg-gray-50 border-gray-100 opacity-50 grayscale'
        : cn(s.bg, s.border, 'hover:shadow-sm')
    )}>
      {/* Emoji + tier badge */}
      <div className="flex items-start justify-between mb-2">
        <span className={cn(sizeMap.emoji, locked ? 'opacity-40' : '')}>
          {achievement.emoji}
        </span>
        <span className={cn('badge capitalize font-medium', sizeMap.badge,
          locked ? 'bg-gray-100 text-gray-400' : s.badge
        )}>
          {achievement.tier}
        </span>
      </div>

      {/* Title + desc */}
      <p className={cn('font-semibold text-gray-900 leading-tight', sizeMap.title)}>
        {locked ? '???' : achievement.title}
      </p>
      <p className="text-xs text-gray-400 mt-0.5 leading-snug">
        {achievement.description}
      </p>

      {/* Progress bar (only for locked) */}
      {locked && achievement.progress !== undefined && (
        <div className="mt-3">
          <div className={cn('w-full bg-gray-200 rounded-full overflow-hidden', sizeMap.bar)}>
            <div
              className="h-full bg-gray-400 rounded-full transition-all duration-700"
              style={{ width: `${achievement.progress}%` }}
            />
          </div>
          <p className="text-[10px] text-gray-400 mt-0.5">{achievement.progress}% complete</p>
        </div>
      )}

      {/* Unlocked checkmark */}
      {achievement.unlocked && (
        <div className="mt-2 flex items-center gap-1">
          <span className="text-green-500 text-xs">✓</span>
          <span className="text-xs text-green-600 font-medium">Unlocked!</span>
        </div>
      )}
    </div>
  );
}
