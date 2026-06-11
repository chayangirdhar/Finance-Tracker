import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar, TrendingUp, TrendingDown, Settings } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Modal from '../shared/Modal';
import AccountForm from '../forms/AccountForm';
import CreditCardForm from '../forms/CreditCardForm';
import { useApp } from '../../context/AppContext';

export default function TopBar() {
  const { accounts, creditCards } = useApp();
  const [showSettings, setShowSettings] = useState(false);
  const [quickStats, setQuickStats] = useState({ income: 0, expenses: 0 });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  useEffect(() => {
    async function fetchQuickStats() {
      try {
        const [incRes, expRes] = await Promise.all([
          supabase
            .from('income')
            .select('amount')
            .gte('date', monthStart.split('T')[0])
            .lte('date', monthEnd.split('T')[0]),
          supabase
            .from('transactions')
            .select('amount')
            .gte('date', monthStart)
            .lte('date', monthEnd),
        ]);

        const totalIncome = (incRes.data || []).reduce((s, r) => s + Number(r.amount), 0);
        const totalExpenses = (expRes.data || []).reduce((s, r) => s + Number(r.amount), 0);
        setQuickStats({ income: totalIncome, expenses: totalExpenses });
      } catch {
        // Silently fail for quick stats
      }
    }
    fetchQuickStats();
  }, [monthStart, monthEnd]);

  const net = quickStats.income - quickStats.expenses;

  return (
    <>
      <header className="flex items-center justify-between px-6 h-16 border-b border-white/[0.06]">
        {/* Left: Date */}
        <div className="flex items-center gap-3">
          <Calendar size={16} className="text-accent-400" />
          <div>
            <h2 className="text-sm font-bold text-white">{format(now, 'MMMM yyyy')}</h2>
            <p className="text-[10px] text-surface-500">{format(now, 'EEEE, d MMMM')}</p>
          </div>
        </div>

        {/* Center: Quick Stats */}
        <div className="hidden md:flex items-center gap-6">
          <div className="flex items-center gap-2">
            <TrendingUp size={14} className="text-income-400" />
            <span className="text-xs font-medium text-surface-400">Income</span>
            <span className="text-sm font-bold text-income-400">
              ₹{quickStats.income.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="w-px h-5 bg-white/[0.08]" />
          <div className="flex items-center gap-2">
            <TrendingDown size={14} className="text-expense-400" />
            <span className="text-xs font-medium text-surface-400">Spent</span>
            <span className="text-sm font-bold text-expense-400">
              ₹{quickStats.expenses.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="w-px h-5 bg-white/[0.08]" />
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-surface-400">Net</span>
            <span className={`text-sm font-bold ${net >= 0 ? 'text-income-400' : 'text-expense-400'}`}>
              {net >= 0 ? '+' : ''}₹{Math.abs(net).toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Right: Settings */}
        <button
          onClick={() => setShowSettings(true)}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-surface-400 hover:text-white hover:bg-white/[0.06] transition-all"
        >
          <Settings size={18} />
        </button>
      </header>

      {/* Settings Modal */}
      <Modal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        title="Manage Accounts & Cards"
        size="lg"
      >
        <SettingsPanel />
      </Modal>
    </>
  );
}

function SettingsPanel() {
  const { accounts, creditCards, refreshAccounts, refreshCreditCards } = useApp();
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [showCardForm, setShowCardForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [editingCard, setEditingCard] = useState(null);

  const handleDeleteAccount = async (id) => {
    if (!confirm('Delete this account? This may affect existing transactions.')) return;
    await supabase.from('accounts').delete().eq('id', id);
    refreshAccounts();
  };

  const handleDeleteCard = async (id) => {
    if (!confirm('Delete this card? This may affect existing transactions.')) return;
    await supabase.from('credit_cards').delete().eq('id', id);
    refreshCreditCards();
  };

  return (
    <div className="space-y-8">
      {/* Savings Accounts */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white">Savings Accounts</h3>
          <button
            onClick={() => { setEditingAccount(null); setShowAccountForm(true); }}
            className="btn-primary !py-2 !px-4 !text-xs"
          >
            + Add Account
          </button>
        </div>
        {accounts.length === 0 ? (
          <p className="text-sm text-surface-500 text-center py-4">No accounts added yet</p>
        ) : (
          <div className="space-y-2">
            {accounts.map((acc) => (
              <div key={acc.id} className="glass-card p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">{acc.name}</p>
                  <p className="text-xs text-surface-500">
                    {acc.type} · Opening: ₹{Number(acc.opening_balance).toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setEditingAccount(acc); setShowAccountForm(true); }}
                    className="text-xs text-accent-400 hover:text-accent-300"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteAccount(acc.id)}
                    className="text-xs text-expense-400 hover:text-expense-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Credit Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white">Credit Cards</h3>
          <button
            onClick={() => { setEditingCard(null); setShowCardForm(true); }}
            className="btn-primary !py-2 !px-4 !text-xs"
          >
            + Add Card
          </button>
        </div>
        {creditCards.length === 0 ? (
          <p className="text-sm text-surface-500 text-center py-4">No credit cards added yet</p>
        ) : (
          <div className="space-y-2">
            {creditCards.map((cc) => (
              <div key={cc.id} className="glass-card p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">{cc.name}</p>
                  <p className="text-xs text-surface-500">
                    Limit: ₹{Number(cc.credit_limit).toLocaleString('en-IN')} · Dues: ₹{Number(cc.opening_dues).toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setEditingCard(cc); setShowCardForm(true); }}
                    className="text-xs text-accent-400 hover:text-accent-300"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteCard(cc.id)}
                    className="text-xs text-expense-400 hover:text-expense-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals for forms */}
      <Modal isOpen={showAccountForm} onClose={() => setShowAccountForm(false)} title={editingAccount ? 'Edit Account' : 'Add Account'}>
        <AccountForm
          account={editingAccount}
          onSaved={() => { setShowAccountForm(false); refreshAccounts(); }}
        />
      </Modal>
      <Modal isOpen={showCardForm} onClose={() => setShowCardForm(false)} title={editingCard ? 'Edit Card' : 'Add Credit Card'}>
        <CreditCardForm
          card={editingCard}
          onSaved={() => { setShowCardForm(false); refreshCreditCards(); }}
        />
      </Modal>
    </div>
  );
}
