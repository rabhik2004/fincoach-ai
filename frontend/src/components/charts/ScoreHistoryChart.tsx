'use client';
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts';

interface ScorePoint { date: string; score: number }

interface ScoreHistoryChartProps {
  data: ScorePoint[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const score = payload[0].value;
  const color = score >= 85 ? '#22c55e' : score >= 70 ? '#3b82f6' : score >= 55 ? '#f59e0b' : '#ef4444';
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-3 py-2 text-sm">
      <p className="text-gray-400 text-xs mb-0.5">{label}</p>
      <p className="font-bold" style={{ color }}>{score}</p>
    </div>
  );
};

export default function ScoreHistoryChart({ data }: ScoreHistoryChartProps) {
  if (!data?.length) {
    return <div className="h-48 flex items-center justify-center text-sm text-gray-400">No history yet — come back tomorrow!</div>;
  }

  const formatted = data.map((d) => ({
    ...d,
    day: d.date.slice(5), // 'MM-DD'
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={formatted} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#16a34a" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
        <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={28} />
        <ReferenceLine y={70} stroke="#3b82f6" strokeDasharray="4 3" strokeWidth={0.8} label={{ value: 'Good', position: 'insideTopRight', fontSize: 10, fill: '#93c5fd' }} />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#e5e7eb', strokeWidth: 1 }} />
        <Area
          type="monotone" dataKey="score"
          stroke="#16a34a" strokeWidth={2.5}
          fill="url(#scoreGrad)"
          dot={false}
          activeDot={{ r: 5, fill: '#16a34a', strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
