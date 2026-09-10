/**
 * achievements.ts
 * All achievement definitions + unlock logic based on UserStats data.
 */

export interface Achievement {
  id: string;
  title: string;
  description: string;
  emoji: string;
  category: 'streak' | 'budget' | 'investment' | 'savings' | 'consistency' | 'score';
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  unlocked: boolean;
  progress?: number;    // 0–100
  unlockedAt?: string;  // date string
}

export interface ScoreData {
  score: number;
  streak: number;
  longestStreak: number;
  totalActiveDays: number;
  weeklyActivityCount: number;
  weeklyChange: number;
  scoreHistory: { date: string; score: number }[];
  breakdown: {
    budgetScore: number;
    savingsScore: number;
    investmentScore: number;
    streakScore: number;
    consistencyScore: number;
  };
}

export interface StatsData {
  totalExpenses: number;
  totalInvested: number;
  totalHoldings: number;
  monthlyBudget: number;
  spentThisMonth: number;
}

const ACHIEVEMENTS_DEFS = [
  // ── Streak ──────────────────────────────────────────────────────────────
  { id: 'streak_3',   title: 'Getting started',      description: 'Log activity 3 days in a row',    emoji: '🔥', category: 'streak' as const, tier: 'bronze' as const,   threshold: 3 },
  { id: 'streak_7',   title: 'Week warrior',         description: 'Maintain a 7-day streak',         emoji: '🔥', category: 'streak' as const, tier: 'silver' as const,   threshold: 7 },
  { id: 'streak_14',  title: 'Two-week titan',       description: 'Maintain a 14-day streak',        emoji: '🔥', category: 'streak' as const, tier: 'gold' as const,     threshold: 14 },
  { id: 'streak_30',  title: 'Monthly master',       description: 'Maintain a 30-day streak',        emoji: '🔥', category: 'streak' as const, tier: 'platinum' as const, threshold: 30 },

  // ── Score ────────────────────────────────────────────────────────────────
  { id: 'score_50',   title: 'Halfway hero',         description: 'Reach FinScore of 50',            emoji: '⭐', category: 'score' as const, tier: 'bronze' as const,   threshold: 50 },
  { id: 'score_70',   title: 'Financial fit',        description: 'Reach FinScore of 70',            emoji: '⭐', category: 'score' as const, tier: 'silver' as const,   threshold: 70 },
  { id: 'score_85',   title: 'Finance pro',          description: 'Reach FinScore of 85',            emoji: '⭐', category: 'score' as const, tier: 'gold' as const,     threshold: 85 },
  { id: 'score_95',   title: 'Elite saver',          description: 'Reach FinScore of 95',            emoji: '💎', category: 'score' as const, tier: 'platinum' as const, threshold: 95 },

  // ── Budget ───────────────────────────────────────────────────────────────
  { id: 'budget_on',  title: 'Budget keeper',        description: 'Stay within budget this month',   emoji: '✅', category: 'budget' as const, tier: 'silver' as const,   threshold: 100 },
  { id: 'budget_50',  title: 'Frugal champion',      description: 'Use less than 50% of budget',     emoji: '💰', category: 'budget' as const, tier: 'gold' as const,     threshold: 50 },

  // ── Investment ───────────────────────────────────────────────────────────
  { id: 'invest_1',   title: 'First investor',       description: 'Add your first investment',       emoji: '📈', category: 'investment' as const, tier: 'bronze' as const, threshold: 1 },
  { id: 'invest_5',   title: 'Portfolio builder',    description: 'Hold 5+ different investments',   emoji: '📊', category: 'investment' as const, tier: 'silver' as const, threshold: 5 },
  { id: 'invest_10',  title: 'Diversified investor', description: 'Hold 10+ different investments',  emoji: '🏦', category: 'investment' as const, tier: 'gold' as const,   threshold: 10 },

  // ── Consistency ──────────────────────────────────────────────────────────
  { id: 'days_10',    title: 'Consistent tracker',  description: 'Use the app on 10+ days',         emoji: '📅', category: 'consistency' as const, tier: 'bronze' as const, threshold: 10 },
  { id: 'days_30',    title: 'Habit formed',         description: 'Use the app on 30+ days',         emoji: '🗓️', category: 'consistency' as const, tier: 'silver' as const, threshold: 30 },
  { id: 'days_100',   title: 'Finance addict',       description: 'Use the app on 100+ days',        emoji: '🏆', category: 'consistency' as const, tier: 'gold' as const,   threshold: 100 },
];

export function computeAchievements(score: ScoreData, stats: StatsData): Achievement[] {
  const pctUsed = stats.monthlyBudget > 0
    ? (stats.spentThisMonth / stats.monthlyBudget) * 100
    : 100;

  return ACHIEVEMENTS_DEFS.map((def) => {
    let unlocked = false;
    let progress = 0;

    switch (def.category) {
      case 'streak':
        unlocked = score.longestStreak >= def.threshold;
        progress = Math.min((score.streak / def.threshold) * 100, 100);
        break;
      case 'score':
        unlocked = score.score >= def.threshold;
        progress = Math.min((score.score / def.threshold) * 100, 100);
        break;
      case 'budget':
        if (def.id === 'budget_on') {
          unlocked = pctUsed <= 100;
          progress = unlocked ? 100 : Math.max(0, 100 - pctUsed);
        } else if (def.id === 'budget_50') {
          unlocked = pctUsed <= 50;
          progress = unlocked ? 100 : Math.max(0, (1 - pctUsed / 50) * 100 + 50);
        }
        break;
      case 'investment':
        unlocked = stats.totalHoldings >= def.threshold;
        progress = Math.min((stats.totalHoldings / def.threshold) * 100, 100);
        break;
      case 'consistency':
        unlocked = score.totalActiveDays >= def.threshold;
        progress = Math.min((score.totalActiveDays / def.threshold) * 100, 100);
        break;
    }

    return {
      id: def.id,
      title: def.title,
      description: def.description,
      emoji: def.emoji,
      category: def.category,
      tier: def.tier,
      unlocked,
      progress: Math.round(progress),
    };
  });
}

export const TIER_STYLES: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  bronze:   { bg: 'bg-orange-50',  border: 'border-orange-200', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-700' },
  silver:   { bg: 'bg-gray-50',    border: 'border-gray-200',   text: 'text-gray-600',   badge: 'bg-gray-100 text-gray-600' },
  gold:     { bg: 'bg-yellow-50',  border: 'border-yellow-200', text: 'text-yellow-700', badge: 'bg-yellow-100 text-yellow-700' },
  platinum: { bg: 'bg-purple-50',  border: 'border-purple-200', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-700' },
};
