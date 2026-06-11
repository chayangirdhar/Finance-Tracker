/**
 * Statistical & financial utility functions
 */

/**
 * Calculate mean of an array of numbers
 */
export function mean(arr) {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce((sum, v) => sum + v, 0) / arr.length;
}

/**
 * Calculate median of an array of numbers
 */
export function median(arr) {
  if (!arr || arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Get financial year months (April → March) as Date objects
 * for a given reference date. Returns an array of 12 month start dates.
 */
export function getFinancialYearMonths(refDate = new Date()) {
  const year = refDate.getMonth() >= 3 ? refDate.getFullYear() : refDate.getFullYear() - 1;
  const months = [];
  for (let i = 0; i < 12; i++) {
    const m = (3 + i) % 12; // Apr=3, May=4, ... Mar=2
    const y = m >= 3 ? year : year + 1;
    months.push(new Date(y, m, 1));
  }
  return months;
}

/**
 * Check if a date falls within a given month (start of month)
 */
export function isInMonth(date, monthStart) {
  const d = new Date(date);
  return d.getFullYear() === monthStart.getFullYear() && d.getMonth() === monthStart.getMonth();
}

/**
 * Get the number of days in a month
 */
export function daysInMonth(monthStart) {
  return new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
}

/**
 * Get the number of elapsed days in a month (up to today if current month)
 */
export function elapsedDaysInMonth(monthStart) {
  const now = new Date();
  const totalDays = daysInMonth(monthStart);
  if (
    now.getFullYear() === monthStart.getFullYear() &&
    now.getMonth() === monthStart.getMonth()
  ) {
    return Math.min(now.getDate(), totalDays);
  }
  return totalDays;
}

/**
 * Check if a date is a weekend (Saturday or Sunday)
 */
export function isWeekend(date) {
  const d = new Date(date);
  const day = d.getDay();
  return day === 0 || day === 6;
}

/**
 * Format currency in Indian locale
 */
export function fmtINR(n, decimals = 2) {
  return Math.abs(n).toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Compute monthly stats for a set of transactions and income in a given month.
 * @param {Array} txns - All transactions
 * @param {Array} income - All income entries
 * @param {Date} monthStart - First day of the month
 * @param {Array} categories - Category objects from context
 * @param {Object} opts - { fixedBillsCatIds, savingsCatIds, investmentCatIds, ccPaymentCatIds }
 * @returns {Object} Stats object for the month
 */
export function computeMonthStats(txns, income, monthStart, categories, opts) {
  const monthTxns = txns.filter((t) => isInMonth(t.date, monthStart));
  const monthIncome = income.filter((i) => isInMonth(i.date, monthStart));

  const totalIncome = monthIncome.reduce((s, i) => s + Number(i.amount), 0);
  const totalExpenses = monthTxns.reduce((s, t) => s + Number(t.amount), 0);

  const fixedBills = monthTxns
    .filter((t) => opts.fixedBillsCatIds.includes(t.category_id))
    .reduce((s, t) => s + Number(t.amount), 0);

  const savings = monthTxns
    .filter((t) => opts.savingsCatIds.includes(t.category_id))
    .reduce((s, t) => s + Number(t.amount), 0);

  const investment = monthTxns
    .filter((t) => opts.investmentCatIds.includes(t.category_id))
    .reduce((s, t) => s + Number(t.amount), 0);

  const ccPaid = monthTxns
    .filter((t) => opts.ccPaymentCatIds.includes(t.category_id))
    .reduce((s, t) => s + Number(t.amount), 0);

  const net = totalIncome - totalExpenses;

  // Discretionary = everything except Fixed Bills, Savings, Investment, CC Payments
  const excludedCatIds = [
    ...opts.fixedBillsCatIds,
    ...opts.savingsCatIds,
    ...opts.investmentCatIds,
    ...opts.ccPaymentCatIds,
  ];
  const discretionaryTxns = monthTxns.filter(
    (t) => !excludedCatIds.includes(t.category_id)
  );
  const discretionary = discretionaryTxns.reduce((s, t) => s + Number(t.amount), 0);

  const amounts = monthTxns.map((t) => Number(t.amount));
  const discretionaryAmounts = discretionaryTxns.map((t) => Number(t.amount));

  const days = elapsedDaysInMonth(monthStart);
  const meanDaily = days > 0 ? totalExpenses / days : 0;
  const medianTxn = median(discretionaryAmounts); // Median of discretionary only
  const maxTxn = amounts.length > 0 ? Math.max(...amounts) : 0;
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

  // Weekend vs weekday
  const weekendTxns = monthTxns.filter((t) => isWeekend(t.date));
  const weekdayTxns = monthTxns.filter((t) => !isWeekend(t.date));
  const weekendSpend = weekendTxns.reduce((s, t) => s + Number(t.amount), 0);
  const weekdaySpend = weekdayTxns.reduce((s, t) => s + Number(t.amount), 0);

  // Count weekend and weekday days in month
  const totalDaysInMonth = daysInMonth(monthStart);
  let weekendDays = 0;
  let weekdayDays = 0;
  for (let d = 1; d <= totalDaysInMonth; d++) {
    const date = new Date(monthStart.getFullYear(), monthStart.getMonth(), d);
    if (isWeekend(date)) weekendDays++;
    else weekdayDays++;
  }

  const avgWeekendDaily = weekendDays > 0 ? weekendSpend / weekendDays : 0;
  const avgWeekdayDaily = weekdayDays > 0 ? weekdaySpend / weekdayDays : 0;

  // Expense velocity (transactions per day)
  const expenseVelocity = days > 0 ? monthTxns.length / days : 0;

  // CC dependency
  const ccSpend = monthTxns
    .filter((t) => t.payment_method === 'Credit Card')
    .reduce((s, t) => s + Number(t.amount), 0);
  const ccDependency = totalExpenses > 0 ? (ccSpend / totalExpenses) * 100 : 0;

  // Recurring expense ratio
  const recurringRatio = totalIncome > 0 ? (fixedBills / totalIncome) * 100 : 0;

  // Category concentration (top 3)
  const catSpend = {};
  monthTxns.forEach((t) => {
    catSpend[t.category_id] = (catSpend[t.category_id] || 0) + Number(t.amount);
  });
  const sortedCats = Object.entries(catSpend)
    .map(([id, amount]) => ({
      id: Number(id),
      name: categories.find((c) => c.id === Number(id))?.name || 'Unknown',
      amount,
    }))
    .sort((a, b) => b.amount - a.amount);
  const top3 = sortedCats.slice(0, 3);
  const top3Total = top3.reduce((s, c) => s + c.amount, 0);
  const categoryConcentration = totalExpenses > 0 ? (top3Total / totalExpenses) * 100 : 0;

  return {
    monthStart,
    totalIncome: r2(totalIncome),
    totalExpenses: r2(totalExpenses),
    fixedBills: r2(fixedBills),
    savings: r2(savings),
    investment: r2(investment),
    ccPaid: r2(ccPaid),
    net: r2(net),
    discretionary: r2(discretionary),
    meanDaily: r2(meanDaily),
    medianTxn: r2(medianTxn),
    maxTxn: r2(maxTxn),
    savingsRate: r2(savingsRate),
    txnCount: monthTxns.length,
    expenseVelocity: r2(expenseVelocity),
    ccDependency: r2(ccDependency),
    recurringRatio: r2(recurringRatio),
    avgWeekendDaily: r2(avgWeekendDaily),
    avgWeekdayDaily: r2(avgWeekdayDaily),
    categoryConcentration: r2(categoryConcentration),
    top3Categories: top3,
    monthTxns,
    discretionaryTxns,
  };
}

function r2(n) {
  return Math.round(n * 100) / 100;
}
