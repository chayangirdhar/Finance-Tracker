import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useDemoData } from '../context/DemoContext';
import EmptyState from '../components/shared/EmptyState';
import { format, startOfMonth, endOfMonth, subMonths, parseISO, eachDayOfInterval } from 'date-fns';
import {
  PieChart as PieChartIcon,
  Search,
  Calendar,
  CalendarRange,
  Filter,
  Trash2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Target,
  CreditCard,
  Repeat,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';
import toast from 'react-hot-toast';
import {
  mean,
  median,
  computeMonthStats,
  getFinancialYearMonths,
  fmtINR,
  isInMonth,
  daysInMonth,
} from '../utils/stats';

const CHART_COLORS = [
  '#8b5cf6', '#06b6d4', '#f43f5e', '#f59e0b', '#10b981',
  '#ec4899', '#3b82f6', '#84cc16', '#ef4444', '#14b8a6',
];

const PAGE_SIZE = 25;

export default function Analytics() {
  const { categories, subcategories, accounts, creditCards } = useApp();
  const { isAuthenticated } = useAuth();
  const demoData = useDemoData();
  const [allTxns, setAllTxns] = useState([]);
  const [allIncome, setAllIncome] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('monthly');

  // Monthly tab state
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [chartMonth, setChartMonth] = useState(format(new Date(), 'yyyy-MM'));

  // Ledger state
  const [ledgerTxns, setLedgerTxns] = useState([]);
  const [ledgerTotalCount, setLedgerTotalCount] = useState(0);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const months = getFinancialYearMonths();
      const startDate = format(months[0], 'yyyy-MM-01');
      const endDate = format(endOfMonth(months[11]), 'yyyy-MM-dd');

      const [txnRes, incRes] = await Promise.all([
        supabase.from('transactions')
          .select('*')
          .gte('date', startDate)
          .lte('date', `${endDate}T23:59:59`)
          .order('date', { ascending: false }),
        supabase.from('income')
          .select('*')
          .gte('date', startDate)
          .lte('date', `${endDate}T23:59:59`)
          .order('date', { ascending: false }),
      ]);
      if (txnRes.error) throw txnRes.error;
      if (incRes.error) throw incRes.error;
      setAllTxns(txnRes.data || []);
      setAllIncome(incRes.data || []);
    } catch (err) {
      console.error('Failed to fetch analytics data:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const fetchLedger = useCallback(async () => {
    const hasQuery = searchQuery.trim() !== '' || dateFrom !== '' || dateTo !== '' || filterCategory !== '';

    if (!isAuthenticated) {
      // Demo mode: filter local demoData.transactions
      let results = [...(demoData?.transactions || [])];
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        results = results.filter((t) => {
          const catName = (categories.find((c) => c.id === t.category_id)?.name || 'Unknown').toLowerCase();
          const subName = (subcategories.find((s) => s.id === t.subcategory_id)?.name || '').toLowerCase();
          const notes = (t.notes || '').toLowerCase();
          return catName.includes(q) || subName.includes(q) || notes.includes(q);
        });
      }
      if (dateFrom) {
        results = results.filter((t) => {
          const localDate = format(new Date(t.date), 'yyyy-MM-dd');
          return localDate >= dateFrom;
        });
      }
      if (dateTo) {
        results = results.filter((t) => {
          const localDate = format(new Date(t.date), 'yyyy-MM-dd');
          return localDate <= dateTo;
        });
      }
      if (filterCategory) {
        results = results.filter((t) => t.category_id === Number(filterCategory));
      }

      setLedgerTotalCount(results.length);
      
      if (!hasQuery) {
        setLedgerTxns(results.slice(0, 10));
      } else {
        const startIndex = (currentPage - 1) * PAGE_SIZE;
        setLedgerTxns(results.slice(startIndex, startIndex + PAGE_SIZE));
      }
      return;
    }

    // Authenticated mode: Supabase query
    try {
      setLedgerLoading(true);
      let query = supabase.from('transactions').select('*', { count: 'exact' });

      if (filterCategory) {
        query = query.eq('category_id', Number(filterCategory));
      }
      if (dateFrom) {
        query = query.gte('date', dateFrom);
      }
      if (dateTo) {
        query = query.lte('date', `${dateTo}T23:59:59`);
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchingCats = categories.filter(c => c.name.toLowerCase().includes(q)).map(c => c.id);
        const matchingSubs = subcategories.filter(s => s.name.toLowerCase().includes(q)).map(s => s.id);
        
        let orFilter = `notes.ilike.%${searchQuery}%`;
        if (matchingCats.length > 0) {
          orFilter += `,category_id.in.(${matchingCats.join(',')})`;
        }
        if (matchingSubs.length > 0) {
          orFilter += `,subcategory_id.in.(${matchingSubs.join(',')})`;
        }
        query = query.or(orFilter);
      }

      query = query.order('date', { ascending: false });

      if (!hasQuery) {
        query = query.limit(10);
      } else {
        const from = (currentPage - 1) * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        query = query.range(from, to);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      setLedgerTxns(data || []);
      setLedgerTotalCount(count || 0);
    } catch (err) {
      console.error('Failed to fetch ledger transactions:', err);
    } finally {
      setLedgerLoading(false);
    }
  }, [
    isAuthenticated,
    searchQuery,
    dateFrom,
    dateTo,
    filterCategory,
    currentPage,
    demoData?.transactions,
    categories,
    subcategories,
  ]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [fetchData, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated && demoData) {
      setAllTxns(demoData.transactions || []);
      setAllIncome(demoData.income || []);
      setLoading(false);
    }
  }, [isAuthenticated, demoData?.transactions, demoData?.income]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  // ─── Category ID lookups ──────────────────────────────────────
  const catOpts = useMemo(() => {
    const findIds = (names) =>
      categories.filter((c) => names.includes(c.name)).map((c) => c.id);
    return {
      fixedBillsCatIds: findIds(['Fixed Bills']),
      savingsCatIds: findIds(['Added to Savings']),
      investmentCatIds: findIds(['Investment']),
      ccPaymentCatIds: findIds(['Credit Card Payment']),
    };
  }, [categories]);

  // ─── Helper fns ───────────────────────────────────────────────
  const getCategoryName = (id) => categories.find((c) => c.id === id)?.name || 'Unknown';
  const getSubcategoryName = (id) => subcategories.find((s) => s.id === id)?.name || '';
  const getAccountName = (id) => accounts.find((a) => a.id === id)?.name || '';
  const getCCName = (id) => creditCards.find((c) => c.id === id)?.name || '';
  const fmt = (n) => fmtINR(n);

  // Filter income to only count deposits into default salary accounts
  const salaryAccountIds = useMemo(() => {
    return accounts.filter((a) => a.is_salary_default).map((a) => a.id);
  }, [accounts]);

  const filteredIncome = useMemo(() => {
    return allIncome.filter((i) => i.account_id && salaryAccountIds.includes(Number(i.account_id)));
  }, [allIncome, salaryAccountIds]);

  // ─── Monthly stats for selected chart month ───────────────────
  const currentMonthStats = useMemo(() => {
    if (categories.length === 0) return null;
    const [year, month] = chartMonth.split('-').map(Number);
    const monthStart = new Date(year, month - 1, 1);
    return computeMonthStats(allTxns, filteredIncome, monthStart, categories, catOpts);
  }, [allTxns, filteredIncome, chartMonth, categories, catOpts]);

  const prevMonthStats = useMemo(() => {
    if (categories.length === 0) return null;
    const [year, month] = chartMonth.split('-').map(Number);
    const prev = subMonths(new Date(year, month - 1, 1), 1);
    return computeMonthStats(allTxns, filteredIncome, prev, categories, catOpts);
  }, [allTxns, filteredIncome, chartMonth, categories, catOpts]);

  // MoM change
  const momChange = useMemo(() => {
    if (!currentMonthStats || !prevMonthStats || prevMonthStats.totalExpenses === 0) return null;
    return ((currentMonthStats.totalExpenses - prevMonthStats.totalExpenses) / prevMonthStats.totalExpenses) * 100;
  }, [currentMonthStats, prevMonthStats]);

  // ─── Filtered transactions for ledger ─────────────────────────
  const filteredTxns = useMemo(() => {
    let results = [...allTxns];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      results = results.filter((t) => {
        const catName = getCategoryName(t.category_id).toLowerCase();
        const subName = getSubcategoryName(t.subcategory_id).toLowerCase();
        const notes = (t.notes || '').toLowerCase();
        return catName.includes(q) || subName.includes(q) || notes.includes(q);
      });
    }
    if (dateFrom) {
      results = results.filter((t) => {
        const localDate = format(new Date(t.date), 'yyyy-MM-dd');
        return localDate >= dateFrom;
      });
    }
    if (dateTo) {
      results = results.filter((t) => {
        const localDate = format(new Date(t.date), 'yyyy-MM-dd');
        return localDate <= dateTo;
      });
    }
    if (filterCategory) results = results.filter((t) => t.category_id === Number(filterCategory));
    return results;
  }, [allTxns, searchQuery, dateFrom, dateTo, filterCategory, categories, subcategories]);

  const totalPages = Math.ceil(filteredTxns.length / PAGE_SIZE);
  const paginatedTxns = filteredTxns.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  useEffect(() => { setCurrentPage(1); }, [searchQuery, dateFrom, dateTo, filterCategory]);

  // ─── Donut chart data ─────────────────────────────────────────
  const donutData = useMemo(() => {
    const [year, month] = chartMonth.split('-').map(Number);
    const start = startOfMonth(new Date(year, month - 1));
    const end = endOfMonth(new Date(year, month - 1));
    const monthTxns = allTxns.filter((t) => {
      const d = new Date(t.date);
      return d >= start && d <= end;
    });
    const byCat = {};
    monthTxns.forEach((t) => {
      const name = getCategoryName(t.category_id);
      byCat[name] = (byCat[name] || 0) + Number(t.amount);
    });
    return Object.entries(byCat)
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value);
  }, [allTxns, chartMonth, categories]);

  const donutTotal = donutData.reduce((s, d) => s + d.value, 0);

  // ─── Cumulative area chart data ───────────────────────────────
  const areaData = useMemo(() => {
    const [year, month] = chartMonth.split('-').map(Number);
    const currentStart = new Date(year, month - 1, 1);
    const currentEnd = endOfMonth(currentStart);
    const prevStart = subMonths(currentStart, 1);
    const prevEnd = endOfMonth(prevStart);
    const totalDays = daysInMonth(currentStart);

    const currentTxns = allTxns.filter((t) => isInMonth(t.date, currentStart));
    const prevTxns = allTxns.filter((t) => isInMonth(t.date, prevStart));

    const data = [];
    let cumCurrent = 0;
    let cumPrev = 0;

    for (let day = 1; day <= totalDays; day++) {
      const daySpendCurrent = currentTxns
        .filter((t) => new Date(t.date).getDate() === day)
        .reduce((s, t) => s + Number(t.amount), 0);
      const daySpendPrev = prevTxns
        .filter((t) => new Date(t.date).getDate() === day)
        .reduce((s, t) => s + Number(t.amount), 0);

      cumCurrent += daySpendCurrent;
      cumPrev += daySpendPrev;

      data.push({
        day: `Day ${day}`,
        'This Month': Math.round(cumCurrent),
        'Last Month': Math.round(cumPrev),
      });
    }
    return data;
  }, [allTxns, chartMonth]);

  // ─── Yearly: Financial year month stats ───────────────────────
  const fyMonths = useMemo(() => getFinancialYearMonths(), []);
  const yearlyStats = useMemo(() => {
    if (categories.length === 0) return [];
    return fyMonths.map((m) => computeMonthStats(allTxns, filteredIncome, m, categories, catOpts));
  }, [allTxns, filteredIncome, fyMonths, categories, catOpts]);

  // Annual aggregates
  const annualAgg = useMemo(() => {
    if (yearlyStats.length === 0) return null;
    const activeMonths = yearlyStats.filter((s) => s.txnCount > 0 || s.totalIncome > 0);
    if (activeMonths.length === 0) return null;

    const totalIncome = yearlyStats.reduce((s, m) => s + m.totalIncome, 0);
    const totalExpenses = yearlyStats.reduce((s, m) => s + m.totalExpenses, 0);
    const totalDiscretionary = yearlyStats.reduce((s, m) => s + m.discretionary, 0);
    const totalFixedBills = yearlyStats.reduce((s, m) => s + m.fixedBills, 0);
    const allMedians = activeMonths.map((m) => m.medianTxn);
    const allSavingsRates = activeMonths.filter((m) => m.totalIncome > 0).map((m) => m.savingsRate);
    const allMaxTxns = activeMonths.map((m) => m.maxTxn);

    // Total days across active months
    const totalDays = activeMonths.reduce((s, m) => daysInMonth(m.monthStart), 0);

    // Best/worst savings rate months
    const ratedMonths = activeMonths
      .filter((m) => m.totalIncome > 0)
      .map((m) => ({ ...m, label: format(m.monthStart, 'MMMM') }));
    const bestMonth = ratedMonths.length > 0
      ? ratedMonths.reduce((a, b) => (a.savingsRate > b.savingsRate ? a : b))
      : null;
    const worstMonth = ratedMonths.length > 0
      ? ratedMonths.reduce((a, b) => (a.savingsRate < b.savingsRate ? a : b))
      : null;

    // Highest single txn
    const allTxnAmounts = allTxns.map((t) => ({ amount: Number(t.amount), date: t.date, category_id: t.category_id }));
    const highestTxn = allTxnAmounts.length > 0
      ? allTxnAmounts.reduce((a, b) => (a.amount > b.amount ? a : b))
      : null;

    const activeRecurringRatios = activeMonths
      .filter((m) => m.totalIncome > 0)
      .map((m) => m.recurringRatio);
    const avgRecurringRatio = mean(activeRecurringRatios);
    const avgMonthlyFixedBills = totalFixedBills / (activeMonths.length || 1);

    // Savings Consistency Index (excluding saving/investment transactions)
    const savingMonths = activeMonths.filter((s) => {
      const adjustedExpenses = s.totalExpenses - s.savings - s.investment;
      const adjustedSavings = s.totalIncome - adjustedExpenses;
      return adjustedSavings > 0;
    });
    const savingsConsistency = activeMonths.length > 0
      ? (savingMonths.length / activeMonths.length) * 100
      : 0;

    return {
      totalIncome,
      totalExpenses,
      totalDiscretionary,
      avgMonthlyDiscretionary: totalDiscretionary / (activeMonths.length || 1),
      avgDailyDiscretionary: totalDays > 0 ? totalDiscretionary / totalDays : 0,
      avgOfMonthlyMedians: mean(allMedians),
      highestTxn,
      bestMonth,
      worstMonth,
      avgSavingsRate: mean(allSavingsRates),
      activeMonthCount: activeMonths.length,
      avgMonthlyFixedBills,
      avgRecurringRatio,
      savingsConsistency,
      savingMonthsCount: savingMonths.length,
    };
  }, [yearlyStats, allTxns]);

  // ─── Line chart data (monthly trends) ─────────────────────────
  const lineData = useMemo(() => {
    return yearlyStats.map((s) => ({
      month: format(s.monthStart, 'MMM'),
      'Mean Daily': Math.round(s.meanDaily),
      'Median Txn': Math.round(s.medianTxn),
      'Max Txn': Math.round(s.maxTxn),
    }));
  }, [yearlyStats]);

  // ─── Delete handler ───────────────────────────────────────────
  const handleDeleteTxn = async (id) => {
    if (!confirm('Delete this transaction?')) return;
    try {
      if (isAuthenticated) {
        const { error } = await supabase.from('transactions').delete().eq('id', id);
        if (error) throw error;
        fetchData();
        fetchLedger();
      } else if (demoData) {
        demoData.deleteTransaction(id);
      }
      toast.success('Deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  // ─── Tooltips ─────────────────────────────────────────────────
  const GlassTooltip = ({ active, payload, label, showLabel = true }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="glass-card-static p-3 !rounded-xl text-sm" style={{ background: 'rgba(15,23,42,0.95)' }}>
        {showLabel && <p className="font-semibold text-white mb-1">{label}</p>}
        {payload.map((p) => (
          <p key={p.dataKey} style={{ color: p.color }}>
            {p.dataKey}: ₹{Number(p.value).toLocaleString('en-IN')}
          </p>
        ))}
      </div>
    );
  };

  const DonutTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0];
    const pct = donutTotal > 0 ? ((d.value / donutTotal) * 100).toFixed(1) : 0;
    return (
      <div className="glass-card-static p-3 !rounded-xl text-sm" style={{ background: 'rgba(15,23,42,0.95)' }}>
        <p className="font-semibold text-white">{d.name}</p>
        <p className="text-surface-400">₹{fmt(d.value)} ({pct}%)</p>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-12 rounded-2xl bg-white/[0.03]" />
        <div className="h-64 rounded-2xl bg-white/[0.03]" />
        <div className="h-96 rounded-2xl bg-white/[0.03]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Tab Switcher */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06] w-fit">
        <button
          onClick={() => setActiveTab('monthly')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
            activeTab === 'monthly'
              ? 'bg-gradient-to-r from-accent-500/20 to-accent-600/20 text-accent-300 shadow-lg shadow-accent-500/10'
              : 'text-surface-400 hover:text-surface-200 hover:bg-white/[0.04]'
          }`}
        >
          <Calendar size={15} />
          Monthly
        </button>
        <button
          onClick={() => setActiveTab('yearly')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
            activeTab === 'yearly'
              ? 'bg-gradient-to-r from-accent-500/20 to-accent-600/20 text-accent-300 shadow-lg shadow-accent-500/10'
              : 'text-surface-400 hover:text-surface-200 hover:bg-white/[0.04]'
          }`}
        >
          <CalendarRange size={15} />
          Yearly
        </button>
      </div>

      {activeTab === 'monthly' ? (
        <MonthlyView
          chartMonth={chartMonth}
          setChartMonth={setChartMonth}
          currentMonthStats={currentMonthStats}
          prevMonthStats={prevMonthStats}
          momChange={momChange}
          donutData={donutData}
          donutTotal={donutTotal}
          areaData={areaData}
          filteredTxns={ledgerTxns}
          paginatedTxns={ledgerTxns}
          totalPages={searchQuery.trim() !== '' || dateFrom !== '' || dateTo !== '' || filterCategory !== '' ? Math.ceil(ledgerTotalCount / PAGE_SIZE) : 1}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          dateFrom={dateFrom}
          setDateFrom={setDateFrom}
          dateTo={dateTo}
          setDateTo={setDateTo}
          filterCategory={filterCategory}
          setFilterCategory={setFilterCategory}
          categories={categories}
          getCategoryName={getCategoryName}
          getSubcategoryName={getSubcategoryName}
          getAccountName={getAccountName}
          getCCName={getCCName}
          handleDeleteTxn={handleDeleteTxn}
          fmt={fmt}
          DonutTooltip={DonutTooltip}
          GlassTooltip={GlassTooltip}
          totalRecords={ledgerTotalCount}
          hasQuery={searchQuery.trim() !== '' || dateFrom !== '' || dateTo !== '' || filterCategory !== ''}
          ledgerLoading={ledgerLoading}
        />
      ) : (
        <YearlyView
          yearlyStats={yearlyStats}
          annualAgg={annualAgg}
          lineData={lineData}
          categories={categories}
          getCategoryName={getCategoryName}
          fmt={fmt}
          GlassTooltip={GlassTooltip}
          allTxns={allTxns}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MONTHLY TAB
// ═══════════════════════════════════════════════════════════════
function MonthlyView({
  chartMonth, setChartMonth, currentMonthStats, prevMonthStats, momChange,
  donutData, donutTotal, areaData,
  filteredTxns, paginatedTxns, totalPages, currentPage, setCurrentPage,
  searchQuery, setSearchQuery, dateFrom, setDateFrom, dateTo, setDateTo,
  filterCategory, setFilterCategory,
  categories, getCategoryName, getSubcategoryName, getAccountName, getCCName,
  handleDeleteTxn, fmt, DonutTooltip, GlassTooltip,
  totalRecords, hasQuery, ledgerLoading,
}) {
  const stats = currentMonthStats;

  return (
    <div className="space-y-6">
      {/* Month Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Monthly Analytics</h2>
        <input
          type="month"
          value={chartMonth}
          onChange={(e) => setChartMonth(e.target.value)}
          className="input-glass !w-auto !py-2 !px-4 !text-sm"
        />
      </div>

      {/* KPI Cards Row 1 — Primary */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <KPICard
            icon={TrendingUp}
            label="Savings Rate"
            value={`${stats.savingsRate.toFixed(1)}%`}
            color={stats.savingsRate >= 20 ? 'income' : stats.savingsRate >= 0 ? 'accent' : 'expense'}
            sublabel={stats.savingsRate >= 20 ? 'Healthy' : stats.savingsRate >= 0 ? 'Moderate' : 'Deficit'}
            tooltip="Percentage of your income that was saved (Income - Expenses) / Income."
          />
          <KPICard
            icon={Activity}
            label="Avg Daily Spend"
            value={`₹${fmt(stats.meanDaily)}`}
            color="accent"
            tooltip="Average amount spent per day in the current month."
          />
          <KPICard
            icon={BarChart3}
            label="Median Disc. Txn"
            value={`₹${fmt(stats.medianTxn)}`}
            color="accent"
            sublabel="Excl. fixed bills"
            tooltip="The middle value of your discretionary transactions, excluding fixed bills."
          />
          <KPICard
            icon={ArrowUpRight}
            label="Largest Txn"
            value={`₹${fmt(stats.maxTxn)}`}
            color="expense"
            tooltip="The single highest transaction logged in the current month."
          />
          <KPICard
            icon={Target}
            label="Discretionary"
            value={`₹${fmt(stats.discretionary)}`}
            color="accent"
            sublabel={`of ₹${fmt(stats.totalExpenses)} total`}
            tooltip="Your total non-essential spending, excluding fixed bills like rent or EMIs."
          />
          <KPICard
            icon={momChange !== null && momChange > 0 ? TrendingUp : TrendingDown}
            label="MoM Change"
            value={momChange !== null ? `${momChange > 0 ? '+' : ''}${momChange.toFixed(1)}%` : 'N/A'}
            color={momChange !== null && momChange > 0 ? 'expense' : 'income'}
            sublabel={momChange !== null ? (momChange > 0 ? 'Spending up' : 'Spending down') : 'No prior data'}
            tooltip="Month-over-Month change in your total spending compared to last month."
          />
        </div>
      )}

      {/* KPI Cards Row 2 — Additional */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <KPICard
            icon={Zap}
            label="Expense Velocity"
            value={`${stats.expenseVelocity.toFixed(1)}/day`}
            color="accent"
            sublabel={`${stats.txnCount} txns this month`}
            tooltip="Average number of transaction entries logged per day."
          />
          <KPICard
            icon={Target}
            label="Top 3 Category %"
            value={`${stats.categoryConcentration.toFixed(0)}%`}
            color={stats.categoryConcentration > 80 ? 'expense' : 'accent'}
            sublabel={stats.top3Categories.map((c) => c.name).join(', ') || '—'}
            tooltip="The percentage of your total monthly spending consumed by your top 3 categories."
          />
          <KPICard
            icon={Calendar}
            label="Weekend vs Weekday"
            value={`₹${fmt(stats.avgWeekendDaily)}`}
            color={stats.avgWeekendDaily > stats.avgWeekdayDaily ? 'expense' : 'income'}
            sublabel={`Weekday: ₹${fmt(stats.avgWeekdayDaily)}/day`}
            tooltip="Average daily spend on weekends. A lower number indicates stable weekly spending."
          />
          <KPICard
            icon={CreditCard}
            label="CC Dependency"
            value={`${stats.ccDependency.toFixed(1)}%`}
            color={stats.ccDependency > 50 ? 'expense' : 'income'}
            sublabel={stats.ccDependency > 50 ? 'High CC usage' : 'Healthy'}
            tooltip="Percentage of transactions paid using credit cards vs cash or bank transfers."
          />
          <KPICard
            icon={Repeat}
            label="Recurring Ratio"
            value={`${stats.recurringRatio.toFixed(1)}%`}
            color={stats.recurringRatio > 50 ? 'expense' : 'accent'}
            sublabel={`Fixed Bills: ₹${fmt(stats.fixedBills)}`}
            tooltip="The portion of your income consumed by fixed monthly bills (Fixed Bills / Income)."
          />
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut Chart */}
        <div className="glass-card-static p-4 sm:p-6">
          <h3 className="text-sm font-bold text-white mb-4">Category Breakdown</h3>
          {donutData.length === 0 ? (
            <div className="flex items-center justify-center h-56 text-surface-500 text-sm">
              No data for this month
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="w-full sm:w-1/2 flex justify-center">
                <div className="w-full max-w-[200px]">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={donutData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                      >
                        {donutData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<DonutTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="w-full sm:w-1/2 space-y-1.5 max-h-56 overflow-y-auto">
                {donutData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2 text-xs">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                    />
                    <span className="text-surface-300 flex-1 truncate">{d.name}</span>
                    <span className="text-surface-400 font-medium">₹{d.value.toLocaleString('en-IN')}</span>
                  </div>
                ))}
                <div className="border-t border-white/[0.06] pt-1.5 mt-2 flex justify-between text-xs font-bold">
                  <span className="text-white">Total</span>
                  <span className="text-expense-400">₹{fmt(donutTotal)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Area Chart — Cumulative Spend Pacing */}
        <div className="glass-card-static p-4 sm:p-6">
          <h3 className="text-sm font-bold text-white mb-4">Spend Pacing — This vs Last Month</h3>
          {areaData.every((d) => d['This Month'] === 0 && d['Last Month'] === 0) ? (
            <div className="flex items-center justify-center h-56 text-surface-500 text-sm">
              No data to display
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={areaData}>
                <defs>
                  <linearGradient id="gradCurrent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradPrev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#64748b" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#64748b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis
                  dataKey="day"
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  interval={4}
                />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={55}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<GlassTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                <Area
                  type="monotone"
                  dataKey="Last Month"
                  stroke="#64748b"
                  strokeWidth={1.5}
                  fill="url(#gradPrev)"
                  strokeDasharray="4 4"
                />
                <Area
                  type="monotone"
                  dataKey="This Month"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  fill="url(#gradCurrent)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Transaction Ledger */}
      <div className="glass-card-static p-4 sm:p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <PieChartIcon size={20} className="text-accent-400" />
            <h2 className="text-lg font-bold text-white">Transaction Ledger</h2>
            <span className="badge-neutral">
              {hasQuery ? `${totalRecords} records` : 'Latest 10 records'}
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search transactions..."
              className="input-glass !pl-9 !py-2.5 !text-sm"
            />
          </div>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="input-glass !py-2.5 !text-sm"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="input-glass !py-2.5 !text-sm"
          />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="input-glass !py-2.5 !text-sm"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        {ledgerLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-surface-400">
            <Loader2 className="w-8 h-8 animate-spin text-accent-400 mb-2" />
            <p className="text-sm">Querying ledger...</p>
          </div>
        ) : filteredTxns.length === 0 ? (
          <EmptyState
            icon={PieChartIcon}
            title="No transactions found"
            description="Adjust your filters or start logging expenses"
          />
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Sub-category</th>
                    <th className="text-right">Amount</th>
                    <th>Payment</th>
                    <th>Notes</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTxns.map((txn) => (
                    <tr key={txn.id} className="group">
                      <td className="text-surface-300 whitespace-nowrap">
                        {format(new Date(txn.date), 'd MMM yy, h:mm a')}
                      </td>
                      <td>
                        <span className="badge-accent">{getCategoryName(txn.category_id)}</span>
                      </td>
                      <td className="text-surface-400">{getSubcategoryName(txn.subcategory_id)}</td>
                      <td className="text-right font-bold text-expense-400">
                        ₹{fmt(Number(txn.amount))}
                      </td>
                      <td>
                        <span className="text-xs text-surface-400">
                          {txn.payment_method}
                          {txn.credit_card_id ? ` · ${getCCName(txn.credit_card_id)}` : ''}
                          {txn.account_id ? ` · ${getAccountName(txn.account_id)}` : ''}
                        </span>
                      </td>
                      <td className="text-surface-500 text-xs max-w-[200px] truncate">{txn.notes}</td>
                      <td>
                        <button
                          onClick={() => handleDeleteTxn(txn.id)}
                          className="opacity-0 group-hover:opacity-100 text-surface-600 hover:text-expense-400 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Card View */}
            <div className="md:hidden space-y-3">
              {paginatedTxns.map((txn) => (
                <div key={txn.id} className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-2 relative">
                  <div className="flex items-center justify-between">
                    <span className="badge-accent">{getCategoryName(txn.category_id)}</span>
                    <span className="font-bold text-expense-400">₹{fmt(Number(txn.amount))}</span>
                  </div>
                  {getSubcategoryName(txn.subcategory_id) && (
                    <div className="text-xs text-surface-400">
                      Sub-category: <span className="text-surface-300 font-medium">{getSubcategoryName(txn.subcategory_id)}</span>
                    </div>
                  )}
                  <div className="text-[11px] text-surface-500 flex justify-between pr-6">
                    <span>{format(new Date(txn.date), 'd MMM yy, h:mm a')}</span>
                    <span>
                      {txn.payment_method}
                      {txn.credit_card_id ? ` · ${getCCName(txn.credit_card_id)}` : ''}
                      {txn.account_id ? ` · ${getAccountName(txn.account_id)}` : ''}
                    </span>
                  </div>
                  {txn.notes && (
                    <p className="text-xs text-surface-600 border-t border-white/[0.04] pt-1.5 mt-1 pr-6">{txn.notes}</p>
                  )}
                  
                  <button
                    onClick={() => handleDeleteTxn(txn.id)}
                    className="absolute right-3 bottom-3 text-surface-500 hover:text-expense-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/[0.06]">
                <span className="text-xs text-surface-500">
                  Page {currentPage} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="btn-ghost !p-2 disabled:opacity-30"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="btn-ghost !p-2 disabled:opacity-30"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// YEARLY TAB
// ═══════════════════════════════════════════════════════════════
function YearlyView({ yearlyStats, annualAgg, lineData, categories, getCategoryName, fmt, GlassTooltip, allTxns }) {
  const hasData = yearlyStats.some((s) => s.txnCount > 0 || s.totalIncome > 0);

  if (!hasData) {
    return (
      <div className="glass-card-static p-12">
        <EmptyState
          icon={CalendarRange}
          title="No yearly data yet"
          description="Start logging expenses and income to see your annual analytics"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-white">Annual Finance Dashboard — FY {format(yearlyStats[0]?.monthStart || new Date(), 'yyyy')}–{format(yearlyStats[11]?.monthStart || new Date(), 'yy')}</h2>

      {/* Annual Summary Cards */}
      {annualAgg && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <KPICard
            icon={TrendingUp}
            label="Total Income"
            value={`₹${fmt(annualAgg.totalIncome)}`}
            color="income"
          />
          <KPICard
            icon={TrendingDown}
            label="Total Expenses"
            value={`₹${fmt(annualAgg.totalExpenses)}`}
            color="expense"
          />
          <KPICard
            icon={Target}
            label="Avg Savings Rate"
            value={`${annualAgg.avgSavingsRate.toFixed(1)}%`}
            color={annualAgg.avgSavingsRate >= 20 ? 'income' : 'accent'}
          />
          <KPICard
            icon={Activity}
            label="Active Months"
            value={`${annualAgg.activeMonthCount}`}
            color="accent"
          />
        </div>
      )}

      {/* Line Chart — Monthly Stats Trends */}
      <div className="glass-card-static p-4 sm:p-6">
        <h3 className="text-sm font-bold text-white mb-4">Spending Volatility — Mean / Median / Max Trends</h3>
        {lineData.every((d) => d['Mean Daily'] === 0 && d['Median Txn'] === 0 && d['Max Txn'] === 0) ? (
          <div className="flex items-center justify-center h-56 text-surface-500 text-sm">
            No data to display
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="month"
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={60}
                tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<GlassTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
              <Line
                type="monotone"
                dataKey="Mean Daily"
                stroke="#06b6d4"
                strokeWidth={2}
                dot={{ fill: '#06b6d4', r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="Median Txn"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={{ fill: '#8b5cf6', r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="Max Txn"
                stroke="#f43f5e"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: '#f43f5e', r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Financial & Spending Insights Panel */}
      {annualAgg && (
        <div className="glass-card-static p-4 sm:p-6">
          <h3 className="text-sm font-bold text-white mb-5">Financial & Spending Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <InsightCard
              label="Avg Monthly Discretionary"
              value={`₹${fmt(annualAgg.avgMonthlyDiscretionary)}`}
            />
            <InsightCard
              label="Avg Daily Discretionary (Year)"
              value={`₹${fmt(annualAgg.avgDailyDiscretionary)}`}
            />
            <InsightCard
              label="Avg of Monthly Medians"
              value={`₹${fmt(annualAgg.avgOfMonthlyMedians)}`}
            />
            <InsightCard
              label="Avg Monthly Fixed Bills"
              value={`₹${fmt(annualAgg.avgMonthlyFixedBills)}`}
              sublabel={`${annualAgg.avgRecurringRatio.toFixed(1)}% of income (avg)`}
              color="accent"
            />
            <InsightCard
              label="Highest Single Transaction"
              value={annualAgg.highestTxn ? `₹${fmt(annualAgg.highestTxn.amount)}` : '—'}
              sublabel={annualAgg.highestTxn
                ? `${getCategoryName(annualAgg.highestTxn.category_id)} · ${format(new Date(annualAgg.highestTxn.date), 'd MMM yy')}`
                : ''}
            />
            <InsightCard
              label="Best Savings Month"
              value={annualAgg.bestMonth ? `${annualAgg.bestMonth.label} (${annualAgg.bestMonth.savingsRate.toFixed(1)}%)` : '—'}
              color="income"
            />
            <InsightCard
              label="Worst Savings Month"
              value={annualAgg.worstMonth ? `${annualAgg.worstMonth.label} (${annualAgg.worstMonth.savingsRate.toFixed(1)}%)` : '—'}
              color="expense"
            />
            <InsightCard
              label="Savings Consistency"
              value={annualAgg.savingsConsistency !== undefined ? `${annualAgg.savingsConsistency.toFixed(1)}%` : '—'}
              sublabel={annualAgg.savingMonthsCount !== undefined ? `${annualAgg.savingMonthsCount} of ${annualAgg.activeMonthCount} active months` : ''}
              color={annualAgg.savingsConsistency >= 70 ? 'income' : annualAgg.savingsConsistency >= 40 ? 'accent' : 'expense'}
            />
            <InsightCard
              label="Avg Savings Rate (Year)"
              value={`${annualAgg.avgSavingsRate.toFixed(1)}%`}
              color={annualAgg.avgSavingsRate >= 20 ? 'income' : 'accent'}
            />
          </div>
        </div>
      )}

      {/* Month-Wise Summary (Table on Desktop, Collapsible cards on Mobile) */}
      <div className="glass-card-static p-4 sm:p-6">
        <h3 className="text-sm font-bold text-white mb-4">Month-Wise Summary (Apr → Mar)</h3>
        
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="data-table text-xs">
            <thead>
              <tr>
                <th>Month</th>
                <th className="text-right">Income</th>
                <th className="text-right">Expenses</th>
                <th className="text-right">Fixed Bills</th>
                <th className="text-right">Savings</th>
                <th className="text-right">Investment</th>
                <th className="text-right">CC Paid</th>
                <th className="text-right">Net</th>
                <th className="text-right">Discretionary</th>
                <th className="text-right">Mean Daily</th>
                <th className="text-right">Median Txn</th>
                <th className="text-right">Max Txn</th>
                <th className="text-right">Savings Rate</th>
              </tr>
            </thead>
            <tbody>
              {yearlyStats.map((s) => {
                const hasActivity = s.txnCount > 0 || s.totalIncome > 0;
                return (
                  <tr key={s.monthStart.toISOString()} className={!hasActivity ? 'opacity-30' : ''}>
                    <td className="font-semibold text-white whitespace-nowrap">
                      {format(s.monthStart, 'MMMM')}
                    </td>
                    <td className="text-right text-income-400">₹{fmt(s.totalIncome)}</td>
                    <td className="text-right text-expense-400">₹{fmt(s.totalExpenses)}</td>
                    <td className="text-right text-surface-300">₹{fmt(s.fixedBills)}</td>
                    <td className="text-right text-surface-300">₹{fmt(s.savings)}</td>
                    <td className="text-right text-surface-300">₹{fmt(s.investment)}</td>
                    <td className="text-right text-surface-300">₹{fmt(s.ccPaid)}</td>
                    <td className={`text-right font-semibold ${s.net >= 0 ? 'text-income-400' : 'text-expense-400'}`}>
                      {s.net < 0 ? '-' : ''}₹{fmt(s.net)}
                    </td>
                    <td className="text-right text-accent-400">₹{fmt(s.discretionary)}</td>
                    <td className="text-right text-surface-300">₹{fmt(s.meanDaily)}</td>
                    <td className="text-right text-surface-300">₹{fmt(s.medianTxn)}</td>
                    <td className="text-right text-surface-300">₹{fmt(s.maxTxn)}</td>
                    <td className={`text-right font-semibold ${s.savingsRate >= 20 ? 'text-income-400' : s.savingsRate >= 0 ? 'text-accent-400' : 'text-expense-400'}`}>
                      {s.savingsRate.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {annualAgg && (
              <tfoot>
                <tr className="border-t-2 border-white/[0.1]">
                  <td className="font-bold text-white">ANNUAL</td>
                  <td className="text-right font-bold text-income-400">₹{fmt(annualAgg.totalIncome)}</td>
                  <td className="text-right font-bold text-expense-400">₹{fmt(annualAgg.totalExpenses)}</td>
                  <td className="text-right font-bold text-surface-300">₹{fmt(yearlyStats.reduce((s, m) => s + m.fixedBills, 0))}</td>
                  <td className="text-right font-bold text-surface-300">₹{fmt(yearlyStats.reduce((s, m) => s + m.savings, 0))}</td>
                  <td className="text-right font-bold text-surface-300">₹{fmt(yearlyStats.reduce((s, m) => s + m.investment, 0))}</td>
                  <td className="text-right font-bold text-surface-300">₹{fmt(yearlyStats.reduce((s, m) => s + m.ccPaid, 0))}</td>
                  <td className={`text-right font-bold ${(annualAgg.totalIncome - annualAgg.totalExpenses) >= 0 ? 'text-income-400' : 'text-expense-400'}`}>
                    ₹{fmt(annualAgg.totalIncome - annualAgg.totalExpenses)}
                  </td>
                  <td className="text-right font-bold text-accent-400">₹{fmt(annualAgg.totalDiscretionary)}</td>
                  <td className="text-right text-surface-400">—</td>
                  <td className="text-right text-surface-400">—</td>
                  <td className="text-right text-surface-400">—</td>
                  <td className="text-right font-bold text-accent-400">{annualAgg.avgSavingsRate.toFixed(1)}%</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Mobile Accordion View */}
        <div className="md:hidden divide-y divide-white/[0.06]">
          {yearlyStats.map((s) => {
            const hasActivity = s.txnCount > 0 || s.totalIncome > 0;
            return (
              <details key={s.monthStart.toISOString()} className="group py-3 first:pt-0 last:pb-0" open={hasActivity && s.monthStart.getMonth() === new Date().getMonth()}>
                <summary className="flex items-center justify-between cursor-pointer list-none outline-none">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white text-sm">{format(s.monthStart, 'MMMM')}</span>
                    {!hasActivity && <span className="text-[10px] text-surface-600 font-medium">(Inactive)</span>}
                  </div>
                  <div className="flex items-center gap-3 text-xs font-semibold">
                    {hasActivity && (
                      <>
                        <span className={s.net >= 0 ? 'text-income-400' : 'text-expense-400'}>
                          {s.net < 0 ? '-' : ''}₹{Math.round(s.net).toLocaleString('en-IN')}
                        </span>
                        <span className="badge-neutral !py-0.5 !px-1.5 !text-[9px]">
                          {s.savingsRate.toFixed(0)}% saved
                        </span>
                      </>
                    )}
                    <span className="text-surface-500 text-[10px] transition-transform duration-200 group-open:rotate-180">▼</span>
                  </div>
                </summary>

                {hasActivity ? (
                  <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-white/[0.04] text-[11px]">
                    <div>
                      <p className="text-surface-500 mb-0.5">Income / Expenses</p>
                      <p className="text-white font-medium">₹{fmt(s.totalIncome)} / <span className="text-expense-400">₹{fmt(s.totalExpenses)}</span></p>
                    </div>
                    <div>
                      <p className="text-surface-500 mb-0.5">Net Position</p>
                      <p className={`font-bold ${s.net >= 0 ? 'text-income-400' : 'text-expense-400'}`}>
                        {s.net < 0 ? '-' : ''}₹{fmt(s.net)}
                      </p>
                    </div>
                    <div>
                      <p className="text-surface-500 mb-0.5">Fixed Bills</p>
                      <p className="text-surface-300 font-medium">₹{fmt(s.fixedBills)}</p>
                    </div>
                    <div>
                      <p className="text-surface-500 mb-0.5">Discretionary Spend</p>
                      <p className="text-accent-400 font-medium">₹{fmt(s.discretionary)}</p>
                    </div>
                    <div>
                      <p className="text-surface-500 mb-0.5">Savings / Investments</p>
                      <p className="text-surface-300 font-medium">₹{fmt(s.savings)} / ₹{fmt(s.investment)}</p>
                    </div>
                    <div>
                      <p className="text-surface-500 mb-0.5">Credit Card Paid</p>
                      <p className="text-surface-300 font-medium">₹{fmt(s.ccPaid)}</p>
                    </div>
                    <div>
                      <p className="text-surface-500 mb-0.5">Daily Avg / Median</p>
                      <p className="text-surface-300 font-medium">₹{fmt(s.meanDaily)} / ₹{fmt(s.medianTxn)}</p>
                    </div>
                    <div>
                      <p className="text-surface-500 mb-0.5">Largest Transaction</p>
                      <p className="text-expense-400 font-medium">₹{fmt(s.maxTxn)}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-surface-600 mt-2">No activity logged for this month.</p>
                )}
              </details>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════════
function KPICard({ icon: Icon, label, value, color = 'accent', sublabel, tooltip }) {
  const colorClasses = {
    income: 'text-income-400 bg-income/10',
    expense: 'text-expense-400 bg-expense/10',
    accent: 'text-accent-400 bg-accent/10',
  };
  const textColor = {
    income: 'text-income-400',
    expense: 'text-expense-400',
    accent: 'text-accent-400',
  };

  return (
    <div className="glass-card-static p-4 group hover:scale-[1.02] transition-all duration-200 relative">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          <Icon size={14} />
        </div>
        <span className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider leading-tight">{label}</span>
      </div>
      <p className={`text-lg font-bold ${textColor[color]} leading-tight`}>{value}</p>
      {sublabel && (
        <p className="text-[10px] text-surface-500 mt-1 truncate">{sublabel}</p>
      )}
      {tooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 hidden group-hover:block z-50 bg-slate-950/95 border border-white/[0.08] p-2.5 rounded-xl shadow-2xl text-[10px] text-surface-300 pointer-events-none text-center backdrop-blur-md">
          {tooltip}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-950/95" />
        </div>
      )}
    </div>
  );
}

function InsightCard({ label, value, sublabel, color }) {
  const textColor = color === 'income' ? 'text-income-400' : color === 'expense' ? 'text-expense-400' : 'text-white';

  return (
    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-colors">
      <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-1.5">{label}</p>
      <p className={`text-base font-bold ${textColor}`}>{value}</p>
      {sublabel && <p className="text-[10px] text-surface-400 mt-0.5">{sublabel}</p>}
    </div>
  );
}
