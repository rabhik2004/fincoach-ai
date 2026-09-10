'use client';
import { Investment } from '@/types/investment';
import { ASSET_TYPE_COLORS, formatINR } from '@/lib/utils';
import { Pencil, Trash2, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  investment: Investment;
  onEdit: (inv: Investment) => void;
  onDelete: (id: string) => void;
  onUpdatePrice: (inv: Investment) => void;
  deleting: boolean;
}

export default function HoldingRow({
  investment: inv,
  onEdit,
  onDelete,
  onUpdatePrice,
  deleting
}: Props) {

  // 🔥 SAFE VALUES
  const quantity = inv.quantity ?? 0;
  const buyPrice = inv.avgBuyPrice ?? 0;
  const currentPrice = inv.currentPrice ?? 0;

  // 🔥 CALCULATIONS (CORE FIX)
  const invested = quantity * buyPrice;
  const currentValue = quantity * currentPrice;
  const absoluteReturn = currentValue - invested;
  const percentReturn =
    invested > 0 ? (absoluteReturn / invested) * 100 : 0;

  const isGain = absoluteReturn >= 0;

  const color = ASSET_TYPE_COLORS[inv.type] || '#6b7280';

  return (
    <tr className="hover:bg-gray-50/60 transition group">

      {/* Name + type */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
            style={{ backgroundColor: color }}
          >
            {inv.symbol
              ? inv.symbol.slice(0, 3)
              : inv.type.slice(0, 3).toUpperCase()}
          </div>

          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate max-w-[180px]">
              {inv.name}
            </p>

            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="badge bg-gray-100 text-gray-500 text-[10px] px-1.5 py-0.5">
                {inv.type}
              </span>

              {inv.isSIP && (
                <span className="badge bg-brand-50 text-brand-600 text-[10px] px-1.5 py-0.5">
                  SIP
                </span>
              )}

              {inv.goal && (
                <span className="badge bg-purple-50 text-purple-600 text-[10px] px-1.5 py-0.5">
                  {inv.goal}
                </span>
              )}
            </div>
          </div>
        </div>
      </td>

      {/* Quantity */}
      <td className="px-4 py-3.5 text-sm text-gray-500">
        <p>
          {quantity.toLocaleString('en-IN', { maximumFractionDigits: 4 })} units
        </p>
        <p className="text-xs text-gray-400">
          @ ₹{buyPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
        </p>
      </td>

      {/* Invested */}
      <td className="px-4 py-3.5 text-sm text-gray-700 font-medium">
        {formatINR(invested)}
      </td>

      {/* Current value */}
      <td className="px-4 py-3.5">
        <p className="text-sm font-semibold text-gray-900">
          {formatINR(currentValue)}
        </p>
        <p className="text-xs text-gray-400">
          ₹{currentPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })} / unit
        </p>
      </td>

      {/* P&L */}
      <td className="px-4 py-3.5">
        <div
          className={cn(
            'inline-flex flex-col items-end',
            isGain ? 'text-green-600' : 'text-red-500'
          )}
        >
          <span className="text-sm font-semibold">
            {isGain ? '+' : ''}
            {formatINR(absoluteReturn)}
          </span>

          <span className="text-xs font-medium">
            {isGain ? '+' : ''}
            {percentReturn.toFixed(2)}%
          </span>
        </div>
      </td>

      {/* Actions */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">

          <button
            onClick={() => onUpdatePrice(inv)}
            title="Update price"
            className="p-1.5 rounded-lg text-gray-400 hover:bg-brand-50 hover:text-brand-600 transition"
          >
            <RefreshCw size={13} />
          </button>

          <button
            onClick={() => onEdit(inv)}
            title="Edit"
            className="p-1.5 rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-500 transition"
          >
            <Pencil size={13} />
          </button>

          <button
            onClick={() => onDelete(inv._id)}
            disabled={deleting}
            title="Delete"
            className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition disabled:opacity-40"
          >
            {deleting ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Trash2 size={13} />
            )}
          </button>

        </div>
      </td>

    </tr>
  );
}