import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

export default function CreditCardForm({ card, onSaved }) {
  const [name, setName] = useState(card?.name || '');
  const [creditLimit, setCreditLimit] = useState(card?.credit_limit || '');
  const [openingDues, setOpeningDues] = useState(card?.opening_dues || '');
  const [dueDay, setDueDay] = useState(card?.due_day || 20);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Card name is required');
      return;
    }
    if (!creditLimit || parseFloat(creditLimit) <= 0) {
      toast.error('Credit limit is required');
      return;
    }
    const dayNum = parseInt(dueDay);
    if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
      toast.error('Due day must be between 1 and 31');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        credit_limit: parseFloat(creditLimit),
        opening_dues: parseFloat(openingDues) || 0,
        due_day: dayNum,
      };

      if (card?.id) {
        const { error } = await supabase.from('credit_cards').update(payload).eq('id', card.id);
        if (error) throw error;
        toast.success('Card updated');
      } else {
        const { error } = await supabase.from('credit_cards').insert(payload);
        if (error) throw error;
        toast.success('Card added');
      }
      onSaved();
    } catch (err) {
      toast.error(err.message || 'Failed to save card');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="label">Card Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input-glass"
          placeholder="e.g., SBI SimplyCLICK"
        />
      </div>
      <div>
        <label className="label">Credit Limit (₹)</label>
        <input
          type="number"
          step="0.01"
          value={creditLimit}
          onChange={(e) => setCreditLimit(e.target.value)}
          className="input-glass"
          placeholder="e.g., 200000"
        />
      </div>
      <div>
        <label className="label">Opening Dues (₹)</label>
        <input
          type="number"
          step="0.01"
          value={openingDues}
          onChange={(e) => setOpeningDues(e.target.value)}
          className="input-glass"
          placeholder="0.00"
        />
      </div>
      <div>
        <label className="label">Due Day of Month</label>
        <input
          type="number"
          min="1"
          max="31"
          value={dueDay}
          onChange={(e) => setDueDay(e.target.value)}
          className="input-glass"
          placeholder="20"
        />
      </div>
      <button type="submit" disabled={saving} className="btn-primary w-full">
        {saving ? 'Saving...' : card ? 'Update Card' : 'Add Card'}
      </button>
    </form>
  );
}
