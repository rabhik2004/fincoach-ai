'use client';
import { useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/utils';
import { User, DollarSign, Loader2, Save } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useRequireAuth();
  const { updateUser } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || '',
    currency: user?.currency || 'USD',
    monthlyBudget: String(user?.monthlyBudget || 3000),
  });
  const [loading, setLoading] = useState(false);

  const set = (k: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.patch('/auth/profile', {
        name: form.name,
        currency: form.currency,
        monthlyBudget: parseFloat(form.monthlyBudget),
      });
      updateUser({
        name: form.name,
        currency: form.currency,
        monthlyBudget: parseFloat(form.monthlyBudget),
      });
      toast.success('Profile updated');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <AppShell>
      <div className="animate-fade-in max-w-2xl">
        <div className="page-header">
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your profile and preferences</p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Profile */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-5">
              <User size={18} className="text-brand-600" />
              <h2 className="font-semibold text-gray-900">Profile</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Full name</label>
                <input type="text" className="input" value={form.name} onChange={set('name')} required />
              </div>
              <div>
                <label className="label">Email address</label>
                <input type="email" className="input bg-gray-50" value={user.email} disabled />
                <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
              </div>
            </div>
          </div>

          {/* Financial */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-5">
              <DollarSign size={18} className="text-brand-600" />
              <h2 className="font-semibold text-gray-900">Financial preferences</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Monthly budget</label>
                <input
                  type="number"
                  className="input"
                  value={form.monthlyBudget}
                  onChange={set('monthlyBudget')}
                  min="0"
                  step="50"
                />
                <p className="text-xs text-gray-400 mt-1">Used for budget tracking & AI advice</p>
              </div>
              <div>
                <label className="label">Currency</label>
                <select className="input" value={form.currency} onChange={set('currency')}>
                  {['USD', 'EUR', 'GBP', 'INR', 'JPY', 'CAD', 'AUD'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save changes
          </button>
        </form>
      </div>
    </AppShell>
  );
}
