import { cn, formatCurrency } from '@/lib/utils';

interface BudgetBarProps {
  spent: number;
  budget: number;
  currency?: string;
}

export default function BudgetBar({ spent, budget, currency = 'USD' }: BudgetBarProps) {
  const pct = Math.min((spent / budget) * 100, 100);
  const over = spent > budget;

  const barColor =
    pct >= 100 ? 'bg-red-500' :
    pct >= 80  ? 'bg-amber-500' :
    pct >= 60  ? 'bg-yellow-400' :
    'bg-brand-500';

  const textColor =
    pct >= 100 ? 'text-red-600' :
    pct >= 80  ? 'text-amber-600' :
    'text-gray-500';

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-sm">
        <span className="font-medium text-gray-700">Monthly budget</span>
        <span className={cn('font-semibold', textColor)}>
          {pct.toFixed(0)}% used
        </span>
      </div>
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-700', barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-400">
        <span>{formatCurrency(spent, currency)} spent</span>
        <span>
          {over
            ? <span className="text-red-500 font-medium">{formatCurrency(spent - budget, currency)} over</span>
            : <span>{formatCurrency(budget - spent, currency)} remaining</span>}
        </span>
      </div>
    </div>
  );
}
