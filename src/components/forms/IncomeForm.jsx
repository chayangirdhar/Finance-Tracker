import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useDemoData } from '../../context/DemoContext';
import CurrencyInput from '../shared/CurrencyInput';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const INCOME_SOURCES = ['Salary', 'Gig Work', 'Freelance', 'Bonus', 'Interest', 'Dividend', 'Refund', 'Other'];

export default function IncomeForm({ onSaved }) {
  const { accounts } = useApp();
  const { isAuthenticated } = useAuth();
  const demoData = useDemoData();

  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [source, setSource] = useState('');
  const [customSource, setCustomSource] = useState('');
  const [amount, setAmount] = useState(0);
  const [accountId, setAccountId] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setSource('');
    setCustomSource('');
    setAmount(0);
    setAccountId('');
    setNotes('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const finalSource = source === 'Other' ? customSource.trim() : source;
    if (!finalSource) { toast.error('Select an income source'); return; }
    if (!amount || amount <= 0) { toast.error('Enter a valid amount'); return; }

    setSaving(true);
    try {
      const payload = {
        date,
        source: finalSource,
        amount: Math.round(amount * 100) / 100,
        account_id: accountId ? Number(accountId) : null,
        notes: notes.trim() || null,
      };

      if (isAuthenticated) {
        const { error } = await supabase.from('income').insert(payload);
        if (error) throw error;
      } else {
        demoData.addIncome(payload);
      }

      toast.success('Income recorded!');
      resetForm();
      onSaved?.();
    } catch (err) {
      toast.error(err.message || 'Failed to save income');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Date + Amount */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Date</label>
          <input
            type="date"
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

      {/* Source */}
      <div>
        <label className="label">Income Source</label>
        <select value={source} onChange={(e) => setSource(e.target.value)} className="input-glass">
          <option value="">Select source</option>
          {INCOME_SOURCES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Custom source input */}
      {source === 'Other' && (
        <div className="animate-slide-up">
          <label className="label">Custom Source</label>
          <input
            type="text"
            value={customSource}
            onChange={(e) => setCustomSource(e.target.value)}
            className="input-glass"
            placeholder="Describe the income source..."
          />
        </div>
      )}

      {/* Destination Account */}
      <div>
        <label className="label">Deposit To Account</label>
        <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="input-glass">
          <option value="">Select account (optional)</option>
          {accounts.map((acc) => (
            <option key={acc.id} value={acc.id}>{acc.name} ({acc.type})</option>
          ))}
        </select>
      </div>

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

      {/* Submit */}
      <button type="submit" disabled={saving} className="btn-income w-full !py-3.5 !text-sm">
        {saving ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Saving...
          </span>
        ) : (
          'Record Income'
        )}
      </button>
    </form>
  );
}
