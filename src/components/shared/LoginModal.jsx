import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Modal from './Modal';
import { Lock, Loader2 } from 'lucide-react';

export default function LoginModal({ isOpen, onClose }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      setEmail('');
      setPassword('');
      onClose();
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Owner Login" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Icon */}
        <div className="flex justify-center mb-2">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--gradient-accent)' }}
          >
            <Lock size={20} className="text-white" />
          </div>
        </div>

        <p className="text-center text-xs text-surface-500 mb-4">
          This is a personal finance tracker. Sign in to access your data.
        </p>

        {/* Error */}
        {error && (
          <div className="p-3 rounded-xl bg-expense/10 border border-expense-500/20 text-expense-400 text-xs text-center">
            {error}
          </div>
        )}

        {/* Email */}
        <div>
          <label className="label">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-glass"
            placeholder="your@email.com"
            required
            autoComplete="email"
          />
        </div>

        {/* Password */}
        <div>
          <label className="label">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-glass"
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />
        </div>

        {/* Submit */}
        <button type="submit" disabled={loading} className="btn-primary w-full !py-3">
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" />
              Signing in…
            </span>
          ) : (
            'Sign In'
          )}
        </button>
      </form>
    </Modal>
  );
}
