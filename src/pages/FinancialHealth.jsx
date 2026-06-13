import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useDemoData } from '../context/DemoContext';
import Modal from '../components/shared/Modal';
import AccountForm from '../components/forms/AccountForm';
import CreditCardForm from '../components/forms/CreditCardForm';
import EmptyState from '../components/shared/EmptyState';
import toast from 'react-hot-toast';
import {
  CreditCard,
  Landmark,
  Plus,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Activity,
  Coins,
  PiggyBank,
  CheckSquare,
  Square
} from 'lucide-react';

export default function FinancialHealth() {
  const { accounts, creditCards, refreshAccounts, refreshCreditCards, updateCreditCard, getCategoryByName } = useApp();
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
        // Fetch all income entries (include date and source)
        const { data: incomeData } = await supabase.from('income').select('amount, account_id, date, source');
        allIncome = incomeData || [];

        // Fetch all transactions (include date)
        const { data: txnsData } = await supabase.from('transactions').select('amount, payment_method, account_id, credit_card_id, category_id, cc_payment_type, notes, date');
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

      const parseSavingsTargetId = (notesStr) => {
        if (!notesStr) return null;
        const match = notesStr.match(/\[savings_to:(\d+)\]/);
        return match ? Number(match[1]) : null;
      };

      // Current month time bounds (local timezone)
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      const isInCurrentMonth = (dateStr) => {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        return d >= currentMonthStart && d <= currentMonthEnd;
      };

      // Compute per-account stats
      const accStats = {};
      for (const acc of accounts) {
        // 1. Historical calculations for Live Balance
        const incomeIn = (allIncome || [])
          .filter((i) => i.account_id === acc.id)
          .reduce((s, i) => s + Number(i.amount), 0);

        const expensesOut = (allTxns || [])
          .filter((t) => t.account_id === acc.id)
          .reduce((s, t) => s + Number(t.amount), 0);

        const savingsIn = (allTxns || [])
          .filter((t) => t.category_id === savingsCatId && parseSavingsTargetId(t.notes) === acc.id)
          .reduce((s, t) => s + Number(t.amount), 0);

        const liveBalance = Number(acc.opening_balance) + incomeIn - expensesOut + savingsIn;

        // 2. Current Month calculations for Savings section
        const curMonthIncomeIn = (allIncome || [])
          .filter((i) => i.account_id === acc.id && isInCurrentMonth(i.date))
          .reduce((s, i) => s + Number(i.amount), 0);

        const curMonthExpensesOut = (allTxns || [])
          .filter((t) => t.account_id === acc.id && isInCurrentMonth(t.date))
          .reduce((s, t) => s + Number(t.amount), 0);

        const curMonthSavingsIn = (allTxns || [])
          .filter((t) => t.category_id === savingsCatId && parseSavingsTargetId(t.notes) === acc.id && isInCurrentMonth(t.date))
          .reduce((s, t) => s + Number(t.amount), 0);

        const monthlyChange = curMonthIncomeIn - curMonthExpensesOut + curMonthSavingsIn;

        // 3. Salary account metrics (current month)
        const curMonthSalaryIncome = (allIncome || [])
          .filter((i) => i.account_id === acc.id && i.source === 'Salary' && isInCurrentMonth(i.date))
          .reduce((s, i) => s + Number(i.amount), 0);

        const curMonthSalaryExpense = (allTxns || [])
          .filter((t) => t.account_id === acc.id && isInCurrentMonth(t.date))
          .reduce((s, t) => s + Number(t.amount), 0);

        accStats[acc.id] = {
          liveBalance: Math.round(liveBalance * 100) / 100,
          monthlyChange: Math.round(monthlyChange * 100) / 100,
          salaryCredited: Math.round(curMonthSalaryIncome * 100) / 100,
          salarySpent: Math.round(curMonthSalaryExpense * 100) / 100,
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
        const paidThisMonth = (allTxns || [])
          .some((t) => t.credit_card_id === cc.id && t.category_id === ccPayCatId && isInCurrentMonth(t.date));

        cStats[cc.id] = {
          owedDues: Math.round(owedDues * 100) / 100,
          available: Math.round(available * 100) / 100,
          paidThisMonth,
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

  // --- Segregated Accounts ---
  const salaryAccounts = accounts.filter((acc) => acc.is_salary_default);
  const savingsAccounts = accounts.filter((acc) => !acc.is_salary_default);

  // --- KPI Card Calculations ---
  // 1. Total Savings (excluding salary defaults)
  const totalSavings = savingsAccounts.reduce((s, a) => s + (accountStats[a.id]?.liveBalance ?? Number(a.opening_balance)), 0);

  // 2. Total Credit Card Dues
  const totalOwed = creditCards.reduce((s, c) => s + (cardStats[c.id]?.owedDues ?? Number(c.opening_dues)), 0);

  // 3. Salary Remaining (Current Month)
  const totalSalaryCredited = salaryAccounts.reduce((sum, acc) => sum + (accountStats[acc.id]?.salaryCredited || 0), 0);
  const totalSalarySpent = salaryAccounts.reduce((sum, acc) => sum + (accountStats[acc.id]?.salarySpent || 0), 0);
  const salaryRemaining = totalSalaryCredited - totalSalarySpent;
  const salaryRemainingPct = totalSalaryCredited > 0 ? (salaryRemaining / totalSalaryCredited) * 100 : 0;

  // 4. Net Position
  const netPosition = totalSavings - totalOwed;

  // --- Quick Health Insights ---
  const totalCreditLimit = creditCards.reduce((sum, cc) => sum + Number(cc.credit_limit), 0);
  const creditUtilization = totalCreditLimit > 0 ? (totalOwed / totalCreditLimit) * 100 : 0;
  const totalAvailableCredit = totalCreditLimit - totalOwed;

  // Largest Savings Account
  const largestSavingsAccObj = savingsAccounts.reduce((max, acc) => {
    const bal = accountStats[acc.id]?.liveBalance ?? Number(acc.opening_balance);
    const maxBal = max ? (accountStats[max.id]?.liveBalance ?? Number(max.opening_balance)) : -Infinity;
    return bal > maxBal ? acc : max;
  }, null);
  const largestSavingsAcc = largestSavingsAccObj ? largestSavingsAccObj.name : '—';

  // Most Utilized Credit Card
  const mostUtilizedCCObj = creditCards.reduce((max, cc) => {
    const dues = cardStats[cc.id]?.owedDues ?? Number(cc.opening_dues);
    const limit = Number(cc.credit_limit);
    const pct = limit > 0 ? (dues / limit) * 100 : 0;
    const maxPct = max ? (((cardStats[max.id]?.owedDues ?? Number(max.opening_dues)) / Number(max.credit_limit)) * 100) : -Infinity;
    return pct > maxPct ? cc : max;
  }, null);
  const mostUtilizedCC = mostUtilizedCCObj ? mostUtilizedCCObj.name : '—';

  const fmt = (n) => Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const getOrdinal = (d) => {
    if (d > 3 && d < 21) return 'th';
    switch (d % 10) {
      case 1:  return "st";
      case 2:  return "nd";
      case 3:  return "rd";
      default: return "th";
    }
  };

  const fmtDueDay = (day) => {
    const d = Number(day) || 20;
    return `${d}${getOrdinal(d)} of Month`;
  };



  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 rounded-2xl bg-white/[0.03]" />)}
        </div>
        <div className="h-64 rounded-2xl bg-white/[0.03]" />
        <div className="h-64 rounded-2xl bg-white/[0.03]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-3">
            <PiggyBank size={16} className="text-income-400" />
            <span className="stat-label !mt-0">Total Savings</span>
          </div>
          <p className="stat-value text-income-400">₹{fmt(totalSavings)}</p>
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
            <Coins size={16} className="text-accent-400" />
            <span className="stat-label !mt-0">Salary Remaining</span>
          </div>
          <p className="stat-value text-accent-400">₹{fmt(salaryRemaining)}</p>
          <p className="text-[10px] text-surface-500 mt-1 font-semibold">
            {salaryRemainingPct.toFixed(1)}% remaining this month
          </p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck size={16} className={netPosition >= 0 ? 'text-income-400' : 'text-expense-400'} />
            <span className="stat-label !mt-0">Net Position</span>
          </div>
          <p className={`stat-value ${netPosition >= 0 ? 'text-income-400' : 'text-expense-400'}`}>
            {netPosition < 0 ? '-' : ''}₹{fmt(netPosition)}
          </p>
        </div>
      </div>

      {/* Quick Health Insights */}
      <div className="glass-card-static p-4">
        <h3 className="text-xs font-bold text-surface-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Activity size={14} /> Quick Health Insights
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <p className="text-[10px] text-surface-500 font-medium">Salary Remaining</p>
            <p className="text-sm font-bold text-accent-400">₹{fmt(salaryRemaining)} ({salaryRemainingPct.toFixed(0)}%)</p>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <p className="text-[10px] text-surface-500 font-medium">Credit Utilization</p>
            <p className={`text-sm font-bold ${creditUtilization > 50 ? 'text-expense-400' : 'text-income-400'}`}>
              {creditUtilization.toFixed(1)}%
            </p>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <p className="text-[10px] text-surface-500 font-medium">Available Credit</p>
            <p className="text-sm font-bold text-income-400">₹{fmt(totalAvailableCredit)}</p>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <p className="text-[10px] text-surface-500 font-medium">Largest Savings</p>
            <p className="text-sm font-bold text-white truncate" title={largestSavingsAcc}>{largestSavingsAcc}</p>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <p className="text-[10px] text-surface-500 font-medium">Most Utilized CC</p>
            <p className="text-sm font-bold text-white truncate" title={mostUtilizedCC}>{mostUtilizedCC}</p>
          </div>
        </div>
      </div>

      {/* Section 1: Salary Account */}
      <div className="glass-card-static p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-accent/10">
            <Coins size={20} className="text-accent-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Salary Account</h2>
            <p className="text-xs text-surface-500">Track monthly salary consumption</p>
          </div>
        </div>

        {salaryAccounts.length === 0 ? (
          <EmptyState
            icon={Coins}
            title="No default salary account"
            description="Manage your accounts and toggle 'Default for Salary Credits' to start tracking month-to-date spending."
          />
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Account Name</th>
                    <th className="text-right">Salary Credited (M-T-D)</th>
                    <th className="text-right">Amount Spent (M-T-D)</th>
                    <th className="text-right">Remaining Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {salaryAccounts.map((acc) => {
                    const stats = accountStats[acc.id] || {};
                    const credited = stats.salaryCredited || 0;
                    const spent = stats.salarySpent || 0;
                    const remaining = Number(acc.opening_balance) + credited - spent;
                    return (
                      <tr key={acc.id}>
                        <td className="font-semibold text-white">{acc.name}</td>
                        <td className="text-right text-income-400">₹{fmt(credited)}</td>
                        <td className="text-right text-expense-400">₹{fmt(spent)}</td>
                        <td className={`text-right font-bold ${remaining >= 0 ? 'text-accent-400' : 'text-expense-400'}`}>
                          ₹{fmt(remaining)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="md:hidden space-y-3">
              {salaryAccounts.map((acc) => {
                const stats = accountStats[acc.id] || {};
                const credited = stats.salaryCredited || 0;
                const spent = stats.salarySpent || 0;
                const remaining = Number(acc.opening_balance) + credited - spent;
                return (
                  <div key={acc.id} className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-3">
                    <div className="font-semibold text-white text-sm">{acc.name}</div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-surface-500 mb-0.5">Salary Credited</p>
                        <p className="text-income-400 font-bold">₹{fmt(credited)}</p>
                      </div>
                      <div>
                        <p className="text-surface-500 mb-0.5">Amount Spent</p>
                        <p className="text-expense-400 font-bold">₹{fmt(spent)}</p>
                      </div>
                      <div className="col-span-2 border-t border-white/[0.04] pt-2 mt-1">
                        <p className="text-surface-500 mb-0.5">Remaining Balance</p>
                        <p className={`font-bold ${remaining >= 0 ? 'text-accent-400' : 'text-expense-400'}`}>
                          ₹{fmt(remaining)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Section 2: Savings & Cash Holdings */}
      <div className="glass-card-static p-4 sm:p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-income/10">
              <Landmark size={20} className="text-income-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Savings & Cash Holdings</h2>
              <p className="text-xs text-surface-500">Current financial positions and savings pool allocation</p>
            </div>
          </div>
          {isAuthenticated && (
            <button onClick={() => setShowAccountForm(true)} className="btn-primary !py-2 !px-4 !text-xs">
              <Plus size={14} className="inline mr-1" /> Add Account
            </button>
          )}
        </div>

        {savingsAccounts.length === 0 ? (
          <EmptyState
            icon={Landmark}
            title="No savings accounts added"
            description="Add your savings accounts, wallets, and cash accounts (excluding salary default) to see allocation."
            action={isAuthenticated ? (
              <button onClick={() => setShowAccountForm(true)} className="btn-primary !text-xs">
                Add Account
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
                    <th className="text-right">Current Balance</th>
                    <th className="text-right">Monthly Change (M-T-D)</th>
                  </tr>
                </thead>
                <tbody>
                  {savingsAccounts.map((acc) => {
                    const stats = accountStats[acc.id] || {};
                    const balance = stats.liveBalance ?? Number(acc.opening_balance);
                    const change = stats.monthlyChange || 0;
                    return (
                      <tr key={acc.id}>
                        <td className="font-semibold text-white">{acc.name}</td>
                        <td><span className="badge-neutral">{acc.type}</span></td>
                        <td className={`text-right font-bold ${balance >= 0 ? 'text-income-400' : 'text-expense-400'}`}>
                          ₹{fmt(balance)}
                        </td>
                        <td className={`text-right font-bold ${change >= 0 ? 'text-income-400' : 'text-expense-400'}`}>
                          {change > 0 ? '+' : ''}₹{fmt(change)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile view */}
            <div className="md:hidden space-y-3">
              {savingsAccounts.map((acc) => {
                const stats = accountStats[acc.id] || {};
                const balance = stats.liveBalance ?? Number(acc.opening_balance);
                const allocation = totalSavings > 0 ? (balance / totalSavings) * 100 : 0;
                const change = stats.monthlyChange || 0;
                return (
                  <div key={acc.id} className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white text-sm">{acc.name}</span>
                      <span className="badge-neutral !text-[10px]">{acc.type}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-surface-500 mb-0.5">Current Balance</p>
                        <p className={`font-bold ${balance >= 0 ? 'text-income-400' : 'text-expense-400'}`}>₹{fmt(balance)}</p>
                      </div>
                      <div>
                        <p className="text-surface-500 mb-0.5">Monthly Change (M-T-D)</p>
                        <p className={`font-bold ${change >= 0 ? 'text-income-400' : 'text-expense-400'}`}>
                          {change > 0 ? '+' : ''}₹{fmt(change)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Section 3: Credit Cards */}
      <div className="glass-card-static p-4 sm:p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-accent/10">
              <CreditCard size={20} className="text-accent-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Credit Cards</h2>
              <p className="text-xs text-surface-500">Utilization & limits overview</p>
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
            description="Add your credit cards to track dues and limits."
            action={isAuthenticated ? (
              <button onClick={() => setShowCardForm(true)} className="btn-primary !text-xs">
                Add Card
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
                    <th>Card Name</th>
                    <th className="text-right">Outstanding Due</th>
                    <th>Due Date</th>
                    <th className="text-center">Paid?</th>
                    <th className="text-right">Utilization %</th>
                    <th className="text-right">Available Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {creditCards.map((cc) => {
                    const stats = cardStats[cc.id] || {};
                    const owed = stats.owedDues ?? Number(cc.opening_dues);
                    const avail = stats.available ?? (Number(cc.credit_limit) - Number(cc.opening_dues));
                    const utilPct = Number(cc.credit_limit) > 0 ? (owed / Number(cc.credit_limit)) * 100 : 0;
                    const isPaid = stats.paidThisMonth || false;
                    return (
                      <tr key={cc.id}>
                        <td className="font-semibold text-white">{cc.name}</td>
                        <td className={`text-right font-bold ${owed > 0 ? 'text-expense-400' : 'text-income-400'}`}>
                          ₹{fmt(owed)}
                        </td>
                        <td className="text-surface-400 text-xs font-semibold">{fmtDueDay(cc.due_day)}</td>
                        <td className="text-center">
                          <div
                            className="flex justify-center"
                            title={isPaid ? "Payment logged this month" : "No payment logged this month"}
                          >
                            {isPaid ? (
                              <CheckSquare size={16} className="text-income-400 stroke-[2.5]" />
                            ) : (
                              <Square size={16} className="text-surface-600 stroke-[1.5]" />
                            )}
                          </div>
                        </td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className={`font-bold ${utilPct > 80 ? 'text-expense-400' : utilPct > 50 ? 'text-amber-400' : 'text-income-400'}`}>
                              {utilPct.toFixed(1)}%
                            </span>
                            <div className="w-16 bg-white/[0.06] rounded-full h-1.5 hidden lg:block">
                              <div
                                className="h-1.5 rounded-full"
                                style={{
                                  width: `${Math.min(utilPct, 100)}%`,
                                  background: utilPct > 80 ? 'var(--gradient-expense)' : utilPct > 50 ? '#f59e0b' : 'var(--gradient-income)',
                                }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="text-right text-income-400 font-bold">₹{fmt(avail)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="md:hidden space-y-3">
              {creditCards.map((cc) => {
                const stats = cardStats[cc.id] || {};
                const owed = stats.owedDues ?? Number(cc.opening_dues);
                const avail = stats.available ?? (Number(cc.credit_limit) - Number(cc.opening_dues));
                const utilPct = Number(cc.credit_limit) > 0 ? (owed / Number(cc.credit_limit)) * 100 : 0;
                const isPaid = stats.paidThisMonth || false;
                return (
                  <div key={cc.id} className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div title={isPaid ? "Payment logged this month" : "No payment logged this month"}>
                          {isPaid ? (
                            <CheckSquare size={14} className="text-income-400 stroke-[2.5]" />
                          ) : (
                            <Square size={14} className="text-surface-600 stroke-[1.5]" />
                          )}
                        </div>
                        <span className="font-semibold text-white text-sm">{cc.name}</span>
                      </div>
                      <span className="text-[10px] text-surface-500 font-semibold">Due: {fmtDueDay(cc.due_day)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-surface-500 mb-0.5">Outstanding Due</p>
                        <p className={`font-bold ${owed > 0 ? 'text-expense-400' : 'text-income-400'}`}>₹{fmt(owed)}</p>
                      </div>
                      <div>
                        <p className="text-surface-500 mb-0.5">Utilization</p>
                        <p className={`font-bold ${utilPct > 80 ? 'text-expense-400' : utilPct > 50 ? 'text-amber-400' : 'text-income-400'}`}>
                          {utilPct.toFixed(1)}%
                        </p>
                      </div>
                      <div className="col-span-2 border-t border-white/[0.04] pt-2 mt-1">
                        <p className="text-surface-500 mb-0.5">Available Credit</p>
                        <p className="text-income-400 font-bold">₹{fmt(avail)}</p>
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
