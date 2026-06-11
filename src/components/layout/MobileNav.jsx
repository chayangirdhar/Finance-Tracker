import { NavLink } from 'react-router-dom';
import { Receipt, Wallet, BarChart3, PieChart } from 'lucide-react';

const navItems = [
  { to: '/', icon: Receipt, label: 'Expenses' },
  { to: '/income', icon: Wallet, label: 'Income' },
  { to: '/health', icon: BarChart3, label: 'Health' },
  { to: '/analytics', icon: PieChart, label: 'Analytics' },
];

export default function MobileNav() {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 h-16 z-40 flex items-center justify-around border-t border-white/[0.06] px-2 shadow-lg"
      style={{
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
      }}
    >
      {navItems.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-semibold transition-colors duration-200 ${
              isActive ? 'text-accent-400' : 'text-surface-500 hover:text-surface-300'
            }`
          }
        >
          <Icon size={20} className="mb-0.5" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
