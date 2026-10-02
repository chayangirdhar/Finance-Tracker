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
  const salaryAndBonusIncome = monthIncome
    .filter((i) => ['Salary', 'Bonus'].includes(i.source))
    .reduce((s, i) => s + Number(i.amount), 0);
  const savingsRate = salaryAndBonusIncome > 0 ? (savings / salaryAndBonusIncome) * 100 : 0;

  // Weekend vs weekday (based on discretionary spend to remove fixed bills and savings/investments)
  const weekendTxns = discretionaryTxns.filter((t) => isWeekend(t.date));
  const weekdayTxns = discretionaryTxns.filter((t) => !isWeekend(t.date));
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

/**
 * Get the range of months from the earliest transaction/income to the previous completed month.
 * Returns an array of Date objects (month starts), most recent first.
 */
export function getActiveMonthRange(txns, income) {
  const allDates = [
    ...txns.map((t) => new Date(t.date)),
    ...income.map((i) => new Date(i.date)),
  ].filter((d) => !isNaN(d.getTime()));

  if (allDates.length === 0) return [];

  const earliest = new Date(Math.min(...allDates));
  const now = new Date();

  // Previous completed month
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  // If earliest is after last month, no completed months yet
  if (earliest > new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0)) {
    return [];
  }

  const months = [];
  let cursor = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
  const start = new Date(earliest.getFullYear(), earliest.getMonth(), 1);

  while (cursor >= start) {
    months.push(new Date(cursor));
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
  }

  return months; // Most recent first
}

/**
 * Compute anomaly insights for the current month vs historical data.
 * Returns an array of { type, severity, message } objects.
 * Types: 'velocity_spike', 'category_anomaly', 'pacing_alert'
 * Severity: 'warning', 'danger', 'info'
 */
