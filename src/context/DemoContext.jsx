import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { AppContext } from './AppContext';
import {
  DEMO_CATEGORIES,
  DEMO_SUBCATEGORIES,
  DEMO_ACCOUNTS,
  DEMO_CREDIT_CARDS,
  getDefaultTransactions,
  getDefaultIncome,
} from '../data/demoData';

const DemoDataContext = createContext(null);

// ── SessionStorage-backed state hook ─────────────────────────
function useSessionState(key, defaultValue) {
  const [state, setState] = useState(() => {
    try {
      const stored = sessionStorage.getItem(key);
      if (stored) return JSON.parse(stored);
    } catch {
      // sessionStorage unavailable or invalid JSON
    }
    return typeof defaultValue === 'function' ? defaultValue() : defaultValue;
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(key, JSON.stringify(state));
    } catch {
      // silently ignore
    }
  }, [key, state]);

  return [state, setState];
}

// ── DemoProvider ─────────────────────────────────────────────
export function DemoProvider({ children }) {
  const [transactions, setTransactions] = useSessionState('demo_txns', getDefaultTransactions);
  const [income, setIncome] = useSessionState('demo_income', getDefaultIncome);

  // Static reference data
  const categories = DEMO_CATEGORIES;
  const subcategories = DEMO_SUBCATEGORIES;
  const accounts = DEMO_ACCOUNTS;
  const [creditCards, setCreditCards] = useSessionState('demo_credit_cards', DEMO_CREDIT_CARDS);

  const getSubcategoriesForCategory = useCallback(
    (categoryId) => {
      if (!categoryId) return [];
      return subcategories.filter((s) => s.category_id === categoryId);
    },
    [subcategories]
  );

  const getCategoryByName = useCallback(
    (name) => categories.find((c) => c.name === name),
    [categories]
  );

  const noop = useCallback(async () => {}, []);

  const updateCreditCard = useCallback(async (id, updates) => {
    setCreditCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  }, [setCreditCards]);

  // Provide the same shape that AppContext.Provider expects
  const appValue = useMemo(
    () => ({
      categories,
      subcategories,
      accounts,
      creditCards,
      loading: false,
      getSubcategoriesForCategory,
      getCategoryByName,
      refreshAccounts: noop,
      refreshCreditCards: noop,
      updateCreditCard,
      refreshCategories: noop,
      refreshAll: noop,
    }),
    [getSubcategoriesForCategory, getCategoryByName, noop, creditCards, updateCreditCard]
  );

  // ── Demo CRUD ──────────────────────────────────────────────
  const addTransaction = useCallback((payload) => {
    const newTxn = { id: Date.now(), ...payload };
    setTransactions((prev) => [newTxn, ...prev]);
    return newTxn;
  }, [setTransactions]);

  const deleteTransaction = useCallback(
    (id) => setTransactions((prev) => prev.filter((t) => t.id !== id)),
    [setTransactions]
  );

  const addIncome = useCallback((payload) => {
    const newEntry = { id: Date.now(), ...payload };
    setIncome((prev) => [newEntry, ...prev]);
    return newEntry;
  }, [setIncome]);

  const deleteIncome = useCallback(
    (id) => setIncome((prev) => prev.filter((i) => i.id !== id)),
    [setIncome]
  );

  const demoValue = useMemo(
    () => ({
      transactions,
      income,
      addTransaction,
      deleteTransaction,
      addIncome,
      deleteIncome,
    }),
    [transactions, income, addTransaction, deleteTransaction, addIncome, deleteIncome]
  );

  return (
    <AppContext.Provider value={appValue}>
      <DemoDataContext.Provider value={demoValue}>{children}</DemoDataContext.Provider>
    </AppContext.Provider>
  );
}

/**
 * Returns demo data context when in demo mode, or null when authenticated.
 * Safe to call unconditionally — returns null when no DemoDataContext provider is present.
 */
export function useDemoData() {
  return useContext(DemoDataContext);
}
