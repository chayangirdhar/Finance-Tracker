import { NavLink, useLocation } from 'react-router-dom';
import {
  Receipt,
  Wallet,
  BarChart3,
  PieChart,
  ChevronLeft,
  ChevronRight,
  IndianRupee,
  Lock,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import LoginModal from '../shared/LoginModal';

const navItems = [
  { to: '/', icon: Receipt, label: 'Expenses', description: 'Daily Logger' },
  { to: '/income', icon: Wallet, label: 'Income', description: 'Track Earnings' },
  { to: '/health', icon: BarChart3, label: 'Health', description: 'Live Balances' },
  { to: '/analytics', icon: PieChart, label: 'Analytics', description: 'Charts & Ledger' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const { isAuthenticated, signOut } = useAuth();
  const location = useLocation();

  return (
    <aside
      className={`hidden md:flex fixed top-0 left-0 h-screen z-40 flex-col transition-all duration-300 ease-out ${
        collapsed ? 'w-[72px]' : 'w-[260px]'
      }`}
      style={{
        background: 'rgba(15, 23, 42, 0.85)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(24px)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-white/[0.06]">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--gradient-accent)' }}
        >
          <IndianRupee size={18} className="text-white" />
        </div>
        {!collapsed && (
          <div className="animate-fade-in">
            <h1 className="text-sm font-bold text-white tracking-tight">Expense Tracker</h1>
            <p className="text-[10px] text-surface-400 font-medium">Personal Finance</p>
          </div>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map(({ to, icon: Icon, label, description }) => {
          const isActive = location.pathname === to;
          return (
            <NavLink
              key={to}
              to={to}
              className={`group flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 relative ${
                isActive
                  ? 'text-white'
                  : 'text-surface-400 hover:text-surface-200 hover:bg-white/[0.04]'
              }`}
            >
              {/* Active indicator bar */}
              {isActive && (
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-7 rounded-r-full"
                  style={{ background: 'var(--gradient-accent)' }}
                />
              )}

              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                  isActive
                    ? 'bg-accent/20 shadow-glow-accent'
                    : 'bg-white/[0.04] group-hover:bg-white/[0.08]'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-accent-400' : ''} />
              </div>

              {!collapsed && (
                <div className="animate-fade-in overflow-hidden">
                  <p className="text-sm font-semibold leading-tight">{label}</p>
                  <p className="text-[10px] text-surface-500 font-medium">{description}</p>
                </div>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Auth Section */}
      <div className="px-3 py-2 border-t border-white/[0.06]">
        {isAuthenticated ? (
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="w-2 h-2 rounded-full bg-income-400 flex-shrink-0 animate-pulse" />
            {!collapsed && (
              <div className="flex-1 flex items-center justify-between animate-fade-in">
                <span className="text-[10px] text-surface-500 font-medium">Connected</span>
                <button
                  onClick={signOut}
                  className="text-[10px] text-surface-600 hover:text-surface-400 transition-colors"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => setShowLogin(true)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-surface-500 hover:text-surface-300 hover:bg-white/[0.04] transition-all"
          >
            <Lock size={14} />
            {!collapsed && (
              <span className="text-[10px] font-medium animate-fade-in">Owner Login</span>
            )}
          </button>
        )}
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center h-12 border-t border-white/[0.06] text-surface-500 hover:text-surface-300 transition-colors"
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      {/* Login Modal */}
      <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />
    </aside>
  );
}
