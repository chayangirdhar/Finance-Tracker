import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar, TrendingUp, TrendingDown, Settings, Lock, LogOut, Sun, Sunrise, Sunset, Moon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useDemoData } from '../../context/DemoContext';
import Modal from '../shared/Modal';
import LoginModal from '../shared/LoginModal';
import AccountForm from '../forms/AccountForm';
import CreditCardForm from '../forms/CreditCardForm';
import { useApp } from '../../context/AppContext';

export default function TopBar() {
  const { accounts, creditCards, categories } = useApp();
  const { isAuthenticated, signOut } = useAuth();
  const demoData = useDemoData();
  const [showSettings, setShowSettings] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [discretionarySpend, setDiscretionarySpend] = useState(0);
  const [todaySpend, setTodaySpend] = useState(0);
  const [todayCount, setTodayCount] = useState(0);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  // Greeting calculation based on current hour
  const hour = now.getHours();
  let greeting = 'Good evening';
  let GreetingIcon = Sunset;
  if (hour >= 5 && hour < 12) {
    greeting = 'Good morning';
    GreetingIcon = Sunrise;
  } else if (hour >= 12 && hour < 17) {
    greeting = 'Good afternoon';
    GreetingIcon = Sun;
  } else if (hour >= 17 && hour < 22) {
    greeting = 'Good evening';
    GreetingIcon = Sunset;
  } else {
    greeting = 'Good night';
    GreetingIcon = Moon;
  }

  useEffect(() => {
    const excludedCatIds = (categories || [])
      .filter((c) => ['Added to Savings', 'Investment', 'Credit Card Payment'].includes(c.name))
      .map((c) => c.id);

    // Demo mode: compute from demo data
    if (!isAuthenticated && demoData) {
      const mStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const mEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

      const allDemoTxns = demoData.transactions || [];
      const totalDiscretionary = allDemoTxns
        .filter((t) => {
          const d = new Date(t.date);
          return d >= mStart && d <= mEnd && !excludedCatIds.includes(t.category_id);
        })
        .reduce((s, t) => s + Number(t.amount), 0);
      setDiscretionarySpend(totalDiscretionary);

      const todayTxns = allDemoTxns.filter((t) => {
        const d = new Date(t.date);
        return d >= todayStart && d <= todayEnd;
      });
      setTodaySpend(todayTxns.reduce((s, t) => s + Number(t.amount), 0));
      setTodayCount(todayTxns.length);
      return;
    }

    // Authenticated: fetch from Supabase
    async function fetchQuickStats() {
      try {
        const { data, error } = await supabase
          .from('transactions')
          .select('amount, category_id, date')
          .gte('date', monthStart)
          .lte('date', monthEnd);

        if (error) throw error;

        const totalDiscretionary = (data || [])
          .filter((t) => !excludedCatIds.includes(t.category_id))
          .reduce((s, r) => s + Number(r.amount), 0);
        setDiscretionarySpend(totalDiscretionary);

        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        const todayTxns = (data || []).filter((t) => {
          const d = new Date(t.date);
          return d >= todayStart && d <= todayEnd;
        });
        setTodaySpend(todayTxns.reduce((s, t) => s + Number(t.amount), 0));
        setTodayCount(todayTxns.length);
      } catch {
        // Silently fail for quick stats
      }
    }
    fetchQuickStats();
  }, [monthStart, monthEnd, isAuthenticated, demoData?.transactions, categories]);

  return (
    <>
      <header className="flex items-center justify-between px-6 h-16 border-b border-white/[0.06]">
        {/* Left: Dynamic Greeting & Today's Summary */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-accent-500/10 text-accent-400">
            <GreetingIcon size={18} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-bold text-white">{greeting}</h2>
              <span className="text-[10px] text-surface-500 font-medium hidden sm:inline">
                · {format(now, 'EEEE, d MMM')}
              </span>
            </div>
            <p className="text-[11px] text-surface-400 font-medium">
              {todayCount > 0 ? (
                <>
                  Today: <span className="font-semibold text-expense-400">₹{todaySpend.toLocaleString('en-IN')}</span>
                  <span className="text-surface-500"> ({todayCount} {todayCount === 1 ? 'txn' : 'txns'})</span>
                </>
              ) : (
                <span className="text-surface-500">No spends logged today</span>
              )}
            </p>
          </div>
        </div>

        {/* Center: Discretionary Spend */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <TrendingDown size={14} className="text-expense-400" />
          <span className="text-xs font-medium text-surface-400">Month Spend</span>
          <span className="text-sm font-bold text-expense-400">
            ₹{discretionarySpend.toLocaleString('en-IN')}
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Mobile Auth Button */}
          <div className="md:hidden">
            {isAuthenticated ? (
              <button
                onClick={signOut}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-income-400 hover:bg-white/[0.06] transition-all"
                title="Sign out"
              >
                <LogOut size={16} />
              </button>
            ) : (
              <button
                onClick={() => setShowLogin(true)}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-surface-400 hover:bg-white/[0.06] transition-all"
                title="Owner Login"
              >
                <Lock size={16} />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowSettings(true)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-surface-400 hover:text-white hover:bg-white/[0.06] transition-all"
            title="Settings"
          >
            <Settings size={18} />
          </button>
        </div>
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

      {/* Login Modal */}
      <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />
    </>
  );
}

function SettingsPanel() {
  const { accounts, creditCards, refreshAccounts, refreshCreditCards } = useApp();
  const { isAuthenticated } = useAuth();
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
          {isAuthenticated && (
            <button
              onClick={() => { setEditingAccount(null); setShowAccountForm(true); }}
              className="btn-primary !py-2 !px-4 !text-xs"
            >
              + Add Account
            </button>
          )}
        </div>
        {accounts.length === 0 ? (
          <p className="text-sm text-surface-500 text-center py-4">No accounts added yet</p>
        ) : (
          <div className="space-y-2">
            {accounts.map((acc) => (
              <div key={acc.id} className="glass-card p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white flex items-center gap-1.5">
                    {acc.name}
                    {acc.is_salary_default && (
                      <span className="badge-income !text-[9px] !py-0.5 !px-1.5 flex items-center gap-1">
                        ⭐ Default
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-surface-500">
                    {acc.type} · Opening: ₹{Number(acc.opening_balance).toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="flex gap-2">
                  {isAuthenticated && (
                    <>
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
                    </>
                  )}
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
          {isAuthenticated && (
            <button
              onClick={() => { setEditingCard(null); setShowCardForm(true); }}
              className="btn-primary !py-2 !px-4 !text-xs"
            >
              + Add Card
            </button>
          )}
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
                    Limit: ₹{Number(cc.credit_limit).toLocaleString('en-IN')} · Dues: ₹{Number(cc.opening_dues).toLocaleString('en-IN')} · Due: Day {cc.due_day || 20}
                  </p>
                </div>
                <div className="flex gap-2">
                  {isAuthenticated && (
                    <>
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
                    </>
                  )}
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
