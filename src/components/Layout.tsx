import React from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { AuthPage } from '@/features/auth/components/AuthPage';
import Header from './Header';
import Sidebar from './Sidebar';
import { useApp } from '../context/AppContext';

interface LayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'cashbooks', label: 'Cash Books', icon: 'account_balance_wallet' },
  { id: 'transactions', label: 'Transactions', icon: 'receipt_long' },
  { id: 'settings', label: 'Settings', icon: 'settings' }
];

export default function Layout({ children }: LayoutProps) {
  const { user, loading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const { currentTab, setCurrentTab } = useApp();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <div className="font-title-md text-title-md text-primary font-semibold">Loading CashBook...</div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-background text-on-background flex flex-col font-body-md">
      <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
      <div className="flex flex-1 pt-[72px]">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <main className="flex-1 lg:pl-[240px] pl-0 pb-20 lg:pb-0 min-h-[calc(100vh-72px)] bg-background transition-all duration-300">
          <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      {/* Fixed Bottom Navigation Bar for Mobile */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t pb-safe h-16 flex justify-around items-center px-4 shadow-lg">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-all ${
                isActive ? 'text-primary' : 'text-on-surface-variant opacity-70'
              }`}
            >
              <span className="material-symbols-outlined text-[22px] mb-0.5">
                {item.icon}
              </span>
              <span className="text-[10px] font-semibold tracking-wide">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
