import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';
import ExpenseForm from '../components/forms/ExpenseForm';
import EmptyState from '../components/shared/EmptyState';
import { format, isToday, isYesterday } from 'date-fns';
import { Receipt, Trash2, Clock, IndianRupee } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ExpenseLogger() {
  const { categories, subcategories, accounts, creditCards } = useApp();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRecent = useCallback(async () => {
    try {
      const today = new Date();
      const threeDaysAgo = new Date(today);
      threeDaysAgo.setDate(today.getDate() - 3);

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .gte('date', threeDaysAgo.toISOString())
        .order('date', { ascending: false })
        .limit(50);

      if (error) throw error;
      setTransactions(data || []);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecent();
  }, [fetchRecent]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this transaction?')) return;
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
      toast.success('Transaction deleted');
      fetchRecent();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const getCategoryName = (id) => categories.find((c) => c.id === id)?.name || '—';
  const getSubcategoryName = (id) => subcategories.find((s) => s.id === id)?.name || '';
  const getAccountName = (id) => accounts.find((a) => a.id === id)?.name || '';
  const getCCName = (id) => creditCards.find((c) => c.id === id)?.name || '';

  const todayTotal = transactions
    .filter((t) => isToday(new Date(t.date)))
    .reduce((s, t) => s + Number(t.amount), 0);

  const formatDate = (d) => {
    const date = new Date(d);
    if (isToday(date)) return `Today, ${format(date, 'h:mm a')}`;
    if (isYesterday(date)) return `Yesterday, ${format(date, 'h:mm a')}`;
    return format(date, 'd MMM, h:mm a');
  };

  // Group by date label
  const grouped = transactions.reduce((acc, txn) => {
    const date = new Date(txn.date);
    let label;
    if (isToday(date)) label = 'Today';
    else if (isYesterday(date)) label = 'Yesterday';
    else label = format(date, 'EEEE, d MMMM');

    if (!acc[label]) acc[label] = [];
    acc[label].push(txn);
    return acc;
  }, {});

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 animate-fade-in">
      {/* Left: Form */}
      <div className="lg:col-span-2">
        <div className="glass-card-static p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-expense/10">
              <Receipt size={20} className="text-expense-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Log Expense</h2>
              <p className="text-xs text-surface-500">Record daily transactions</p>
            </div>
          </div>
          <ExpenseForm onSaved={fetchRecent} />
        </div>
      </div>

      {/* Right: Recent Transactions */}
      <div className="lg:col-span-3">
        {/* Today's Running Total */}
        <div className="glass-card-static p-4 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock size={16} className="text-accent-400" />
            <span className="text-sm font-semibold text-white">Today's Spending</span>
          </div>
          <span className="text-xl font-bold text-gradient-expense">
            ₹{todayTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="glass-card-static p-6">
          <h3 className="text-sm font-bold text-white mb-4">Recent Transactions</h3>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-xl bg-white/[0.03] animate-pulse" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No transactions yet"
              description="Start by adding your first expense above"
            />
          ) : (
            <div className="space-y-5">
              {Object.entries(grouped).map(([label, txns]) => (
                <div key={label}>
                  <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2">
                    {label}
                  </p>
                  <div className="space-y-2">
                    {txns.map((txn) => (
                      <div
                        key={txn.id}
                        className="group flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-colors"
                      >
                        {/* Category color dot */}
                        <div className="w-2 h-2 rounded-full bg-expense-400 flex-shrink-0" />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-white truncate">
                              {getCategoryName(txn.category_id)}
                            </span>
                            {getSubcategoryName(txn.subcategory_id) && (
                              <span className="badge-neutral !text-[10px]">
                                {getSubcategoryName(txn.subcategory_id)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-surface-500">
                              {format(new Date(txn.date), 'h:mm a')}
                            </span>
                            <span className="text-[10px] text-surface-600">•</span>
                            <span className="text-[10px] text-surface-500">
                              {txn.payment_method}
                              {txn.credit_card_id ? ` · ${getCCName(txn.credit_card_id)}` : ''}
                              {txn.account_id ? ` · ${getAccountName(txn.account_id)}` : ''}
                            </span>
                          </div>
                          {txn.notes && (
                            <p className="text-[10px] text-surface-600 truncate mt-0.5">{txn.notes}</p>
                          )}
                        </div>

                        <span className="text-sm font-bold text-expense-400 flex-shrink-0">
                          ₹{Number(txn.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>

                        <button
                          onClick={() => handleDelete(txn.id)}
                          className="opacity-0 group-hover:opacity-100 text-surface-600 hover:text-expense-400 transition-all flex-shrink-0"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
