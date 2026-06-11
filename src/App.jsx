import { HashRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AppProvider, useApp } from './context/AppContext';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import ExpenseLogger from './pages/ExpenseLogger';
import IncomeLogger from './pages/IncomeLogger';
import FinancialHealth from './pages/FinancialHealth';
import Analytics from './pages/Analytics';
import { Loader2 } from 'lucide-react';

function AppLayout() {
  const { loading } = useApp();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center animate-pulse">
          <Loader2 size={32} className="text-accent-400 mx-auto mb-4 animate-spin" />
          <p className="text-sm text-surface-400 font-medium">Loading your finances...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      {/* Main content area — with sidebar offset */}
      <div className="flex-1 ml-[72px] lg:ml-[260px] transition-all duration-300">
        <TopBar />
        <main className="p-6">
          <Routes>
            <Route path="/" element={<ExpenseLogger />} />
            <Route path="/income" element={<IncomeLogger />} />
            <Route path="/health" element={<FinancialHealth />} />
            <Route path="/analytics" element={<Analytics />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AppProvider>
        <AppLayout />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#1e293b',
              color: '#e2e8f0',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              fontSize: '13px',
              fontFamily: 'Inter, sans-serif',
            },
            success: {
              iconTheme: {
                primary: '#34d399',
                secondary: '#1e293b',
              },
            },
            error: {
              iconTheme: {
                primary: '#fb7185',
                secondary: '#1e293b',
              },
            },
          }}
        />
      </AppProvider>
    </HashRouter>
  );
}
