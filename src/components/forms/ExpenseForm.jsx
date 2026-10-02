import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useDemoData } from '../../context/DemoContext';
import CurrencyInput from '../shared/CurrencyInput';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { CreditCard, ArrowRightLeft, Pencil, Plus, X, RotateCcw } from 'lucide-react';

const toLocalISOString = (localDateTimeStr) => {
  if (!localDateTimeStr) return null;
  const d = new Date(localDateTimeStr);
  const offsetMinutes = -d.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const pad = (num) => String(Math.floor(Math.abs(num))).padStart(2, '0');
  const offsetHours = pad(offsetMinutes / 60);
  const offsetMin = pad(offsetMinutes % 60);
  return `${localDateTimeStr}:00${sign}${offsetHours}:${offsetMin}`;
};

export default function ExpenseForm({ onSaved, editingTransaction, onCancelEdit, prefill }) {
  const { categories, accounts, creditCards, getSubcategoriesForCategory, getCategoryByName } = useApp();
  const { isAuthenticated } = useAuth();
  const demoData = useDemoData();

  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [amount, setAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Salary Account');
  const [creditCardId, setCreditCardId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [ccPaymentType, setCcPaymentType] = useState('');
  const [notes, setNotes] = useState('');
  const [isCCPayment, setIsCCPayment] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingsTargetId, setSavingsTargetId] = useState('');

  // Get current category object
  const selectedCategory = categories.find((c) => c.id === Number(categoryId));
  const isAddedToSavings = selectedCategory?.name === 'Added to Savings';
  const isCreditCardPaymentCategory = selectedCategory?.name === 'Credit Card Payment';
  const showCCField = paymentMethod === 'Credit Card';

  // Get filtered subcategories
  const filteredSubcategories = categoryId ? getSubcategoriesForCategory(Number(categoryId)) : [];

  // Reset subcategory only if current subcategory is not valid for category
  useEffect(() => {
    if (subcategoryId) {
      const valid = getSubcategoriesForCategory(Number(categoryId)).some(
        (s) => s.id === Number(subcategoryId)
      );
      if (!valid) {
        setSubcategoryId('');
      }
    }
  }, [categoryId, getSubcategoriesForCategory, subcategoryId]);

  // Sync state when editing a transaction
  useEffect(() => {
    if (editingTransaction) {
      if (editingTransaction.date) {
        try {
          setDate(format(new Date(editingTransaction.date), "yyyy-MM-dd'T'HH:mm"));
        } catch {
          setDate(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
        }
      }
      setCategoryId(String(editingTransaction.category_id || ''));
      setSubcategoryId(editingTransaction.subcategory_id ? String(editingTransaction.subcategory_id) : '');
      setAmount(Number(editingTransaction.amount) || 0);
      setPaymentMethod(editingTransaction.payment_method || 'Salary Account');
      setCreditCardId(editingTransaction.credit_card_id ? String(editingTransaction.credit_card_id) : '');
      setAccountId(editingTransaction.account_id ? String(editingTransaction.account_id) : '');
      setCcPaymentType(editingTransaction.cc_payment_type || '');

      const rawNotes = editingTransaction.notes || '';
      const savingsMatch = rawNotes.match(/\[savings_to:([^\]]+)\]/);
      if (savingsMatch) {
        setSavingsTargetId(savingsMatch[1]);
        setNotes(rawNotes.replace(/\[savings_to:[^\]]+\]\s*—?\s*/, ''));
      } else {
        setSavingsTargetId('');
        setNotes(rawNotes);
      }
      setDescription('');
    }
  }, [editingTransaction]);

  // Sync state when prefilling from repeat button
  useEffect(() => {
    if (prefill) {
      setDate(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
      setCategoryId(String(prefill.category_id || ''));
      setSubcategoryId(prefill.subcategory_id ? String(prefill.subcategory_id) : '');
      setAmount(0);
      setPaymentMethod(prefill.payment_method || 'Salary Account');
      setCreditCardId(prefill.credit_card_id ? String(prefill.credit_card_id) : '');
      setAccountId(prefill.account_id ? String(prefill.account_id) : '');
      setCcPaymentType(prefill.cc_payment_type || '');

      const rawNotes = prefill.notes || '';
      const savingsMatch = rawNotes.match(/\[savings_to:([^\]]+)\]/);
      if (savingsMatch) {
        setSavingsTargetId(savingsMatch[1]);
        setNotes(rawNotes.replace(/\[savings_to:[^\]]+\]\s*—?\s*/, ''));
      } else {
        setSavingsTargetId('');
        setNotes(rawNotes);
      }
      setDescription('');
    }
  }, [prefill]);

  // CC Payment mode: adapt the form
  useEffect(() => {
    if (isCCPayment) {
      const ccPayCat = getCategoryByName('Credit Card Payment');
      if (ccPayCat) {
        setCategoryId(String(ccPayCat.id));
      }
      setPaymentMethod('Savings Account');
    }
  }, [isCCPayment, getCategoryByName]);

  // Auto-fill account when "Salary Account" is chosen
  useEffect(() => {
    if (paymentMethod === 'Salary Account') {
      const defaultAcc = accounts.find((acc) => acc.is_salary_default);
      if (defaultAcc) {
        setAccountId(String(defaultAcc.id));
      }
    }
  }, [paymentMethod, accounts]);

  const resetForm = () => {
    setDate(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
    setDescription('');
    setCategoryId('');
    setSubcategoryId('');
    setAmount(0);
    setPaymentMethod('Salary Account');
    setCreditCardId('');
    setCcPaymentType('');
    setNotes('');
    setIsCCPayment(false);
    setSavingsTargetId('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!categoryId) { toast.error('Select a category'); return; }
    if (!amount || amount <= 0) { toast.error('Enter a valid amount'); return; }
    if (!paymentMethod) { toast.error('Select a payment method'); return; }
    if (showCCField && !creditCardId) { toast.error('Select a credit card'); return; }
    if (paymentMethod !== 'Credit Card' && paymentMethod !== 'Cash' && !accountId) {
      toast.error('Select an account');
      return;
    }
    if (isAddedToSavings && !savingsTargetId) {
      toast.error('Select target savings account');
      return;
    }

    setSaving(true);
    try {
      const savingsPrefix = isAddedToSavings ? `[savings_to:${savingsTargetId}]` : '';
      const payload = {
        date: toLocalISOString(date),
        category_id: Number(categoryId),
        subcategory_id: subcategoryId ? Number(subcategoryId) : null,
        amount: Math.round(amount * 100) / 100,
        payment_method: paymentMethod,
        account_id: (paymentMethod === 'Credit Card' || paymentMethod === 'Cash') ? null : (accountId ? Number(accountId) : null),
        credit_card_id: creditCardId ? Number(creditCardId) : null,
        cc_payment_type: isCreditCardPaymentCategory ? ccPaymentType || null : null,
        notes: [savingsPrefix, description, notes].filter(Boolean).join(' — ') || null,
      };

      if (editingTransaction) {
        if (isAuthenticated) {
          const { error } = await supabase
            .from('transactions')
            .update(payload)
            .eq('id', editingTransaction.id);
          if (error) throw error;
        } else {
          demoData.updateTransaction(editingTransaction.id, payload);
        }
        toast.success('Transaction updated!');
        onCancelEdit?.();
      } else {
        if (isAuthenticated) {
          const { error } = await supabase.from('transactions').insert(payload);
          if (error) throw error;
        } else {
          demoData.addTransaction(payload);
        }
        toast.success('Transaction added!');
        resetForm();
      }
      onSaved?.();
    } catch (err) {
      toast.error(err.message || 'Failed to save transaction');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Editing Mode Indicator Banner */}
      {editingTransaction && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-accent-500/10 border border-accent-500/25 text-accent-300 text-xs font-semibold animate-fade-in">
          <div className="flex items-center gap-2">
            <Pencil size={14} className="text-accent-400" />
            <span>Editing Transaction #{editingTransaction.id}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              resetForm();
              onCancelEdit?.();
            }}
            className="text-surface-400 hover:text-white transition-colors p-1"
            title="Cancel editing"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* CC Payment Toggle */}
      <button
        type="button"
        onClick={() => setIsCCPayment(!isCCPayment)}
        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 text-sm font-medium ${isCCPayment
            ? 'border-accent-500/30 bg-accent-500/10 text-accent-300'
            : 'border-white/[0.08] bg-white/[0.03] text-surface-400 hover:bg-white/[0.05]'
          }`}
      >
        <ArrowRightLeft size={16} />
        Paying Credit Card Bill
        <div className={`ml-auto w-9 h-5 rounded-full relative transition-colors duration-200 ${isCCPayment ? 'bg-accent-500' : 'bg-surface-700'}`}>
          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${isCCPayment ? 'translate-x-4' : 'translate-x-0.5'}`} />
        </div>
      </button>

      {/* Row 1: Date + Amount */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Date & Time</label>
          <input
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input-glass"
          />
        </div>
        <div>
          <label className="label">Amount</label>
          <CurrencyInput value={amount} onChange={setAmount} />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="label">Description</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input-glass"
          placeholder="What did you spend on?"
        />
      </div>

      {/* Row 2: Category + Subcategory */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Category</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="input-glass"
            disabled={isCCPayment}
          >
            <option value="">Select category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">
            {isAddedToSavings ? 'Target Account' : 'Sub-category'}
          </label>
          {isAddedToSavings ? (
            <select
              value={savingsTargetId}
              onChange={(e) => setSavingsTargetId(e.target.value)}
              className="input-glass"
            >
              <option value="">Select account</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
          ) : isCreditCardPaymentCategory ? (
            <select
              value={ccPaymentType}
              onChange={(e) => setCcPaymentType(e.target.value)}
              className="input-glass"
            >
              <option value="">Payment type</option>
              <option value="Full Payment">Full Payment</option>
              <option value="Minimum Due">Minimum Due</option>
              <option value="Partial Payment">Partial Payment</option>
            </select>
          ) : (
            <select
              value={subcategoryId}
              onChange={(e) => setSubcategoryId(e.target.value)}
              className="input-glass"
            >
              <option value="">Select sub-category</option>
              {filteredSubcategories.map((sub) => (
                <option key={sub.id} value={sub.id}>{sub.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Row 3: Payment Method */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Payment Method</label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="input-glass"
            disabled={isCCPayment}
          >
            <option value="">Select method</option>
            <option value="Salary Account">Salary Account</option>
            <option value="Credit Card">Credit Card</option>
            <option value="Savings Account">Savings Account</option>
          </select>
        </div>

        {/* Conditional: CC Name or Account */}
        {showCCField ? (
          <div>
            <label className="label flex items-center gap-1.5">
              <CreditCard size={12} /> Credit Card
            </label>
            <select
              value={creditCardId}
              onChange={(e) => setCreditCardId(e.target.value)}
              className="input-glass"
            >
              <option value="">Select card</option>
              {creditCards.map((cc) => (
                <option key={cc.id} value={cc.id}>{cc.name}</option>
              ))}
            </select>
          </div>
        ) : paymentMethod && paymentMethod !== 'Cash' ? (
          <div>
            <label className="label">
              {isCCPayment ? 'Pay From Account' : 'Account'}
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className={`input-glass ${paymentMethod === 'Salary Account' ? 'opacity-60 cursor-not-allowed bg-white/[0.02]' : ''}`}
              disabled={paymentMethod === 'Salary Account'}
            >
              <option value="">Select account</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      {/* CC Payment: Target card */}
      {isCCPayment && (
        <div className="animate-slide-up">
          <label className="label flex items-center gap-1.5">
            <CreditCard size={12} /> Target Credit Card
          </label>
          <select
            value={creditCardId}
            onChange={(e) => setCreditCardId(e.target.value)}
            className="input-glass"
          >
            <option value="">Select card to pay</option>
            {creditCards.map((cc) => (
              <option key={cc.id} value={cc.id}>{cc.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="label">Notes (optional)</label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="input-glass"
          placeholder="Additional context..."
        />
      </div>

      {/* Submit Button & Cancel Action */}
      <div className="space-y-2">
        <button
          type="submit"
          disabled={saving}
          className={`w-full py-3.5 rounded-xl font-bold text-sm shadow-lg transition-all duration-200 flex items-center justify-center gap-2 ${
            editingTransaction
              ? 'bg-gradient-to-r from-accent-500 to-indigo-600 hover:from-accent-600 hover:to-indigo-700 text-white shadow-accent/25'
              : 'btn-primary'
          } disabled:opacity-50`}
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {editingTransaction ? 'Updating in Database...' : 'Saving...'}
            </span>
          ) : editingTransaction ? (
            <>
              <Pencil size={15} />
              Update Transaction
            </>
          ) : isCCPayment ? (
            'Log CC Payment'
          ) : (
            'Add Expense'
          )}
        </button>

        {editingTransaction && (
          <button
            type="button"
            onClick={() => {
              resetForm();
              onCancelEdit?.();
            }}
            className="w-full py-2.5 rounded-xl font-semibold text-xs text-surface-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] transition-colors flex items-center justify-center gap-1.5"
          >
            <X size={14} />
            Cancel Edit
          </button>
        )}
      </div>
    </form>
  );
}
