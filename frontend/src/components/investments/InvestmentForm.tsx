'use client';
import { useState, useEffect } from 'react';
import { Investment } from '@/types/investment';
import { INVESTMENT_TYPES, SECTORS, INVESTMENT_GOALS, getErrorMessage } from '@/lib/utils';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { X, Loader2, TrendingUp, TrendingDown } from 'lucide-react';

interface Props { investment?: Investment | null; onClose: () => void; onSaved: (inv: Investment) => void; }

const EMPTY = {
  name: '', symbol: '', type: 'Stock', sector: 'Technology',
  quantity: '', avgBuyPrice: '', currentPrice: '',
  exchange: '', currency: 'INR', isSIP: false,
  sipAmount: '', sipDate: '', notes: '', goal: '',
};

export default function InvestmentForm({ investment, onClose, onSaved }: Props) {
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (investment) setForm({
      name: investment.name, symbol: investment.symbol || '',
      type: investment.type, sector: investment.sector || 'Other',
      quantity: String(investment.quantity), avgBuyPrice: String(investment.avgBuyPrice),
      currentPrice: String(investment.currentPrice), exchange: investment.exchange || '',
      currency: investment.currency || 'INR', isSIP: investment.isSIP || false,
      sipAmount: investment.sipAmount ? String(investment.sipAmount) : '',
      sipDate: investment.sipDate ? String(investment.sipDate) : '',
      notes: investment.notes || '', goal: investment.goal || '',
    });
  }, [investment]);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const type = e.target.value;
    const defaults: Record<string, string> = { Crypto: 'Crypto', Gold: 'Commodities', Bond: 'Finance', 'Real Estate': 'Real Estate', ETF: 'Diversified', 'Mutual Fund': 'Diversified' };
    setForm(f => ({ ...f, type, sector: defaults[type] || f.sector }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(form.quantity), buyP = parseFloat(form.avgBuyPrice), curP = parseFloat(form.currentPrice);
    if (!form.name) return toast.error('Name is required');
    if (isNaN(qty) || qty <= 0) return toast.error('Enter a valid quantity');
    if (isNaN(buyP) || buyP <= 0) return toast.error('Enter a valid buy price');
    if (isNaN(curP) || curP <= 0) return toast.error('Enter a valid current price');
    setLoading(true);
    try {
      const payload = { ...form, quantity: qty, avgBuyPrice: buyP, currentPrice: curP, sipAmount: form.sipAmount ? parseFloat(form.sipAmount) : undefined, sipDate: form.sipDate ? parseInt(form.sipDate) : undefined, goal: form.goal || null };
      let saved: Investment;
      if (investment?._id) {
        const { data } = await api.put(`/investments/${investment._id}`, payload);
        saved = data.data; toast.success('Investment updated');
      } else {
        const { data } = await api.post('/investments', payload);
        saved = data.data; toast.success('Investment added');
      }
      onSaved(saved); onClose();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  };

  const invested = parseFloat(form.quantity || '0') * parseFloat(form.avgBuyPrice || '0');
  const current = parseFloat(form.quantity || '0') * parseFloat(form.currentPrice || '0');
  const gain = current - invested;
  const gainPct = invested > 0 ? (gain / invested) * 100 : 0;
  const showPreview = invested > 0 || current > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col animate-slide-up">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 flex-shrink-0">
          <h2 className="font-semibold text-gray-900">{investment ? 'Edit investment' : 'Add investment'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition"><X size={18} /></button>
        </div>

        {showPreview && (
          <div className="flex gap-2 px-5 pt-4 flex-shrink-0">
            {[
              { label: 'Invested', val: `₹${invested.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, color: 'bg-gray-50 text-gray-800' },
              { label: 'Current', val: `₹${current.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, color: 'bg-gray-50 text-gray-800' },
              { label: 'Return', val: `${gain >= 0 ? '+' : ''}${gainPct.toFixed(1)}%`, color: gain >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700' },
            ].map(s => (
              <div key={s.label} className={`flex-1 rounded-xl p-2.5 text-center ${s.color}`}>
                <p className="text-xs text-gray-400 mb-0.5">{s.label}</p>
                <p className="font-semibold text-sm">{s.val}</p>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-3.5">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="label">Name <span className="text-red-400">*</span></label>
              <input className="input" placeholder="e.g. Reliance Industries" value={form.name} onChange={set('name')} required autoFocus />
            </div>
            <div>
              <label className="label">Ticker</label>
              <input className="input" style={{ textTransform: 'uppercase' }} placeholder="RELIANCE" value={form.symbol} onChange={e => setForm(f => ({ ...f, symbol: e.target.value.toUpperCase() }))} maxLength={20} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Asset type <span className="text-red-400">*</span></label>
              <select className="input" value={form.type} onChange={handleTypeChange}>
                {INVESTMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Sector</label>
              <select className="input" value={form.sector} onChange={set('sector')}>
                {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Quantity <span className="text-red-400">*</span></label>
              <input type="number" className="input" placeholder="10" value={form.quantity} onChange={set('quantity')} step="any" min="0" required />
            </div>
            <div>
              <label className="label">Avg buy ₹ <span className="text-red-400">*</span></label>
              <input type="number" className="input" placeholder="2350" value={form.avgBuyPrice} onChange={set('avgBuyPrice')} step="any" min="0" required />
            </div>
            <div>
              <label className="label">Current ₹ <span className="text-red-400">*</span></label>
              <input type="number" className="input" placeholder="2720" value={form.currentPrice} onChange={set('currentPrice')} step="any" min="0" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Exchange</label>
              <select className="input" value={form.exchange} onChange={set('exchange')}>
                <option value="">— None —</option>
                {['NSE', 'BSE', 'NASDAQ', 'NYSE', 'Crypto Exchange', 'Other'].map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Goal</label>
              <select className="input" value={form.goal} onChange={set('goal')}>
                <option value="">— Untagged —</option>
                {INVESTMENT_GOALS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>

          <div className="p-3 bg-brand-50 rounded-xl space-y-3">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isSIP" className="w-4 h-4 accent-brand-600" checked={form.isSIP} onChange={e => setForm(f => ({ ...f, isSIP: e.target.checked }))} />
              <label htmlFor="isSIP" className="text-sm font-medium text-brand-800 cursor-pointer">This is a SIP (Systematic Investment Plan)</label>
            </div>
            {form.isSIP && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label text-xs">Monthly amount (₹)</label>
                  <input type="number" className="input text-sm" placeholder="5000" value={form.sipAmount} onChange={set('sipAmount')} min="0" />
                </div>
                <div>
                  <label className="label text-xs">SIP date (1–31)</label>
                  <input type="number" className="input text-sm" placeholder="5" value={form.sipDate} onChange={set('sipDate')} min="1" max="31" />
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="label">Notes (optional)</label>
            <textarea className="input resize-none" placeholder="Any notes..." value={form.notes} onChange={set('notes')} rows={2} maxLength={300} />
          </div>
        </form>

        <div className="flex gap-3 p-5 border-t border-gray-100 flex-shrink-0">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="button" onClick={handleSubmit} disabled={loading} className="btn-primary flex-1">
            {loading ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />{investment ? 'Saving...' : 'Adding...'}</span> : investment ? 'Save changes' : 'Add investment'}
          </button>
        </div>
      </div>
    </div>
  );
}
