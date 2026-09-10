'use client';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell, ReferenceLine,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';

interface BarItem {
  name: string;
  symbol?: string;
  percentReturn: number;
  absoluteReturn: number;
  currentValue: number;
  currency?: string;
}

interface ReturnBarChartProps {
  data: BarItem[];
  currency?: string;
}

const CustomTooltip = ({ active, payload, currency }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-900 mb-1">{d.name}</p>
      <p className={`font-bold text-base ${d.percentReturn >= 0 ? 'text-green-600' : 'text-red-500'}`}>
        {d.percentReturn >= 0 ? '+' : ''}{d.percentReturn.toFixed(2)}%
      </p>
      <p className="text-xs text-gray-400 mt-1">
        P&L: {d.absoluteReturn >= 0 ? '+' : ''}{formatCurrency(Math.abs(d.absoluteReturn), currency)}
      </p>
    </div>
  );
};

export default function ReturnBarChart({ data, currency = 'INR' }: ReturnBarChartProps) {
  if (!data?.length) {
    return <div className="h-48 flex items-center justify-center text-sm text-gray-400">No holdings yet</div>;
  }

  const sorted = [...data].sort((a, b) => b.percentReturn - a.percentReturn).slice(0, 12);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={sorted} margin={{ top: 5, right: 5, bottom: 20, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
        <XAxis
          dataKey="symbol"
          tick={{ fontSize: 10, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
          interval={0}
          angle={-35}
          textAnchor="end"
          height={40}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${v}%`}
          width={42}
        />
        <ReferenceLine y={0} stroke="#e5e7eb" strokeWidth={1} />
        <Tooltip content={<CustomTooltip currency={currency} />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
        <Bar dataKey="percentReturn" radius={[4, 4, 0, 0]} maxBarSize={40}>
          {sorted.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.percentReturn >= 0 ? '#22c55e' : '#ef4444'}
              fillOpacity={0.85}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