export function computeAnomalyInsights(allTxns, allIncome, categories, catOpts) {
  const insights = [];
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const currentMonthTxns = allTxns.filter((t) => isInMonth(t.date, currentMonthStart));

  if (currentMonthTxns.length === 0) return insights;

  // --- 1. Velocity Spike: today's txn count vs daily average this month ---
  const today = now.getDate();
  const todayTxns = currentMonthTxns.filter((t) => new Date(t.date).getDate() === today);
  const elapsed = elapsedDaysInMonth(currentMonthStart);
  const avgDailyTxns = elapsed > 1 ? currentMonthTxns.length / elapsed : currentMonthTxns.length;

  if (todayTxns.length >= 4 && todayTxns.length >= avgDailyTxns * 2) {
    insights.push({
      type: 'velocity_spike',
      severity: 'warning',
      icon: '⚡',
      message: `You've made ${todayTxns.length} transactions today. Your daily average is ${avgDailyTxns.toFixed(1)}.`,
    });
  }

  // --- 2. Category Anomaly: current week vs 3-month average for top categories ---
  // Get past 3 months
  const past3Months = [1, 2, 3].map(
    (i) => new Date(now.getFullYear(), now.getMonth() - i, 1)
  );

  // Build per-category weekly average from past 3 months
  const catWeeklyAvg = {};
  const totalWeeks = past3Months.reduce((sum, m) => sum + daysInMonth(m) / 7, 0);

  past3Months.forEach((monthStart) => {
    const monthTxns = allTxns.filter((t) => isInMonth(t.date, monthStart));
    monthTxns.forEach((t) => {
      const catId = t.category_id;
      catWeeklyAvg[catId] = (catWeeklyAvg[catId] || 0) + Number(t.amount);
    });
  });

  // Convert totals to weekly averages
  Object.keys(catWeeklyAvg).forEach((catId) => {
    catWeeklyAvg[catId] = totalWeeks > 0 ? catWeeklyAvg[catId] / totalWeeks : 0;
  });

  // Current week's spend per category (last 7 days)
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thisWeekTxns = currentMonthTxns.filter((t) => new Date(t.date) >= weekAgo);
  const catThisWeek = {};
  thisWeekTxns.forEach((t) => {
    catThisWeek[t.category_id] = (catThisWeek[t.category_id] || 0) + Number(t.amount);
  });

  // Exclude non-discretionary categories
  const excludedCatIds = [
    ...(catOpts.fixedBillsCatIds || []),
    ...(catOpts.savingsCatIds || []),
    ...(catOpts.investmentCatIds || []),
    ...(catOpts.ccPaymentCatIds || []),
  ];

  Object.entries(catThisWeek).forEach(([catId, weekSpend]) => {
    const numCatId = Number(catId);
    if (excludedCatIds.includes(numCatId)) return;

    const avg = catWeeklyAvg[catId] || 0;
    if (avg > 0 && weekSpend > avg * 1.4) {
      const pctOver = Math.round(((weekSpend - avg) / avg) * 100);
      const catName = categories.find((c) => c.id === numCatId)?.name || 'Unknown';
      if (pctOver >= 30) {
        insights.push({
          type: 'category_anomaly',
          severity: pctOver >= 80 ? 'danger' : 'warning',
          icon: '📊',
          message: `You've spent ${pctOver}% more on '${catName}' this week than your 3-month weekly average.`,
        });
      }
    }
  });

  // --- 3. Pacing Alert: % month elapsed vs % discretionary spend consumed ---
  const totalDays = daysInMonth(currentMonthStart);
  const pctMonthElapsed = (elapsed / totalDays) * 100;

  // Get average monthly discretionary from past 3 months
  let totalPastDiscretionary = 0;
  let activeMonths = 0;
  past3Months.forEach((monthStart) => {
    const monthTxns = allTxns.filter((t) => isInMonth(t.date, monthStart));
    if (monthTxns.length === 0) return;
    activeMonths++;
    const disc = monthTxns
      .filter((t) => !excludedCatIds.includes(t.category_id))
      .reduce((s, t) => s + Number(t.amount), 0);
    totalPastDiscretionary += disc;
  });

  const avgMonthlyDiscretionary = activeMonths > 0 ? totalPastDiscretionary / activeMonths : 0;

  if (avgMonthlyDiscretionary > 0) {
    const currentDiscretionary = currentMonthTxns
      .filter((t) => !excludedCatIds.includes(t.category_id))
      .reduce((s, t) => s + Number(t.amount), 0);
    const pctSpendConsumed = (currentDiscretionary / avgMonthlyDiscretionary) * 100;

    // Alert if spend % is significantly ahead of time %
    if (pctSpendConsumed > pctMonthElapsed * 1.3 && pctSpendConsumed > 50) {
      insights.push({
        type: 'pacing_alert',
        severity: pctSpendConsumed > 90 ? 'danger' : 'warning',
        icon: '🚨',
        message: `You are ${Math.round(pctMonthElapsed)}% through the month but have consumed ${Math.round(pctSpendConsumed)}% of your usual discretionary spend.`,
      });
    }
  }

  return insights;
}

/**
 * Compute salary runway projection.
 * @param {number} salaryRemaining - Current salary remaining
 * @param {number} dailyBurnRate - Average daily spend from salary account this month
 * @returns {{ runwayDate: Date|null, daysLeft: number, isBeforeMonthEnd: boolean, burnRate: number }}
 */
export function computeSalaryRunway(salaryRemaining, dailyBurnRate) {
  const now = new Date();
  const totalDays = daysInMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  if (dailyBurnRate <= 0 || salaryRemaining <= 0) {
    return { runwayDate: null, daysLeft: 0, isBeforeMonthEnd: salaryRemaining <= 0, burnRate: dailyBurnRate };
  }

  const daysLeft = Math.floor(salaryRemaining / dailyBurnRate);
  const runwayDate = new Date(now);
  runwayDate.setDate(runwayDate.getDate() + daysLeft);

  const isBeforeMonthEnd = runwayDate < lastDayOfMonth;

  return { runwayDate, daysLeft, isBeforeMonthEnd, burnRate: r2(dailyBurnRate) };
}
