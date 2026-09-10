'use client';
import { useState, useEffect } from 'react';
import { CATEGORIES, getErrorMessage } from '@/lib/utils';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { X, Loader2 } from 'lucide-react';

interface Expense {
  _id?: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  notes?: string;
  isRecurring?: boolean;
}

interface ExpenseFormProps {
  expense?: Expense | null;
  onClose: () => void;
  onSaved: (expense: Expense) => void;
}

const today = () => new Date().toISOString().split('T')[0];

export default function ExpenseForm({ expense, onClose, onSaved }: ExpenseFormProps) {
  const [form, setForm] = useState({
    title: '',
    amount: '',
    category: 'Food & Dining',
    date: today(),
    notes: '',
    isRecurring: false,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (expense) {
      setForm({
        title: expense.title,
        amount: String(expense.amount),
        category: expense.category,
        date: expense.date.split('T')[0],
        notes: expense.notes || '',
        isRecurring: expense.isRecurring || false,
      });
    }
  }, [expense]);

  const set = (k: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.amount || !form.category) {
      return toast.error('Please fill in all required fields');
    }
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) return toast.error('Enter a valid amount');

    setLoading(true);
    try {
      const payload = { ...form, amount };
      let saved;
      if (expense?._id) {
        const { data } = await api.put(`/expenses/${expense._id}`, payload);
        saved = data.data;
        toast.success('Expense updated');
      } else {
        const { data } = await api.post('/expenses', payload);
        saved = data.data;
        toast.success('Expense added');
      }
      onSaved(saved);
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">
            {expense ? 'Edit expense' : 'Add expense'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="label">Title <span className="text-red-400">*</span></label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Grocery shopping"
              value={form.title}
              onChange={set('title')}
              maxLength={100}
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Amount ($) <span className="text-red-400">*</span></label>
              <input
                type="number"
                className="input"
                placeholder="0.00"
                value={form.amount}
                onChange={set('amount')}
                step="0.01"
                min="0.01"
                required
              />
            </div>
            <div>
              <label className="label">Date <span className="text-red-400">*</span></label>
              <input
                type="date"
                className="input"
                value={form.date}
                onChange={set('date')}
                max={today()}
                required
              />
            </div>
          </div>

          <div>
            <label className="label">Category <span className="text-red-400">*</span></label>
            <select className="input" value={form.category} onChange={set('category')}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Notes (optional)</label>
            <textarea
              className="input resize-none"
              placeholder="Any additional details..."
              value={form.notes}
              onChange={set('notes')}
              rows={2}
              maxLength={300}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="recurring"
              className="w-4 h-4 accent-brand-600 rounded"
              checked={form.isRecurring}
              onChange={(e) => setForm((f) => ({ ...f, isRecurring: e.target.checked }))}
            />
            <label htmlFor="recurring" className="text-sm text-gray-600 cursor-pointer">
              This is a recurring expense
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {expense ? 'Updating...' : 'Adding...'}
                </span>
              ) : (
                expense ? 'Update' : 'Add expense'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
