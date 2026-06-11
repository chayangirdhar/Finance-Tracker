/**
 * Demo data for guest / unauthenticated visitors.
 * Dates are generated relative to the current date for realistic display.
 */

// ── Helpers ────────────────────────────────────────────────────
function daysAgo(days, hours = 12, minutes = 0) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

function dateOnly(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0]; // yyyy-MM-dd
}

// ── Reference data (static) ────────────────────────────────────
export const DEMO_CATEGORIES = [
  { id: 1, name: 'Food & Dining' },
  { id: 2, name: 'Transportation' },
  { id: 3, name: 'Shopping' },
  { id: 4, name: 'Entertainment' },
  { id: 5, name: 'Fixed Bills' },
  { id: 6, name: 'Groceries' },
  { id: 7, name: 'Health & Wellness' },
  { id: 8, name: 'Added to Savings' },
  { id: 9, name: 'Credit Card Payment' },
  { id: 10, name: 'Investment' },
];

export const DEMO_SUBCATEGORIES = [
  { id: 1, category_id: 1, name: 'Restaurant' },
  { id: 2, category_id: 1, name: 'Café' },
  { id: 3, category_id: 1, name: 'Street Food' },
  { id: 4, category_id: 2, name: 'Auto / Cab' },
  { id: 5, category_id: 2, name: 'Fuel' },
  { id: 6, category_id: 2, name: 'Metro' },
  { id: 7, category_id: 3, name: 'Clothing' },
  { id: 8, category_id: 3, name: 'Electronics' },
  { id: 9, category_id: 3, name: 'Online Shopping' },
  { id: 10, category_id: 4, name: 'Movies' },
  { id: 11, category_id: 4, name: 'OTT Subscription' },
  { id: 12, category_id: 5, name: 'Rent' },
  { id: 13, category_id: 5, name: 'Electricity' },
  { id: 14, category_id: 5, name: 'Internet' },
  { id: 15, category_id: 6, name: 'Fruits & Vegetables' },
  { id: 16, category_id: 6, name: 'Daily Essentials' },
  { id: 17, category_id: 7, name: 'Medicine' },
  { id: 18, category_id: 7, name: 'Gym' },
];

export const DEMO_ACCOUNTS = [
  { id: 1, name: 'HDFC Savings', type: 'Bank', opening_balance: 85000 },
  { id: 2, name: 'Paytm Wallet', type: 'Wallet', opening_balance: 2500 },
  { id: 3, name: 'Cash', type: 'Cash', opening_balance: 5000 },
];

export const DEMO_CREDIT_CARDS = [
  { id: 1, name: 'HDFC Millennia', credit_limit: 150000, opening_dues: 12500 },
  { id: 2, name: 'Amazon Pay ICICI', credit_limit: 80000, opening_dues: 5800 },
];

