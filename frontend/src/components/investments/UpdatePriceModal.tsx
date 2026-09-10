'use client';
import { useState } from 'react';
import { Investment } from '@/types/investment';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { getErrorMessage, formatINR } from '@/lib/utils';
import { X, Loader2 } from 'lucide-react';

interface Props { investment: Investment; onClose: () => void; onUpdated: (inv: Investment) => void; }

export default function UpdatePriceModal({ investment: inv, onClose, onUpdated }: Props) {
  const [price, setPrice] = useState(String(inv.currentPrice));
  const [loading, setLoading] = useState(false);

  const newCurrent = parseFloat(price || '0') * inv.quantity;
  const newGain = newCurrent - inv.investedAmount;
  const newPct = inv.investedAmount > 0 ? (newGain / inv.investedAmount) * 100 : 0;
  const diff = parseFloat(price || '0') - inv.currentPrice;

  const handleSave = async () => {
    const p = parseFloat(price);
    if (isNaN(p) || p <= 0) return toast.error('Enter a valid price');
    setLoading(true);
    try {
      const { data } = await api.put(`/investments/${inv._id}`, { ...inv, currentPrice: p });
      onUpdated(data.data);
      toast.success('Price updated');
      onClose();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-slide-up p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Update current price</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"><X size={16} /></button>
        </div>

        <div className="text-sm text-gray-500">
          <span className="font-medium text-gray-800">{inv.name}</span>
          {inv.symbol && <span className="ml-1 text-gray-400">({inv.symbol})</span>}
        </div>

        <div>
          <label className="label">New current price (₹)</label>
          <input
            type="number" className="input text-lg font-semibold" step="any" min="0"
            value={price} onChange={e => setPrice(e.target.value)} autoFocus
          />
          {diff !== 0 && (
            <p className={`text-xs mt-1 ${diff > 0 ? 'text-green-600' : 'text-red-500'}`}>
              {diff > 0 ? '+' : ''}₹{diff.toFixed(2)} from previous price (₹{inv.currentPrice})
            </p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          {[
            { label: 'New value', val: formatINR(newCurrent) },
            { label: 'Total P&L', val: `${newGain >= 0 ? '+' : ''}${formatINR(newGain)}`, color: newGain >= 0 ? 'text-green-600' : 'text-red-500' },
            { label: 'Return', val: `${newPct >= 0 ? '+' : ''}${newPct.toFixed(2)}%`, color: newPct >= 0 ? 'text-green-600' : 'text-red-500' },
          ].map(s => (
            <div key={s.label} className="bg-gray-50 rounded-lg p-2">
              <p className="text-gray-400 mb-0.5">{s.label}</p>
              <p className={`font-semibold ${s.color || 'text-gray-800'}`}>{s.val}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleSave} disabled={loading} className="btn-primary flex-1">
            {loading ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Saving...</span> : 'Update price'}
          </button>
        </div>
      </div>
    </div>
  );
}
