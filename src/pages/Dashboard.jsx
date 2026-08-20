import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { dbService } from '../db';
import Transactions from './Transactions';

export default function Dashboard() {
  const { currentBook, categories, setCurrentTab } = useApp();
  
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Dashboard period state
  const [period, setPeriod] = useState('30'); // 'all', 'today', '30', '90'
  const [periodLabel, setPeriodLabel] = useState('This Month');
  const [periodDropdownOpen, setPeriodDropdownOpen] = useState(false);

  // Stats values
  const [balance, setBalance] = useState(0);
  const [totalIn, setTotalIn] = useState(0);
  const [totalOut, setTotalOut] = useState(0);
  const [inCount, setInCount] = useState(0);
  const [outCount, setOutCount] = useState(0);
  
  // Charts calculations
  const [categorySpend, setCategorySpend] = useState([]);
  const [inPercentage, setInPercentage] = useState(0);
  const [outPercentage, setOutPercentage] = useState(0);

  const loadDashboardData = async () => {
    if (!currentBook) return;
    setLoading(true);
    try {
      // 1. Fetch ALL transactions to calculate the absolute Current Balance
      const allTxs = await dbService.transactions.getTransactions(currentBook.id);
      const absIn = allTxs.filter(t => t.type === 'In').reduce((sum, t) => sum + t.amount, 0);
      const absOut = allTxs.filter(t => t.type === 'Out').reduce((sum, t) => sum + t.amount, 0);
      setBalance(currentBook.openingBalance + absIn - absOut);

      // 2. Fetch PERIOD transactions to calculate dashboard metrics
      const today = new Date();
      let startDate = '';
      let endDate = today.toISOString().split('T')[0];

      if (period === 'today') {
        startDate = endDate;
      } else if (period === '30') {
        const d30 = new Date();
        d30.setDate(today.getDate() - 30);
        startDate = d30.toISOString().split('T')[0];
      } else if (period === '90') {
        const d90 = new Date();
        d90.setDate(today.getDate() - 90);
        startDate = d90.toISOString().split('T')[0];
      } else {
        endDate = ''; // All time
      }

      const periodTxs = await dbService.transactions.getTransactions(currentBook.id, { startDate, endDate });
      setTxs(periodTxs);

      const periodInTxs = periodTxs.filter(t => t.type === 'In');
      const periodOutTxs = periodTxs.filter(t => t.type === 'Out');

      const sumIn = periodInTxs.reduce((sum, t) => sum + t.amount, 0);
      const sumOut = periodOutTxs.reduce((sum, t) => sum + t.amount, 0);

      setTotalIn(sumIn);
      setTotalOut(sumOut);
      setInCount(periodInTxs.length);
      setOutCount(periodOutTxs.length);

      // 3. Ratio calculations for breakdown chart
      const totalFlow = sumIn + sumOut;
      if (totalFlow > 0) {
        setInPercentage(Math.round((sumIn / totalFlow) * 100));
        setOutPercentage(Math.round((sumOut / totalFlow) * 100));
      } else {
        setInPercentage(50);
        setOutPercentage(50);
      }

      // 4. Calculate category-wise breakdown (Outflow only)
      const catMap = {};
      categories.forEach(c => { catMap[c.id] = { name: c.name, amount: 0 }; });

      periodOutTxs.forEach(t => {
        if (catMap[t.categoryId]) {
          catMap[t.categoryId].amount += t.amount;
        } else {
          catMap[t.categoryId] = { name: 'Uncategorized', amount: t.amount };
        }
      });

      const spendList = Object.values(catMap)
        .filter(c => c.amount > 0)
        .sort((a, b) => b.amount - a.amount);
      
      setCategorySpend(spendList);

    } catch (err) {
      console.error("Error loading dashboard metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [currentBook, period, categories]);

  const getCurrencySymbol = (curr) => {
    return curr === 'INR' ? '₹' : curr === 'USD' ? '$' : curr === 'EUR' ? '€' : '£';
  };

  const getCategoryName = (catId) => {
    const match = categories.find(c => c.id === catId);
    return match ? match.name : "Uncategorized";
  };

  const handlePeriodChange = (val, label) => {
    setPeriod(val);
    setPeriodLabel(label);
    setPeriodDropdownOpen(false);
  };

  const symbol = getCurrencySymbol(currentBook?.currency || 'INR');

  return (
    <div className="flex flex-col w-full gap-8">
      {/* Dashboard Heading & Period Selector */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="font-headline-lg text-headline-lg text-on-background select-none">Dashboard</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">Overview of your cashbook statements.</p>
        </div>

        {/* Period dropdown selector */}
        <div className="relative">
          <button 
            onClick={() => setPeriodDropdownOpen(!periodDropdownOpen)}
            className="flex items-center gap-1.5 px-4 py-2 bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-sm text-xs font-semibold hover:shadow-md transition-all"
          >
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">calendar_today</span>
            <span>{periodLabel}</span>
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">arrow_drop_down</span>
          </button>

          {periodDropdownOpen && (
            <div className="absolute right-0 mt-2 w-44 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl z-50 py-1 text-xs">
              <button onClick={() => handlePeriodChange('30', 'This Month')} className="w-full text-left px-4 py-2 hover:bg-surface-container-low">This Month</button>
              <button onClick={() => handlePeriodChange('90', 'Last 30 Days')} className="w-full text-left px-4 py-2 hover:bg-surface-container-low">Last 30 Days</button>
              <button onClick={() => handlePeriodChange('today', 'Today')} className="w-full text-left px-4 py-2 hover:bg-surface-container-low">Today</button>
              <button onClick={() => handlePeriodChange('all', 'All Time')} className="w-full text-left px-4 py-2 hover:bg-surface-container-low">All Time</button>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="min-h-[400px] flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <div className="text-xs text-on-surface-variant">Calculating ledger balance...</div>
        </div>
      ) : (
        <>
          {/* Large Current Balance Card */}
          <div className="bg-gradient-to-br from-[#00652c] via-[#005c28] to-[#004d21] text-white border border-[#004f22] rounded-2xl p-8 shadow-sm flex flex-col gap-3 relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="absolute -right-6 -top-6 w-36 h-36 bg-white/5 rounded-full blur-xl group-hover:bg-white/10 transition-colors"></div>
            <div className="absolute -left-6 -bottom-6 w-24 h-24 bg-white/5 rounded-full blur-lg"></div>
            
            <div className="flex items-center justify-between gap-4 z-10">
              <div className="flex items-center gap-2.5 opacity-90 text-xs font-semibold uppercase tracking-wider">
                <span className="material-symbols-outlined text-[20px] bg-white/10 p-2 rounded-xl">account_balance_wallet</span>
                <span>Current Balance</span>
              </div>
              <button 
                onClick={() => setCurrentTab('reports')}
                className="flex items-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-xs font-bold transition-all select-none"
              >
                <span className="material-symbols-outlined text-[16px]">analytics</span>
                <span>View Report</span>
              </button>
            </div>
            
            <div className="font-display-lg text-4xl md:text-5xl tracking-tight font-extrabold mt-2 z-10">
              {balance < 0 ? '-' : ''}{symbol}{Math.abs(balance).toLocaleString()}
            </div>
            
            <div className="text-[11px] opacity-80 font-medium flex items-center gap-1.5 mt-1 z-10">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
              Calculated from inception ledger
            </div>
          </div>

          {/* Three Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Cash In Card */}
            <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 shadow-sm flex flex-col gap-3 relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 text-on-surface-variant text-xs font-semibold">
                <span className="material-symbols-outlined text-[18px] text-[#2E7D32] bg-[#2E7D32]/10 p-1.5 rounded-lg">arrow_downward</span>
                <span>Total Cash In</span>
              </div>
              <div className="font-display-lg text-2xl md:text-3xl text-on-surface tracking-tight font-bold">
                {symbol}{totalIn.toLocaleString()}
              </div>
              <div className="text-[11px] text-on-surface-variant font-medium">
                {inCount} Inflows recorded this period
              </div>
            </div>

            {/* Total Cash Out Card */}
            <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 shadow-sm flex flex-col gap-3 relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 text-on-surface-variant text-xs font-semibold">
                <span className="material-symbols-outlined text-[18px] text-[#C62828] bg-[#C62828]/10 p-1.5 rounded-lg">arrow_upward</span>
                <span>Total Cash Out</span>
              </div>
              <div className="font-display-lg text-2xl md:text-3xl text-on-surface tracking-tight font-bold">
                {symbol}{totalOut.toLocaleString()}
              </div>
              <div className="text-[11px] text-on-surface-variant font-medium">
                {outCount} Outflows recorded this period
              </div>
            </div>

            {/* Total Transactions Card */}
            <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 shadow-sm flex flex-col gap-3 relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 text-on-surface-variant text-xs font-semibold">
                <span className="material-symbols-outlined text-[18px] text-primary bg-primary/10 p-1.5 rounded-lg">history</span>
                <span>Total Transactions</span>
              </div>
              <div className="font-display-lg text-2xl md:text-3xl text-on-surface tracking-tight font-bold">
                {txs.length}
              </div>
              <div className="text-[11px] text-on-surface-variant font-medium">
                Inflows & outflows combined
              </div>
            </div>
          </div>

          {/* Transactions Box */}
          <div className="w-full">
            <Transactions hideHeader={true} />
          </div>

          {/* Charts Section */}
          <div className="w-full">
            {/* Cashflow Ratio Breakdown Card */}
            <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl shadow-sm p-6 flex flex-col gap-6">
              <h2 className="font-title-md text-body-md font-bold text-on-surface flex items-center gap-1.5 uppercase font-label-caps text-[10px] tracking-wider border-b border-outline-variant/30 pb-2">
                <span className="material-symbols-outlined text-primary text-[16px]">pie_chart</span>
                Cashflow Ratio
              </h2>
              
              <div className="flex-1 flex flex-col items-center justify-center relative min-h-[180px]">
                {/* SVG Circular Donut Chart */}
                <svg className="w-44 h-44 transform -rotate-90 drop-shadow-sm" viewBox="0 0 100 100">
                  <circle className="stroke-error/10" cx="50" cy="50" fill="transparent" r="40" strokeWidth="10"></circle>
                  <circle 
                    className="stroke-primary" 
                    cx="50" 
                    cy="50" 
                    fill="transparent" 
                    r="40" 
                    strokeWidth="10"
                    strokeDasharray="251.2" 
                    strokeDashoffset={251.2 - (251.2 * inPercentage) / 100} 
                    strokeLinecap="round"
                  ></circle>
                </svg>
                
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="font-label-caps text-[10px] text-on-surface-variant mb-0.5 uppercase tracking-wider">Inflow Ratio</span>
                  <span className="font-headline-lg text-2xl text-primary font-bold tracking-tight">{inPercentage}%</span>
                </div>
              </div>

              {/* Chart Legend */}
              <div className="flex flex-col gap-2 pt-2 border-t border-outline-variant/30 text-xs">
                <div className="flex items-center justify-between p-1.5 rounded-lg hover:bg-surface-container-low transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-primary"></div>
                    <span className="text-on-surface-variant">Cash In</span>
                  </div>
                  <span className="font-mono-data font-bold text-on-surface">{inPercentage}%</span>
                </div>
                <div className="flex items-center justify-between p-1.5 rounded-lg hover:bg-surface-container-low transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-error-red/20"></div>
                    <span className="text-on-surface-variant">Cash Out</span>
                  </div>
                  <span className="font-mono-data font-bold text-on-surface">{outPercentage}%</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