// ── Transactions (generated with fresh dates) ──────────────────
export function getDefaultTransactions() {
  return [
    // Today
    { id: 1001, date: daysAgo(0, 9, 15), category_id: 1, subcategory_id: 2, amount: 85, payment_method: 'UPI', account_id: 1, credit_card_id: null, cc_payment_type: null, notes: 'Morning chai + biscuits' },
    { id: 1002, date: daysAgo(0, 12, 30), category_id: 1, subcategory_id: 1, amount: 320, payment_method: 'UPI', account_id: 1, credit_card_id: null, cc_payment_type: null, notes: 'Lunch at office canteen' },
    { id: 1003, date: daysAgo(0, 17, 45), category_id: 6, subcategory_id: 15, amount: 450, payment_method: 'Cash', account_id: null, credit_card_id: null, cc_payment_type: null, notes: 'Vegetables & fruits from market' },

    // Yesterday
    { id: 1004, date: daysAgo(1, 8, 30), category_id: 2, subcategory_id: 6, amount: 60, payment_method: 'UPI', account_id: 2, credit_card_id: null, cc_payment_type: null, notes: 'Metro to office' },
    { id: 1005, date: daysAgo(1, 13, 0), category_id: 1, subcategory_id: 3, amount: 120, payment_method: 'Cash', account_id: null, credit_card_id: null, cc_payment_type: null, notes: 'Chaat + golgappa' },
    { id: 1006, date: daysAgo(1, 19, 30), category_id: 4, subcategory_id: 11, amount: 199, payment_method: 'Credit Card', account_id: null, credit_card_id: 1, cc_payment_type: null, notes: 'Netflix monthly subscription' },
    { id: 1007, date: daysAgo(1, 20, 15), category_id: 6, subcategory_id: 16, amount: 890, payment_method: 'UPI', account_id: 1, credit_card_id: null, cc_payment_type: null, notes: 'BigBasket — weekly essentials' },

    // 2 days ago
    { id: 1008, date: daysAgo(2, 10, 0), category_id: 7, subcategory_id: 17, amount: 350, payment_method: 'UPI', account_id: 1, credit_card_id: null, cc_payment_type: null, notes: 'Cough syrup + multivitamins' },
    { id: 1009, date: daysAgo(2, 14, 30), category_id: 1, subcategory_id: 1, amount: 750, payment_method: 'Credit Card', account_id: null, credit_card_id: 2, cc_payment_type: null, notes: 'Dinner with friends — BBQ Nation' },
    { id: 1010, date: daysAgo(2, 16, 0), category_id: 2, subcategory_id: 4, amount: 285, payment_method: 'UPI', account_id: 1, credit_card_id: null, cc_payment_type: null, notes: 'Uber to Indiranagar' },

    // Earlier this month (3–10 days ago)
    { id: 1011, date: daysAgo(3, 11, 0), category_id: 3, subcategory_id: 9, amount: 1299, payment_method: 'Credit Card', account_id: null, credit_card_id: 2, cc_payment_type: null, notes: 'Amazon — phone case + earbuds' },
    { id: 1012, date: daysAgo(4, 18, 0), category_id: 5, subcategory_id: 14, amount: 799, payment_method: 'UPI', account_id: 1, credit_card_id: null, cc_payment_type: null, notes: 'Jio Fiber monthly bill' },
    { id: 1013, date: daysAgo(5, 9, 0), category_id: 5, subcategory_id: 13, amount: 1250, payment_method: 'UPI', account_id: 1, credit_card_id: null, cc_payment_type: null, notes: 'Electricity bill' },
    { id: 1014, date: daysAgo(6, 12, 0), category_id: 1, subcategory_id: 2, amount: 180, payment_method: 'UPI', account_id: 2, credit_card_id: null, cc_payment_type: null, notes: 'Coffee at Third Wave' },
    { id: 1015, date: daysAgo(7, 15, 30), category_id: 7, subcategory_id: 18, amount: 1500, payment_method: 'UPI', account_id: 1, credit_card_id: null, cc_payment_type: null, notes: 'Gym membership — monthly' },
    { id: 1016, date: daysAgo(8, 20, 0), category_id: 4, subcategory_id: 10, amount: 600, payment_method: 'Credit Card', account_id: null, credit_card_id: 1, cc_payment_type: null, notes: 'PVR — movie + popcorn' },
    { id: 1017, date: daysAgo(9, 10, 0), category_id: 3, subcategory_id: 7, amount: 2200, payment_method: 'Credit Card', account_id: null, credit_card_id: 1, cc_payment_type: null, notes: 'Myntra — T-shirts' },
    { id: 1018, date: daysAgo(10, 14, 0), category_id: 2, subcategory_id: 5, amount: 1800, payment_method: 'UPI', account_id: 1, credit_card_id: null, cc_payment_type: null, notes: 'Petrol — bike' },

    // Previous month (30–50 days ago, for analytics)
    { id: 1019, date: daysAgo(32, 11, 0), category_id: 5, subcategory_id: 12, amount: 15000, payment_method: 'Savings Account', account_id: 1, credit_card_id: null, cc_payment_type: null, notes: 'Room rent' },
    { id: 1020, date: daysAgo(33, 12, 0), category_id: 6, subcategory_id: 16, amount: 3200, payment_method: 'UPI', account_id: 1, credit_card_id: null, cc_payment_type: null, notes: 'Monthly groceries — D-Mart' },
    { id: 1021, date: daysAgo(35, 14, 0), category_id: 1, subcategory_id: 1, amount: 950, payment_method: 'Credit Card', account_id: null, credit_card_id: 1, cc_payment_type: null, notes: 'Birthday dinner treat' },
    { id: 1022, date: daysAgo(38, 10, 0), category_id: 5, subcategory_id: 13, amount: 1100, payment_method: 'UPI', account_id: 1, credit_card_id: null, cc_payment_type: null, notes: 'Electricity bill — prev month' },
    { id: 1023, date: daysAgo(40, 16, 0), category_id: 3, subcategory_id: 8, amount: 4500, payment_method: 'Credit Card', account_id: null, credit_card_id: 2, cc_payment_type: null, notes: 'boAt earbuds — Amazon' },
    { id: 1024, date: daysAgo(42, 9, 0), category_id: 9, subcategory_id: null, amount: 12500, payment_method: 'Savings Account', account_id: 1, credit_card_id: 1, cc_payment_type: 'Full Payment', notes: 'HDFC Millennia CC bill payment' },
    { id: 1025, date: daysAgo(45, 12, 0), category_id: 2, subcategory_id: 4, amount: 340, payment_method: 'UPI', account_id: 1, credit_card_id: null, cc_payment_type: null, notes: 'Ola to airport' },
  ];
}

// ── Income (generated with fresh dates) ────────────────────────
export function getDefaultIncome() {
  return [
    { id: 2001, date: dateOnly(1), source: 'Salary', amount: 65000, account_id: 1, notes: 'Monthly salary credited' },
    { id: 2002, date: dateOnly(12), source: 'Freelance', amount: 12000, account_id: 1, notes: 'Logo design project — client' },
    { id: 2003, date: dateOnly(18), source: 'Interest', amount: 350, account_id: 1, notes: 'FD quarterly interest' },
    // Previous month
    { id: 2004, date: dateOnly(32), source: 'Salary', amount: 65000, account_id: 1, notes: 'Monthly salary' },
    { id: 2005, date: dateOnly(48), source: 'Freelance', amount: 8000, account_id: 1, notes: 'Website maintenance contract' },
  ];
}
