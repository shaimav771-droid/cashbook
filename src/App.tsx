import React, { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import CashBooks from './pages/CashBooks';
import Transactions from './pages/Transactions';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useAuthStore } from '@/features/auth/store/authStore';
import { supabase } from '@/db';

function AppContent() {
  const { currentTab, currentBook } = useApp();

  const renderTabContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return currentBook ? <Dashboard /> : <CashBooks />;
      case 'cashbooks':
        return <CashBooks />;
      case 'transactions':
        return <Transactions />;
      case 'reports':
        return <Reports />;
      case 'settings':
        return <Settings />;
      default:
        return currentBook ? <Dashboard /> : <CashBooks />;
    }
  };

  return <Layout>{renderTabContent()}</Layout>;
}

export default function App() {
  const { checkSession } = useAuth();

  useEffect(() => {
    // 1. Initial session check
    checkSession();

    // 2. Setup auth state change listener to synchronize Supabase auth events
    let subscription: { unsubscribe: () => void } | null = null;
    
    if (supabase) {
      const client = supabase;
      const { data } = client.auth.onAuthStateChange((_event: any, session: any) => {
        if (session?.user) {
          // Prevent unverified users from logging in until their email is confirmed
          if (session.user.email && !session.user.email_confirmed_at) {
            useAuthStore.getState().setUser(null);
            client.auth.signOut();
            useAuthStore.getState().setLoading(false);
            return;
          }

          useAuthStore.getState().setUser({
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || ''
          });
        } else {
          useAuthStore.getState().setUser(null);
        }
        useAuthStore.getState().setLoading(false);
      });
      subscription = data.subscription;
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [checkSession]);

  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
