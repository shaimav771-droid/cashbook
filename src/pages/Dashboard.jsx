import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { dbService } from '../db';
import Transactions from './Transactions';

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function Dashboard() {
  const { currentBook, categories, setCurrentTab, txTrigger } = useApp();
  
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Dashboard period state
  const [period, setPeriod] = useState('30'); // 'all', 'today', '30', '90', 'custom'
  const [periodLabel, setPeriodLabel] = useState('This Month');
  const [periodDropdownOpen, setPeriodDropdownOpen] = useState(false);

  // Active query dates passed to Transactions table
  const [activeStartDate, setActiveStartDate] = useState('');
  const [activeEndDate, setActiveEndDate] = useState('');

  // Custom calendar states
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [calendarYear, setCalendarYear] = useState(() => new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(() => new Date().getMonth());
  const [tempFrom, setTempFrom] = useState(null);
  const [tempTo, setTempTo] = useState(null);

  // Ref for click outside detection
  const periodRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (periodRef.current && !periodRef.current.contains(event.target)) {
        setPeriodDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    if (!currentBook) {
      setLoading(false);
      return;
    }
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
      } else if (period === 'custom') {
        startDate = customStartDate;
        endDate = customEndDate;
      } else {
        endDate = ''; // All time
      }

      setActiveStartDate(startDate);
      setActiveEndDate(endDate);

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
  }, [currentBook, period, customStartDate, customEndDate, categories, txTrigger]);

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

  // Calendar generation helpers
  const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y, m) => new Date(y, m, 1).getDay();
  const formatDateString = (y, m, d) => {
    const mm = String(m + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  };

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear(prev => prev - 1);
    } else {
      setCalendarMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear(prev => prev + 1);
    } else {
      setCalendarMonth(prev => prev + 1);
    }
  };

  const handleDateClick = (dateStr) => {
    if (!tempFrom || (tempFrom && tempTo)) {
      setTempFrom(dateStr);
      setTempTo(null);
    } else {
      if (dateStr < tempFrom) {
        setTempFrom(dateStr);
      } else {
        setTempTo(dateStr);
      }
    }
  };

  const handleApplyCustomRange = () => {
    if (!tempFrom) return;
    const start = tempFrom;
    const end = tempTo || tempFrom;
    setCustomStartDate(start);
    setCustomEndDate(end);
    setPeriod('custom');

    const formatDateLabel = (str) => {
      const parts = str.split('-');
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    setPeriodLabel(`${formatDateLabel(start)} - ${formatDateLabel(end)}`);
    setPeriodDropdownOpen(false);
  };

  const symbol = getCurrencySymbol(currentBook?.currency || 'INR');

  if (!currentBook) {
    return (
      <div className="flex flex-col w-full gap-8">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="font-headline-lg text-2xl text-on-background select-none">Dashboard</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">Overview of your cashbook statements.</p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center py-16 px-4 bg-surface-container-lowest border border-outline-variant/30 rounded-2xl text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
            <span className="material-symbols-outlined text-[32px]">account_balance_wallet</span>
          </div>
          <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold mb-2">No Active Cash Book</h3>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-sm mb-6">
            Please select or create a Cash Book first to view your financial dashboard.
          </p>
          <button 
            onClick={() => setCurrentTab('cashbooks')}
            className="bg-primary text-on-primary font-bold px-5 py-2.5 rounded-xl hover:bg-primary-container hover:text-on-primary-container transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
            Manage Cash Books
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full gap-8">
      {/* Dashboard Heading & Period Selector */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="font-headline-lg text-2xl text-on-background select-none">Dashboard</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">Overview of your cashbook statements.</p>
        </div>

        {/* Period dropdown selector */}
        <div className="relative" ref={periodRef}>
          <button 
            onClick={() => setPeriodDropdownOpen(!periodDropdownOpen)}
            className="flex items-center gap-1.5 px-4 py-2 bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-sm text-xs font-semibold hover:shadow-md transition-all animate-fade-in"
          >
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">calendar_today</span>
            <span>{periodLabel}</span>
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">arrow_drop_down</span>
          </button>

          {periodDropdownOpen && (
            <div className="absolute right-0 mt-2 bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-2xl z-50 flex flex-col md:flex-row overflow-hidden text-xs">
              {/* Presets Column */}
              <div className="w-full md:w-40 border-b md:border-b-0 md:border-r border-outline-variant/30 p-2 flex flex-col gap-1 shrink-0 bg-surface-container-low/20">
                <div className="px-3 py-1 text-[10px] uppercase font-bold text-on-surface-variant/60 tracking-wider">Presets</div>
                <button onClick={() => handlePeriodChange('today', 'Today')} className={`w-full text-left px-3 py-1.5 rounded-lg transition-colors ${period === 'today' ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-surface-container-low'}`}>Today</button>
                <button onClick={() => handlePeriodChange('30', 'This Month')} className={`w-full text-left px-3 py-1.5 rounded-lg transition-colors ${period === '30' ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-surface-container-low'}`}>This Month</button>
                <button onClick={() => handlePeriodChange('90', 'Last 30 Days')} className={`w-full text-left px-3 py-1.5 rounded-lg transition-colors ${period === '90' ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-surface-container-low'}`}>Last 30 Days</button>
                <button onClick={() => handlePeriodChange('all', 'All Time')} className={`w-full text-left px-3 py-1.5 rounded-lg transition-colors ${period === 'all' ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-surface-container-low'}`}>All Time</button>
                <button 
                  onClick={() => {
                    setPeriod('custom');
                    if (!tempFrom && customStartDate) {
                      setTempFrom(customStartDate);
                      setTempTo(customEndDate);
                    }
                  }} 
                  className={`w-full text-left px-3 py-1.5 rounded-lg transition-colors border-t border-outline-variant/20 mt-1 font-semibold text-primary ${period === 'custom' ? 'bg-primary/15' : 'hover:bg-surface-container-low'}`}
                >
                  Custom Range
                </button>
              </div>

              {/* Calendar Column */}
              <div className="w-[280px] p-3 flex flex-col gap-3">
                <div className="flex items-center justify-between mb-1">
                  <button type="button" onClick={handlePrevMonth} className="p-1 hover:bg-surface-container-low rounded-full">
                    <span className="material-symbols-outlined text-[16px] text-on-surface-variant">chevron_left</span>
                  </button>
                  <span className="font-bold text-xs text-on-surface">{MONTH_NAMES[calendarMonth]} {calendarYear}</span>
                  <button type="button" onClick={handleNextMonth} className="p-1 hover:bg-surface-container-low rounded-full">
                    <span className="material-symbols-outlined text-[16px] text-on-surface-variant">chevron_right</span>
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-y-1 text-center font-bold text-[10px] text-on-surface-variant/70 mb-0.5">
                  <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
                </div>

                <div className="grid grid-cols-7 gap-y-1 justify-items-center">
                  {(() => {
                    const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
                    const firstDayIndex = getFirstDayOfMonth(calendarYear, calendarMonth);
                    const days = [];
                    for (let i = 0; i < firstDayIndex; i++) {
                      days.push(null);
                    }
                    for (let d = 1; d <= daysInMonth; d++) {
                      days.push(formatDateString(calendarYear, calendarMonth, d));
                    }

                    return days.map((dateStr, idx) => {
                      if (!dateStr) return <div key={`empty-${idx}`} className="h-7 w-7"></div>;

                      const isFrom = tempFrom === dateStr;
                      const isTo = tempTo === dateStr;
                      const isBetween = tempFrom && tempTo && dateStr > tempFrom && dateStr < tempTo;

                      let btnClass = "h-7 w-7 flex items-center justify-center font-mono-data text-[11px] transition-all relative ";

                      if (isFrom && isTo) {
                        btnClass += "bg-primary text-on-primary rounded-full font-bold";
                      } else if (isFrom) {
                        btnClass += `bg-primary text-on-primary font-bold ${tempTo ? 'rounded-l-full' : 'rounded-full'}`;
                      } else if (isTo) {
                        btnClass += "bg-primary text-on-primary font-bold rounded-r-full";
                      } else if (isBetween) {
                        btnClass += "bg-primary/15 text-primary rounded-none";
                      } else {
                        btnClass += "hover:bg-surface-container-low text-on-surface rounded-full";
                      }

                      const dayNum = parseInt(dateStr.split('-')[2]);

                      return (
                        <button
                          key={dateStr}
                          type="button"
                          onClick={() => handleDateClick(dateStr)}
                          className={btnClass}
                        >
                          {dayNum}
                        </button>
                      );
                    });
                  })()}
                </div>

                <div className="flex flex-col gap-2 pt-2 border-t border-outline-variant/30 text-[10px]">
                  <div className="flex items-center justify-between text-on-surface-variant">
                    <span>From: <strong className="text-on-surface font-mono-data">{tempFrom || 'Select'}</strong></span>
                    <span>To: <strong className="text-on-surface font-mono-data">{tempTo || 'Select'}</strong></span>
                  </div>
                  <div className="flex items-center justify-end gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setTempFrom(null);
                        setTempTo(null);
                      }}
                      className="px-2.5 py-1 border border-outline-variant rounded-md hover:bg-surface-container-low text-on-surface transition-colors"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      disabled={!tempFrom}
                      onClick={handleApplyCustomRange}
                      className="px-3.5 py-1 bg-primary text-on-primary font-semibold rounded-md hover:bg-primary-container disabled:opacity-50 transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
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
          {/* Proportional Reduced-Width Current Balance Card */}
          <div className="w-full max-w-md bg-gradient-to-br from-[#00652c] via-[#005c28] to-[#004d21] text-white border border-[#004f22] rounded-2xl p-8 shadow-sm flex flex-col gap-3 relative overflow-hidden group hover:shadow-md transition-shadow">
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

          {/* Three Summary Cards - Single Clean Horizontal Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Cash In Card */}
            <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 shadow-sm flex flex-col gap-3 relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 text-on-surface-variant text-xs font-semibold">
                <span className="material-symbols-outlined text-[18px] text-[#2E7D32] bg-[#2E7D32]/10 p-1.5 rounded-lg">arrow_downward</span>
                <span>Cash In</span>
              </div>
              <div className="font-display-lg text-2xl md:text-3xl text-on-surface tracking-tight font-bold">
                {symbol}{totalIn.toLocaleString()}
              </div>
              <div className="text-[11px] text-on-surface-variant font-medium">
                {inCount} Inflows recorded this period
              </div>
            </div>

            {/* Cash Out Card */}
            <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 shadow-sm flex flex-col gap-3 relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 text-on-surface-variant text-xs font-semibold">
                <span className="material-symbols-outlined text-[18px] text-[#C62828] bg-[#C62828]/10 p-1.5 rounded-lg">arrow_upward</span>
                <span>Cash Out</span>
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
            <Transactions hideHeader={true} startDate={activeStartDate} endDate={activeEndDate} />
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
