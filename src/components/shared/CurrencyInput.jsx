import { useState, useEffect } from 'react';

export default function CurrencyInput({ value, onChange, placeholder = '0.00', className = '', ...props }) {
  const [displayValue, setDisplayValue] = useState(value ? String(value) : '');

  useEffect(() => {
    const numericDisplay = parseFloat(displayValue) || 0;
    if (value !== numericDisplay) {
      setDisplayValue(value ? String(value) : '');
    }
  }, [value]);


  const handleChange = (e) => {
    const raw = e.target.value.replace(/[^0-9.]/g, '');

    // Prevent multiple decimal points
    const parts = raw.split('.');
    let sanitized = parts[0];
    if (parts.length > 1) {
      sanitized += '.' + parts[1].slice(0, 2);
    }

    setDisplayValue(sanitized);
    const num = parseFloat(sanitized);
    onChange(isNaN(num) ? 0 : Math.round(num * 100) / 100);
  };

  const handleBlur = () => {
    if (displayValue) {
      const num = parseFloat(displayValue);
      if (!isNaN(num)) {
        setDisplayValue(num.toFixed(2));
      }
    }
  };

  return (
    <div className="relative">
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-400 text-sm font-medium">₹</span>
      <input
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={`input-glass !pl-8 ${className}`}
        {...props}
      />
    </div>
  );
}
