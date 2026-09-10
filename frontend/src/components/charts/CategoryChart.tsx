'use client';
import {
  ResponsiveContainer, PieChart, Pie, Cell,
  Tooltip, Legend,
} from 'recharts';
import { formatCurrency, CATEGORY_COLORS } from '@/lib/utils';

interface CategoryChartProps {
  data: { _id: string; total: number; count: number }[];
  currency?: string;
}

const CustomTooltip = ({ active, payload, currency }: any) => {
  if (active && payload?.length) {
    const d = payload[0].payload;
    return (
      <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3 text-sm">
        <p className="font-semibold text-gray-800 mb-1">{d._id}</p>
        <p className="text-gray-700">{formatCurrency(d.total, currency)}</p>
        <p className="text-gray-400 text-xs">{d.count} transaction{d.count !== 1 ? 's' : ''}</p>
      </div>
    );
  }
  return null;
};

const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function CategoryChart({ data, currency = 'USD' }: CategoryChartProps) {
  if (!data?.length) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
        No category data yet.
      </div>
    );
  }

  const top = data.slice(0, 8);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={top}
          dataKey="total"
          nameKey="_id"
          cx="50%"
          cy="45%"
          innerRadius={60}
          outerRadius={100}
          labelLine={false}
          label={renderCustomLabel}
          paddingAngle={2}
        >
          {top.map((entry) => (
            <Cell
              key={entry._id}
              fill={CATEGORY_COLORS[entry._id] || '#6b7280'}
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip currency={currency} />} />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => (
            <span style={{ fontSize: 12, color: '#6b7280' }}>
              {value.length > 18 ? value.slice(0, 16) + '…' : value}
            </span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
