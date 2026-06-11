import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useDemoData } from '../context/DemoContext';
import IncomeForm from '../components/forms/IncomeForm';
import EmptyState from '../components/shared/EmptyState';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Wallet, Trash2, TrendingUp, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

export default function IncomeLogger() {
  const { accounts } = useApp();
  const { isAuthenticated } = useAuth();
  const demoData = useDemoData();
  const [incomeEntries, setIncomeEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  // Fetch from Supabase (authenticated mode)
  const fetchIncome = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const [year, month] = selectedMonth.split('-').map(Number);
      const start = startOfMonth(new Date(year, month - 1));
      const end = endOfMonth(new Date(year, month - 1));

      const { data, error } = await supabase
        .from('income')
        .select('*')
        .gte('date', format(start, 'yyyy-MM-dd'))
        .lte('date', format(end, 'yyyy-MM-dd'))
        .order('date', { ascending: false });

      if (error) throw error;
      setIncomeEntries(data || []);
    } catch (err) {
      console.error('Failed to fetch income:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, isAuthenticated]);

  // Demo mode: reactively sync from DemoContext
  useEffect(() => {
    if (!isAuthenticated && demoData) {
      const [year, month] = selectedMonth.split('-').map(Number);
      const start = startOfMonth(new Date(year, month - 1));
      const end = endOfMonth(new Date(year, month - 1));
      const filtered = demoData.income
        .filter((i) => {
          const d = new Date(i.date);
          return d >= start && d <= end;
        })
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      setIncomeEntries(filtered);
      setLoading(false);
    }
  }, [isAuthenticated, demoData?.income, selectedMonth]);

  useEffect(() => {
    fetchIncome();
  }, [fetchIncome]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this income entry?')) return;
    try {
      if (isAuthenticated) {
        const { error } = await supabase.from('income').delete().eq('id', id);
        if (error) throw error;
        fetchIncome();
      } else {
        demoData.deleteIncome(id);
      }
      toast.success('Income deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const getAccountName = (id) => accounts.find((a) => a.id === id)?.name || '—';

  const monthTotal = incomeEntries.reduce((s, e) => s + Number(e.amount), 0);

  // Group by source
  const bySource = incomeEntries.reduce((acc, entry) => {
    if (!acc[entry.source]) acc[entry.source] = 0;
    acc[entry.source] += Number(entry.amount);
    return acc;
  }, {});

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 animate-fade-in">
      {/* Left: Form */}
      <div className="lg:col-span-2">
        <div className="glass-card-static p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-income/10">
              <Wallet size={20} className="text-income-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Record Income</h2>
              <p className="text-xs text-surface-500">Track all cash inflows</p>
            </div>
          </div>
          <IncomeForm onSaved={fetchIncome} />
        </div>
      </div>

      {/* Right: Monthly summary + list */}
      <div className="lg:col-span-3">
        {/* Month picker */}
        <div className="glass-card-static p-4 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Calendar size={16} className="text-income-400 flex-shrink-0" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="input-glass !w-full sm:!w-auto !py-1.5 !px-3 !text-sm"
            />
          </div>
          <div className="text-left sm:text-right w-full sm:w-auto border-t border-white/[0.04] pt-2 sm:pt-0 sm:border-none">
            <p className="text-xs text-surface-500">Total Income</p>
            <p className="text-xl font-bold text-gradient-income">
              ₹{monthTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Source Breakdown */}
        {Object.keys(bySource).length > 0 && (
          <div className="glass-card-static p-4 mb-4">
            <h4 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">
              By Source
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(bySource).map(([source, total]) => (
                <div key={source} className="p-3 rounded-xl bg-white/[0.03]">
                  <p className="text-[10px] text-surface-500 font-medium">{source}</p>
                  <p className="text-sm font-bold text-income-400">
                    ₹{total.toLocaleString('en-IN')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Income List */}
        <div className="glass-card-static p-4 sm:p-6">
          <h3 className="text-sm font-bold text-white mb-4">Income Entries</h3>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 rounded-xl bg-white/[0.03] animate-pulse" />
              ))}
            </div>
          ) : incomeEntries.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="No income this month"
              description="Use the form on the left to record income"
            />
          ) : (
            <div className="space-y-2">
              {/* Desktop View */}
              <div className="hidden md:block space-y-2">
                {incomeEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="group flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-colors"
                  >
                    <div className="w-2 h-2 rounded-full bg-income-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-sm font-semibold text-white truncate">{entry.source}</span>
                        <span className="badge-income !text-[10px] flex-shrink-0">
                          {getAccountName(entry.account_id)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                        <span className="text-[10px] text-surface-500">
                          {format(new Date(entry.date), 'd MMM yyyy')}
                        </span>
                        {entry.notes && (
                          <>
                            <span className="text-[10px] text-surface-600">•</span>
                            <span className="text-[10px] text-surface-500 truncate">{entry.notes}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-bold text-income-400 flex-shrink-0">
                      +₹{Number(entry.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="opacity-0 group-hover:opacity-100 text-surface-600 hover:text-expense-400 transition-all flex-shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Mobile Stacked Card View */}
              <div className="md:hidden space-y-3">
                {incomeEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-2 relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="badge-income !text-[10px] flex-shrink-0">
                        {entry.source}
                      </span>
                      <span className="font-bold text-income-400">
                        +₹{Number(entry.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {entry.account_id && (
                      <div className="text-xs text-surface-400">
                        Account: <span className="text-surface-300 font-medium">{getAccountName(entry.account_id)}</span>
                      </div>
                    )}
                    <div className="text-[11px] text-surface-500 flex justify-between pr-6">
                      <span>{format(new Date(entry.date), 'd MMM yyyy')}</span>
                    </div>
                    {entry.notes && (
                      <p className="text-xs text-surface-600 border-t border-white/[0.04] pt-1.5 mt-1 pr-6">
                        {entry.notes}
                      </p>
                    )}
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="absolute right-3 bottom-3 text-surface-500 hover:text-expense-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
