'use client';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Area, AreaChart,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';

interface MonthlyChartProps {
  data: { month: string; total: number }[];
  currency?: string;
}

const CustomTooltip = ({ active, payload, label, currency }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3 text-sm">
        <p className="font-semibold text-gray-700 mb-1">{label}</p>
        <p className="text-brand-600 font-bold">{formatCurrency(payload[0].value, currency)}</p>
      </div>
    );
  }
  return null;
};

export default function MonthlyChart({ data, currency = 'USD' }: MonthlyChartProps) {
  if (!data?.length) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
        No data yet. Add some expenses to see your trend.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#16a34a" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 12, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => v.split(' ')[0]}
        />
        <YAxis
          tick={{ fontSize: 12, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
          width={45}
        />
        <Tooltip content={<CustomTooltip currency={currency} />} />
        <Area
          type="monotone"
          dataKey="total"
          stroke="#16a34a"
          strokeWidth={2.5}
          fill="url(#colorTotal)"
          dot={{ fill: '#16a34a', strokeWidth: 0, r: 4 }}
          activeDot={{ r: 6, fill: '#16a34a', strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
