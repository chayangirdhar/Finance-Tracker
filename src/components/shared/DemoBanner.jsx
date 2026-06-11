import { useState } from 'react';
import { X, Sparkles } from 'lucide-react';

export default function DemoBanner() {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem('demo_banner_dismissed') === 'true';
    } catch {
      return false;
    }
  });

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem('demo_banner_dismissed', 'true');
    } catch {
      // sessionStorage may be unavailable in some contexts
    }
  };

  return (
    <div className="mx-6 mt-4 mb-0 p-3 rounded-xl border border-accent-500/20 bg-accent-500/5 flex items-center gap-3 animate-fade-in">
      <Sparkles size={16} className="text-accent-400 flex-shrink-0" />
      <p className="text-xs text-surface-300 flex-1">
        <span className="font-semibold text-accent-300">Demo Mode</span> — You're
        exploring with simulated data. Add expenses &amp; income to try it out!
        Changes persist until you close this tab.
      </p>
      <button
        onClick={handleDismiss}
        className="text-surface-500 hover:text-surface-300 transition-colors flex-shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  );
}
