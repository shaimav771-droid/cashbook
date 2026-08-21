import React from 'react';
import { useApp } from '../context/AppContext';

export default function Sidebar({ isOpen, onClose }) {
  const { currentTab, setCurrentTab, currentBook } = useApp();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'cashbooks', label: 'Cash Books', icon: 'account_balance_wallet' },
    { id: 'transactions', label: 'Transactions', icon: 'receipt_long' },
    { id: 'settings', label: 'Settings', icon: 'settings' }
  ];

  return (
    <>
      {/* Backdrop overlay for mobile drawer */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 top-[72px] bg-black/40 z-30 lg:hidden transition-opacity duration-300"
        />
      )}

      <aside className={`fixed left-0 top-[72px] h-[calc(100vh-72px)] w-[240px] bg-surface-container-lowest border-r border-outline-variant flex flex-col z-40 shadow-sm transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <nav className="flex-1 py-6 px-4 overflow-y-auto">
          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive = currentTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentTab(item.id);
                    if (onClose) onClose(); // Close mobile drawer on selection
                  }}
                  className={`w-full flex items-center px-4 py-3 transition-all gap-3 rounded-full text-left font-semibold ${
                    isActive
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined">{item.icon}</span>
                  <span className="font-body-md text-body-md">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
        {currentBook && (
          <div className="p-4 border-t border-outline-variant bg-surface-container-lowest flex flex-col gap-1.5">
            <div className="font-label-caps text-[10px] text-on-surface-variant uppercase select-none">Active Book Currency</div>
            <div className="font-title-md text-body-md font-bold text-primary flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">monetization_on</span>
              {currentBook.currency === 'INR' ? 'Indian Rupee (₹)' : currentBook.currency === 'USD' ? 'US Dollar ($)' : currentBook.currency}
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
