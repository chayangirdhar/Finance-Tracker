import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

export default function AccountForm({ account, onSaved }) {
  const [name, setName] = useState(account?.name || '');
  const [type, setType] = useState(account?.type || 'Bank');
  const [openingBalance, setOpeningBalance] = useState(account?.opening_balance || '');
  const [isSalaryDefault, setIsSalaryDefault] = useState(account?.is_salary_default || false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Account name is required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        type,
        opening_balance: parseFloat(openingBalance) || 0,
        is_salary_default: isSalaryDefault,
      };

      if (account?.id) {
        if (isSalaryDefault) {
          await supabase.from('accounts').update({ is_salary_default: false }).neq('id', account.id);
        }
        const { error } = await supabase.from('accounts').update(payload).eq('id', account.id);
        if (error) throw error;
        toast.success('Account updated');
      } else {
        const { data, error } = await supabase.from('accounts').insert(payload).select().single();
        if (error) throw error;
        if (isSalaryDefault && data?.id) {
          await supabase.from('accounts').update({ is_salary_default: false }).neq('id', data.id);
        }
        toast.success('Account added');
      }
      onSaved();
    } catch (err) {
      toast.error(err.message || 'Failed to save account');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="label">Account Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input-glass"
          placeholder="e.g., HDFC Savings"
        />
      </div>
      <div>
        <label className="label">Type</label>
        <select value={type} onChange={(e) => setType(e.target.value)} className="input-glass">
          <option value="Bank">Bank</option>
          <option value="Wallet">Wallet</option>
          <option value="Cash">Cash</option>
        </select>
      </div>
      <div>
        <label className="label">Opening Balance (₹)</label>
        <input
          type="number"
          step="0.01"
          value={openingBalance}
          onChange={(e) => setOpeningBalance(e.target.value)}
          className="input-glass"
          placeholder="0.00"
        />
      </div>
      <div className="flex items-center justify-between p-3 rounded-xl border border-white/[0.08] bg-white/[0.03]">
        <div>
          <label className="text-sm font-medium text-white block">Default for Salary Credits</label>
          <span className="text-[10px] text-surface-500">Automatically select this account for salary credits</span>
        </div>
        <button
          type="button"
          onClick={() => setIsSalaryDefault(!isSalaryDefault)}
          className={`w-9 h-5 rounded-full relative transition-colors duration-200 ${isSalaryDefault ? 'bg-income-400' : 'bg-surface-700'}`}
        >
          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${isSalaryDefault ? 'translate-x-4' : 'translate-x-0.5'}`} />
        </button>
      </div>
      <button type="submit" disabled={saving} className="btn-primary w-full">
        {saving ? 'Saving...' : account ? 'Update Account' : 'Add Account'}
      </button>
    </form>
  );
}
