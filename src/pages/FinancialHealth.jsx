import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useDemoData } from '../context/DemoContext';
import Modal from '../components/shared/Modal';
import AccountForm from '../components/forms/AccountForm';
import CreditCardForm from '../components/forms/CreditCardForm';
import EmptyState from '../components/shared/EmptyState';
import {
  BarChart3,
  CreditCard,
  Landmark,
  Plus,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
} from 'lucide-react';

export default function FinancialHealth() {
  const { accounts, creditCards, refreshAccounts, refreshCreditCards, getCategoryByName } = useApp();
  const { isAuthenticated } = useAuth();
  const demoData = useDemoData();

  const [accountStats, setAccountStats] = useState({});
  const [cardStats, setCardStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [showCardForm, setShowCardForm] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);

      let allIncome = [];
      let allTxns = [];

      if (isAuthenticated) {
        // Fetch all income entries
        const { data: incomeData } = await supabase.from('income').select('amount, account_id');
        allIncome = incomeData || [];

        // Fetch all transactions
        const { data: txnsData } = await supabase.from('transactions').select('amount, payment_method, account_id, credit_card_id, category_id, cc_payment_type');
        allTxns = txnsData || [];
      } else if (demoData) {
        allIncome = demoData.income || [];
        allTxns = demoData.transactions || [];
      }

      // Get the "Credit Card Payment" category
      const ccPayCat = getCategoryByName('Credit Card Payment');
      const ccPayCatId = ccPayCat?.id;

      // Get "Added to Savings" category
      const savingsCat = getCategoryByName('Added to Savings');
      const savingsCatId = savingsCat?.id;

      // Compute per-account stats
      const accStats = {};
      for (const acc of accounts) {
        const incomeIn = (allIncome || [])
          .filter((i) => i.account_id === acc.id)
          .reduce((s, i) => s + Number(i.amount), 0);

        // Expenses paid FROM this account (direct payments)
        const expensesOut = (allTxns || [])
          .filter((t) => t.account_id === acc.id && t.category_id !== savingsCatId)
          .reduce((s, t) => s + Number(t.amount), 0);

        // Savings transfers INTO this account (via "Added to Savings" category referencing account)
        // Since the current schema uses subcategory for savings, we track via notes or account_id
        // For now, savings added are tracked as expenses from another account
        const savingsIn = 0; // Will be computed when schema supports it

        const liveBalance = Number(acc.opening_balance) + incomeIn - expensesOut + savingsIn;

        accStats[acc.id] = {
          incomeIn: Math.round(incomeIn * 100) / 100,
          expensesOut: Math.round(expensesOut * 100) / 100,
          liveBalance: Math.round(liveBalance * 100) / 100,
        };
      }
      setAccountStats(accStats);

      // Compute per-card stats
      const cStats = {};
      for (const cc of creditCards) {
        const cardSpend = (allTxns || [])
          .filter((t) => t.credit_card_id === cc.id && t.category_id !== ccPayCatId)
          .reduce((s, t) => s + Number(t.amount), 0);

        const billPayments = (allTxns || [])
          .filter((t) => t.credit_card_id === cc.id && t.category_id === ccPayCatId)
          .reduce((s, t) => s + Number(t.amount), 0);

        const owedDues = Number(cc.opening_dues) + cardSpend - billPayments;
        const available = Number(cc.credit_limit) - owedDues;

        cStats[cc.id] = {
          cardSpend: Math.round(cardSpend * 100) / 100,
          billPayments: Math.round(billPayments * 100) / 100,
          owedDues: Math.round(owedDues * 100) / 100,
          available: Math.round(available * 100) / 100,
        };
      }
      setCardStats(cStats);
    } catch (err) {
      console.error('Failed to compute stats:', err);
    } finally {
      setLoading(false);
    }
  }, [accounts, creditCards, getCategoryByName]);

  useEffect(() => {
    if (accounts.length > 0 || creditCards.length > 0) {
      fetchStats();
    } else {
      setLoading(false);
    }
  }, [fetchStats, accounts.length, creditCards.length]);

  const totalBalance = accounts.reduce((s, a) => s + (accountStats[a.id]?.liveBalance || Number(a.opening_balance)), 0);
  const totalOwed = creditCards.reduce((s, c) => s + (cardStats[c.id]?.owedDues || Number(c.opening_dues)), 0);
  const netWorth = totalBalance - totalOwed;

  const fmt = (n) => Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-3">
            <Landmark size={16} className="text-income-400" />
            <span className="stat-label !mt-0">Total Savings</span>
          </div>
          <p className="stat-value text-income-400">₹{fmt(totalBalance)}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard size={16} className="text-expense-400" />
            <span className="stat-label !mt-0">Total CC Dues</span>
          </div>
          <p className="stat-value text-expense-400">₹{fmt(totalOwed)}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck size={16} className={netWorth >= 0 ? 'text-income-400' : 'text-expense-400'} />
            <span className="stat-label !mt-0">Net Position</span>
          </div>
          <p className={`stat-value ${netWorth >= 0 ? 'text-income-400' : 'text-expense-400'}`}>
            {netWorth < 0 ? '-' : ''}₹{fmt(netWorth)}
          </p>
        </div>
      </div>

      {/* Savings Accounts Matrix */}
      <div className="glass-card-static p-4 sm:p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-income/10">
              <Landmark size={20} className="text-income-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Savings Accounts</h2>
              <p className="text-xs text-surface-500">Real-time balance tracking</p>
            </div>
          </div>
          {isAuthenticated && (
            <button onClick={() => setShowAccountForm(true)} className="btn-primary !py-2 !px-4 !text-xs">
              <Plus size={14} className="inline mr-1" /> Add Account
            </button>
          )}
        </div>

        {accounts.length === 0 ? (
          <EmptyState
            icon={Landmark}
            title="No accounts configured"
            description="Add your savings accounts, wallets, and cash accounts to start tracking balances"
            action={isAuthenticated ? (
              <button onClick={() => setShowAccountForm(true)} className="btn-primary !text-xs">
                Add Your First Account
              </button>
            ) : null}
          />
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Account</th>
                    <th>Type</th>
                    <th className="text-right">Opening Balance</th>
                    <th className="text-right">
                      <span className="flex items-center justify-end gap-1">
                        <ArrowUpRight size={12} className="text-income-400" /> Income In
                      </span>
                    </th>
                    <th className="text-right">
                      <span className="flex items-center justify-end gap-1">
                        <ArrowDownRight size={12} className="text-expense-400" /> Expenses Out
                      </span>
                    </th>
                    <th className="text-right">Live Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((acc) => {
                    const stats = accountStats[acc.id] || {};
                    const balance = stats.liveBalance ?? Number(acc.opening_balance);
                    return (
                      <tr key={acc.id}>
                        <td className="font-semibold text-white">{acc.name}</td>
                        <td><span className="badge-neutral">{acc.type}</span></td>
                        <td className="text-right text-surface-300">₹{fmt(Number(acc.opening_balance))}</td>
                        <td className="text-right text-income-400">+₹{fmt(stats.incomeIn || 0)}</td>
                        <td className="text-right text-expense-400">-₹{fmt(stats.expensesOut || 0)}</td>
                        <td className={`text-right font-bold ${balance >= 0 ? 'text-income-400' : 'text-expense-400'}`}>
                          ₹{fmt(balance)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Card View */}
            <div className="md:hidden space-y-3">
              {accounts.map((acc) => {
                const stats = accountStats[acc.id] || {};
                const balance = stats.liveBalance ?? Number(acc.opening_balance);
                return (
                  <div key={acc.id} className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white text-sm">{acc.name}</span>
                      <span className="badge-neutral !text-[10px]">{acc.type}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-surface-500 mb-0.5">Opening Balance</p>
                        <p className="text-surface-300 font-medium">₹{fmt(Number(acc.opening_balance))}</p>
                      </div>
                      <div>
                        <p className="text-surface-500 mb-0.5">Live Balance</p>
                        <p className={`font-bold ${balance >= 0 ? 'text-income-400' : 'text-expense-400'}`}>
                          ₹{fmt(balance)}
                        </p>
                      </div>
                      <div>
                        <p className="text-surface-500 mb-0.5 flex items-center gap-0.5">
                          <ArrowUpRight size={10} className="text-income-400" /> Income In
                        </p>
                        <p className="text-income-400 font-medium">+₹{fmt(stats.incomeIn || 0)}</p>
                      </div>
                      <div>
                        <p className="text-surface-500 mb-0.5 flex items-center gap-0.5">
                          <ArrowDownRight size={10} className="text-expense-400" /> Expenses Out
                        </p>
                        <p className="text-expense-400 font-medium">-₹{fmt(stats.expensesOut || 0)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Credit Cards Matrix */}
      <div className="glass-card-static p-4 sm:p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-accent/10">
              <CreditCard size={20} className="text-accent-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Credit Cards</h2>
              <p className="text-xs text-surface-500">Dues & available limits</p>
            </div>
          </div>
          {isAuthenticated && (
            <button onClick={() => setShowCardForm(true)} className="btn-primary !py-2 !px-4 !text-xs">
              <Plus size={14} className="inline mr-1" /> Add Card
            </button>
          )}
        </div>

        {creditCards.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="No credit cards added"
            description="Add your credit cards to track spending and remaining limits"
            action={isAuthenticated ? (
              <button onClick={() => setShowCardForm(true)} className="btn-primary !text-xs">
                Add Your First Card
              </button>
            ) : null}
          />
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Card</th>
                    <th className="text-right">Credit Limit</th>
                    <th className="text-right">Opening Dues</th>
                    <th className="text-right">Card Spend</th>
                    <th className="text-right">Payments Made</th>
                    <th className="text-right">Total Owed</th>
                    <th className="text-right">Available</th>
                  </tr>
                </thead>
                <tbody>
                  {creditCards.map((cc) => {
                    const stats = cardStats[cc.id] || {};
                    const owed = stats.owedDues ?? Number(cc.opening_dues);
                    const avail = stats.available ?? (Number(cc.credit_limit) - Number(cc.opening_dues));
                    const utilPct = Number(cc.credit_limit) > 0
                      ? Math.round((owed / Number(cc.credit_limit)) * 100)
                      : 0;

                    return (
                      <tr key={cc.id}>
                        <td>
                          <div>
                            <span className="font-semibold text-white">{cc.name}</span>
                            <div className="mt-1 w-full bg-white/[0.06] rounded-full h-1.5">
                              <div
                                className="h-1.5 rounded-full transition-all duration-500"
                                style={{
                                  width: `${Math.min(utilPct, 100)}%`,
                                  background: utilPct > 80 ? 'var(--gradient-expense)' : utilPct > 50 ? '#f59e0b' : 'var(--gradient-income)',
                                }}
                              />
                            </div>
                            <span className="text-[10px] text-surface-500">{utilPct}% utilized</span>
                          </div>
                        </td>
                        <td className="text-right text-surface-300">₹{fmt(Number(cc.credit_limit))}</td>
                        <td className="text-right text-surface-400">₹{fmt(Number(cc.opening_dues))}</td>
                        <td className="text-right text-expense-400">₹{fmt(stats.cardSpend || 0)}</td>
                        <td className="text-right text-income-400">₹{fmt(stats.billPayments || 0)}</td>
                        <td className={`text-right font-bold ${owed > 0 ? 'text-expense-400' : 'text-income-400'}`}>
                          ₹{fmt(owed)}
                        </td>
                        <td className={`text-right font-bold ${avail >= 0 ? 'text-income-400' : 'text-expense-400'}`}>
                          ₹{fmt(avail)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Card View */}
            <div className="md:hidden space-y-3">
              {creditCards.map((cc) => {
                const stats = cardStats[cc.id] || {};
                const owed = stats.owedDues ?? Number(cc.opening_dues);
                const avail = stats.available ?? (Number(cc.credit_limit) - Number(cc.opening_dues));
                const utilPct = Number(cc.credit_limit) > 0
                  ? Math.round((owed / Number(cc.credit_limit)) * 100)
                  : 0;

                return (
                  <div key={cc.id} className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-white text-sm">{cc.name}</span>
                        <p className="text-[10px] text-surface-500 mt-0.5">{utilPct}% utilized</p>
                      </div>
                      <div className="w-24 bg-white/[0.06] rounded-full h-1.5 flex-shrink-0">
                        <div
                          className="h-1.5 rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(utilPct, 100)}%`,
                            background: utilPct > 80 ? 'var(--gradient-expense)' : utilPct > 50 ? '#f59e0b' : 'var(--gradient-income)',
                          }}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-surface-500 mb-0.5">Credit Limit</p>
                        <p className="text-surface-300 font-medium">₹{fmt(Number(cc.credit_limit))}</p>
                      </div>
                      <div>
                        <p className="text-surface-500 mb-0.5">Total Owed</p>
                        <p className={`font-bold ${owed > 0 ? 'text-expense-400' : 'text-income-400'}`}>
                          ₹{fmt(owed)}
                        </p>
                      </div>
                      <div>
                        <p className="text-surface-500 mb-0.5">Card Spend</p>
                        <p className="text-expense-400 font-medium">₹{fmt(stats.cardSpend || 0)}</p>
                      </div>
                      <div>
                        <p className="text-surface-500 mb-0.5">Available Limit</p>
                        <p className={`font-bold ${avail >= 0 ? 'text-income-400' : 'text-expense-400'}`}>
                          ₹{fmt(avail)}
                        </p>
                      </div>
                      <div>
                        <p className="text-surface-500 mb-0.5">Opening Dues</p>
                        <p className="text-surface-400 font-medium">₹{fmt(Number(cc.opening_dues))}</p>
                      </div>
                      <div>
                        <p className="text-surface-500 mb-0.5">Payments Made</p>
                        <p className="text-income-400 font-medium">₹{fmt(stats.billPayments || 0)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      <Modal isOpen={showAccountForm} onClose={() => setShowAccountForm(false)} title="Add Savings Account">
        <AccountForm onSaved={() => { setShowAccountForm(false); refreshAccounts(); }} />
      </Modal>
      <Modal isOpen={showCardForm} onClose={() => setShowCardForm(false)} title="Add Credit Card">
        <CreditCardForm onSaved={() => { setShowCardForm(false); refreshCreditCards(); }} />
      </Modal>
    </div>
  );
}
