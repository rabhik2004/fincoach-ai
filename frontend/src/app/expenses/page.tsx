'use client';
import { useEffect, useState, useCallback } from 'react';
import AppShell from '@/components/layout/AppShell';
import ExpenseForm from '@/components/expenses/ExpenseForm';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { formatCurrency, formatDate, CATEGORIES, CATEGORY_COLORS, getErrorMessage } from '@/lib/utils';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Plus, Pencil, Trash2, Search, Filter,
  ChevronLeft, ChevronRight, Loader2, ReceiptText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Expense {
  _id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  notes?: string;
  isRecurring?: boolean;
}

interface Pagination {
  total: number;
  page: number;
  pages: number;
  limit: number;
}

export default function ExpensesPage() {
  const { user } = useRequireAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '12',
        sort: '-date',
      });
      if (category) params.set('category', category);

      const { data } = await api.get(`/expenses?${params}`);
      setExpenses(data.data);
      setPagination(data.pagination);
    } catch {
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  }, [page, category]);

  useEffect(() => {
    if (user) fetchExpenses();
  }, [user, fetchExpenses]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this expense?')) return;
    setDeletingId(id);
    try {
      await api.delete(`/expenses/${id}`);
      toast.success('Expense deleted');
      setExpenses((prev) => prev.filter((e) => e._id !== id));
      setPagination((p) => p ? { ...p, total: p.total - 1 } : p);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaved = (expense: Expense) => {
    setExpenses((prev) => {
      const idx = prev.findIndex((e) => e._id === expense._id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = expense;
        return next;
      }
      return [expense, ...prev];
    });
    if (!editExpense) {
      setPagination((p) => p ? { ...p, total: p.total + 1 } : p);
    }
  };

  const filtered = search
    ? expenses.filter((e) =>
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.category.toLowerCase().includes(search.toLowerCase())
      )
    : expenses;

  if (!user) return null;

  return (
    <AppShell>
      <div className="animate-fade-in">
        {/* Header */}
        <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="page-title">Expenses</h1>
            <p className="page-subtitle">
              {pagination ? `${pagination.total} total transactions` : 'Manage your spending'}
            </p>
          </div>
          <button
            onClick={() => { setEditExpense(null); setShowForm(true); }}
            className="btn-primary flex items-center gap-2 self-start"
          >
            <Plus size={16} /> Add expense
          </button>
        </div>

        {/* Filters */}
        <div className="card p-4 mb-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              className="input pl-9"
              placeholder="Search expenses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400 flex-shrink-0" />
            <select
              className="input w-auto min-w-[160px]"
              value={category}
              onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            >
              <option value="">All categories</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="p-8 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <ReceiptText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">No expenses found</p>
              <p className="text-gray-300 text-sm mt-1">
                {search || category ? 'Try different filters' : 'Add your first expense above'}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-50">
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Expense
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map((exp) => (
                      <tr key={exp._id} className="hover:bg-gray-50/50 transition group">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                              style={{ backgroundColor: CATEGORY_COLORS[exp.category] || '#6b7280' }}
                            >
                              {exp.category[0]}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-800">{exp.title}</p>
                              {exp.notes && (
                                <p className="text-xs text-gray-400 truncate max-w-[200px]">{exp.notes}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="badge bg-gray-100 text-gray-600">{exp.category}</span>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-500">{formatDate(exp.date)}</td>
                        <td className="px-5 py-3.5 text-right">
                          <span className="text-sm font-semibold text-gray-900">
                            {formatCurrency(exp.amount, user.currency)}
                          </span>
                          {exp.isRecurring && (
                            <span className="ml-1.5 text-xs text-brand-500">↻</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
                            <button
                              onClick={() => { setEditExpense(exp); setShowForm(true); }}
                              className="p-1.5 rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-500 transition"
                              title="Edit"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(exp._id)}
                              disabled={deletingId === exp._id}
                              className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition disabled:opacity-50"
                              title="Delete"
                            >
                              {deletingId === exp._id ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Trash2 size={14} />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="sm:hidden divide-y divide-gray-50">
                {filtered.map((exp) => (
                  <div key={exp._id} className="p-4 flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: CATEGORY_COLORS[exp.category] || '#6b7280' }}
                    >
                      {exp.category[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{exp.title}</p>
                      <p className="text-xs text-gray-400">{exp.category} · {formatDate(exp.date)}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(exp.amount, user.currency)}
                      </span>
                      <button
                        onClick={() => { setEditExpense(exp); setShowForm(true); }}
                        className="p-1.5 ml-1 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(exp._id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-400">
              Page {pagination.page} of {pagination.pages} · {pagination.total} results
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={pagination.page === 1}
                className="btn-secondary py-1.5 px-3 text-sm flex items-center gap-1 disabled:opacity-40"
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={pagination.page === pagination.pages}
                className="btn-secondary py-1.5 px-3 text-sm flex items-center gap-1 disabled:opacity-40"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Form modal */}
      {showForm && (
        <ExpenseForm
          expense={editExpense}
          onClose={() => { setShowForm(false); setEditExpense(null); }}
          onSaved={handleSaved}
        />
      )}
    </AppShell>
  );
}
