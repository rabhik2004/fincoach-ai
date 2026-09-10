'use client';
import { useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { ASSET_TYPE_COLORS, SECTOR_COLORS, formatINR } from '@/lib/utils';
import { TypeAllocation, SectorAllocation } from '@/types/investment';

interface Props { byType: TypeAllocation[]; bySector: SectorAllocation[]; }

const Tip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3 text-sm min-w-[150px]">
      <p className="font-semibold text-gray-800 mb-1">{d.type || d.sector}</p>
      <p className="text-gray-600">{formatINR(d.current)}</p>
      <p className="text-gray-400 text-xs">{d.allocation}% of portfolio</p>
      {d.return !== undefined && (
        <p className={`text-xs font-medium mt-0.5 ${d.return >= 0 ? 'text-green-600' : 'text-red-500'}`}>
          {d.return >= 0 ? '+' : ''}{d.return}% return
        </p>
      )}
    </div>
  );
};

const renderPct = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.06) return null;
  const R = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  return (
    <text x={cx + r * Math.cos(-midAngle * R)} y={cy + r * Math.sin(-midAngle * R)}
      fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function AllocationChart({ byType, bySector }: Props) {
  const [mode, setMode] = useState<'type' | 'sector'>('type');
  const data = mode === 'type' ? byType : bySector;
  const colorMap = mode === 'type' ? ASSET_TYPE_COLORS : SECTOR_COLORS;
  const key = mode === 'type' ? 'type' : 'sector';
  if (!data?.length) return <div className="h-64 flex items-center justify-center text-gray-400 text-sm">No holdings yet</div>;
  return (
    <div>
      <div className="flex gap-2 mb-3">
        {(['type', 'sector'] as const).map(m => (
          <button key={m} onClick={() => setMode(m)} className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${mode === m ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
            By {m}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={256}>
        <PieChart>
          <Pie data={data} dataKey="current" nameKey={key} cx="50%" cy="46%" innerRadius={52} outerRadius={90} labelLine={false} label={renderPct} paddingAngle={2}>
            {data.map((entry: any) => <Cell key={entry[key]} fill={colorMap[entry[key]] || '#6b7280'} />)}
          </Pie>
          <Tooltip content={<Tip />} />
          <Legend iconType="circle" iconSize={8} formatter={(v) => {
  const value = v || '';
  return (
    <span style={{ fontSize: 11, color: '#6b7280' }}>
      {value.length > 15 ? value.slice(0, 13) + '…' : value}
    </span>
  );
}} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
