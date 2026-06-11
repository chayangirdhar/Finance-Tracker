import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [creditCards, setCreditCards] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch all reference data on mount (with timeout)
  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);

      const url = import.meta.env.VITE_SUPABASE_URL;
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!url || url.includes('placeholder') || !key || key.includes('placeholder')) {
        throw new Error('missing_config');
      }

      // Timeout after 15s if Supabase is unreachable (e.g. database sleeping)
      const timeout = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));

      const results = await Promise.race([
        Promise.all([
          supabase.from('categories').select('*').order('id'),
          supabase.from('subcategories').select('*').order('id'),
          supabase.from('accounts').select('*').order('id'),
          supabase.from('credit_cards').select('*').order('id'),
        ]),
        timeout(15000),
      ]);

      const [catRes, subRes, accRes, ccRes] = results;

      if (catRes.error) throw catRes.error;
      if (subRes.error) throw subRes.error;
      if (accRes.error) throw accRes.error;
      if (ccRes.error) throw ccRes.error;

      setCategories(catRes.data || []);
      setSubcategories(subRes.data || []);
      setAccounts(accRes.data || []);
      setCreditCards(ccRes.data || []);
    } catch (err) {
      console.error('Failed to load reference data:', err);
      if (err.message === 'missing_config') {
        toast.error('Supabase credentials missing or invalid in your .env file!');
      } else if (err.message === 'timeout') {
        toast.error('Connection timed out. If using a free Supabase tier, it may be waking up. Try refreshing the page.');
      } else {
        toast.error(`Database error: ${err.message || 'Check your connection & .env configuration'}`);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Get subcategories for a given category ID
  const getSubcategoriesForCategory = useCallback(
    (categoryId) => {
      if (!categoryId) return [];
      return subcategories.filter((s) => s.category_id === categoryId);
    },
    [subcategories]
  );

  // Find category by name
  const getCategoryByName = useCallback(
    (name) => categories.find((c) => c.name === name),
    [categories]
  );

  // Refresh helpers
  const refreshAccounts = useCallback(async () => {
    const { data, error } = await supabase.from('accounts').select('*').order('id');
    if (!error) setAccounts(data || []);
  }, []);

  const refreshCreditCards = useCallback(async () => {
    const { data, error } = await supabase.from('credit_cards').select('*').order('id');
    if (!error) setCreditCards(data || []);
  }, []);

  const refreshCategories = useCallback(async () => {
    const [catRes, subRes] = await Promise.all([
      supabase.from('categories').select('*').order('id'),
      supabase.from('subcategories').select('*').order('id'),
    ]);
    if (!catRes.error) setCategories(catRes.data || []);
    if (!subRes.error) setSubcategories(subRes.data || []);
  }, []);

  const value = {
    categories,
    subcategories,
    accounts,
    creditCards,
    loading,
    getSubcategoriesForCategory,
    getCategoryByName,
    refreshAccounts,
    refreshCreditCards,
    refreshCategories,
    refreshAll: fetchAll,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
