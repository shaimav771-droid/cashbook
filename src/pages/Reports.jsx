import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { dbService } from '../db';

export default function Reports() {
  const { currentBook, categories } = useApp();

  const [txs, setTxs] = useState([]);
  const [allTxs, setAllTxs] = useState([]); // All txs for historic trends
  const [loading, setLoading] = useState(true);

  // Custom date range state
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // Default to start of current month
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Report statistics
  const [openingBalance, setOpeningBalance] = useState(0);
  const [totalIn, setTotalIn] = useState(0);
  const [totalOut, setTotalOut] = useState(0);
  const [closingBalance, setClosingBalance] = useState(0);
  const [categoryBreakdown, setCategoryBreakdown] = useState([]);

  // Trend bars data
  const [monthlyTrends, setMonthlyTrends] = useState([]);

  const getCategoryName = (catId) => {
    const match = categories.find(c => c.id === catId);
    return match ? match.name : "Uncategorized";
  };

  const loadReportData = async () => {
    if (!currentBook) return;
    setLoading(true);
    try {
      // 1. Fetch all transactions
      const fullList = await dbService.transactions.getTransactions(currentBook.id);
      setAllTxs(fullList);

      // 2. Filter transactions in selected range
      const periodList = fullList.filter(t => t.date >= startDate && t.date <= endDate);
      setTxs(periodList);

      // 3. Calculate Opening Balance (Book balance + sum of transactions before startDate)
      const prevList = fullList.filter(t => t.date < startDate);
      const prevIn = prevList.filter(t => t.type === 'In').reduce((sum, t) => sum + t.amount, 0);
      const prevOut = prevList.filter(t => t.type === 'Out').reduce((sum, t) => sum + t.amount, 0);
      const computedOpening = currentBook.openingBalance + prevIn - prevOut;
      setOpeningBalance(computedOpening);

      // 4. Period stats
      const sumIn = periodList.filter(t => t.type === 'In').reduce((sum, t) => sum + t.amount, 0);
      const sumOut = periodList.filter(t => t.type === 'Out').reduce((sum, t) => sum + t.amount, 0);
      setTotalIn(sumIn);
      setTotalOut(sumOut);
      setClosingBalance(computedOpening + sumIn - sumOut);

      // 5. Category breakdown
      const catMap = {};
      categories.forEach(c => { catMap[c.id] = { name: c.name, amount: 0 }; });
      periodList.filter(t => t.type === 'Out').forEach(t => {
        if (catMap[t.categoryId]) {
          catMap[t.categoryId].amount += t.amount;
        } else {
          catMap[t.categoryId] = { name: 'Uncategorized', amount: t.amount };
        }
      });
      const catSpend = Object.values(catMap)
        .filter(c => c.amount > 0)
        .sort((a, b) => b.amount - a.amount);
      setCategoryBreakdown(catSpend);

      // 6. Generate historical monthly trends (last 5 months)
      const months = [];
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const today = new Date();
      
      for (let i = 4; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const yStr = d.getFullYear();
        const mStr = String(d.getMonth() + 1).padStart(2, '0');
        const label = `${monthNames[d.getMonth()]} ${yStr}`;
        
        // Sum transactions for this month
        const mList = fullList.filter(t => t.date.startsWith(`${yStr}-${mStr}`));
        const mIn = mList.filter(t => t.type === 'In').reduce((sum, t) => sum + t.amount, 0);
        const mOut = mList.filter(t => t.type === 'Out').reduce((sum, t) => sum + t.amount, 0);
        
        months.push({ label, inflow: mIn, outflow: mOut });
      }
      setMonthlyTrends(months);

    } catch (err) {
      console.error("Error generating reports:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, [currentBook, startDate, endDate, categories]);

  const handleExportCSV = () => {
    if (txs.length === 0) return;
    
    // Header row
    let csvContent = "data:text/csv;charset=utf-8,Date,Description,Category,Method,Type,Amount,Note\n";
    
    // Data rows
    txs.forEach(t => {
      const catName = categories.find(c => c.id === t.categoryId)?.name || "Uncategorized";
      const desc = `"${t.description.replace(/"/g, '""')}"`;
      const note = `"${(t.note || '').replace(/"/g, '""')}"`;
      csvContent += `${t.date},${desc},${catName},${t.paymentMethod},${t.type},${t.amount},${note}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `cashbook_report_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getCurrencySymbol = (curr) => {
    return curr === 'INR' ? '₹' : curr === 'USD' ? '$' : curr === 'EUR' ? '€' : '£';
  };

  const symbol = getCurrencySymbol(currentBook?.currency || 'INR');

  // Calculations for donut offset
  let accumOffset = 0;

  return (
    <div className="flex flex-col w-full gap-8 print:p-0">
      {/* Title & Range Selector */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 print:hidden">
        <div>
          <h1 className="font-headline-lg text-2xl text-on-background select-none">Reports</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">Comprehensive financial statement generator.</p>
        </div>

        {/* Date inputs */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-3 py-2 shadow-sm">
            <span className="material-symbols-outlined text-[16px] text-on-surface-variant">date_range</span>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent border-none outline-none font-semibold"
            />
            <span className="text-on-surface-variant">to</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent border-none outline-none font-semibold"
            />
          </div>

          <button 
            onClick={loadReportData}
            className="bg-primary text-on-primary font-semibold text-xs px-4 py-2.5 rounded-xl hover:bg-primary-container hover:text-on-primary-container shadow transition-all"
          >
            Run Report
          </button>
        </div>
      </div>

      {loading ? (
        <div className="min-h-[400px] flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <div className="text-xs text-on-surface-variant">Running report calculations...</div>
        </div>
      ) : (
        <>
          {/* Printable Report Header */}
          <div className="hidden print:block border-b border-on-background/25 pb-4 mb-4">
            <h1 className="text-2xl font-bold">{currentBook?.name} - CashBook Statement</h1>
            <p className="text-xs text-on-surface-variant mt-1">Period: {new Date(startDate).toLocaleDateString()} to {new Date(endDate).toLocaleDateString()}</p>
          </div>

          {/* Stats Sheets */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {/* Opening Balance */}
            <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-5 shadow-sm">
              <p className="font-label-caps text-[10px] text-on-surface-variant uppercase font-bold mb-1">Opening Balance</p>
              <p className={`font-headline-lg text-lg md:text-xl font-bold ${openingBalance >= 0 ? 'text-on-surface' : 'text-error'}`}>
                {openingBalance < 0 ? '-' : ''}{symbol}{Math.abs(openingBalance).toLocaleString()}
              </p>
            </div>

            {/* Total In */}
            <div className="bg-primary rounded-xl p-5 shadow-sm text-on-primary">
              <p className="font-label-caps text-[10px] uppercase font-bold mb-1 opacity-80">Total Cash In</p>
              <p className="font-headline-lg text-lg md:text-xl font-bold">{symbol}{totalIn.toLocaleString()}</p>
            </div>

            {/* Total Out */}
            <div className="bg-error rounded-xl p-5 shadow-sm text-on-error">
              <p className="font-label-caps text-[10px] uppercase font-bold mb-1 opacity-80">Total Cash Out</p>
              <p className="font-headline-lg text-lg md:text-xl font-bold">{symbol}{totalOut.toLocaleString()}</p>
            </div>

            {/* Closing Balance */}
            <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-5 shadow-sm">
              <p className="font-label-caps text-[10px] text-on-surface-variant uppercase font-bold mb-1">Closing Balance</p>
              <p className={`font-headline-lg text-lg md:text-xl font-bold ${closingBalance >= 0 ? 'text-primary' : 'text-error'}`}>
                {closingBalance < 0 ? '-' : ''}{symbol}{Math.abs(closingBalance).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Trends & Distribution charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
            {/* Bar Trends SVG */}
            <div className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-6 shadow-sm flex flex-col justify-between">
              <h3 className="font-title-md text-xs font-bold text-on-surface border-b border-outline-variant/30 pb-2 mb-4 uppercase font-label-caps tracking-wider">
                Cash Flow Trends
              </h3>
              
              <div className="h-[240px] w-full flex items-end justify-between gap-4 px-2 pb-6 relative mt-4">
                {/* Horizontal Grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6">
                  <div className="w-full border-t border-outline-variant/20 h-0"></div>
                  <div className="w-full border-t border-outline-variant/20 h-0"></div>
                  <div className="w-full border-t border-outline-variant/20 h-0"></div>
                  <div className="w-full border-t border-outline-variant/20 h-0"></div>
                </div>

                {monthlyTrends.map((t, idx) => {
                  const maxAmount = Math.max(...monthlyTrends.map(m => Math.max(m.inflow, m.outflow))) || 1;
                  const inPct = Math.round((t.inflow / maxAmount) * 100);
                  const outPct = Math.round((t.outflow / maxAmount) * 100);

                  return (
                    <div key={idx} className="flex-1 flex flex-col justify-end items-center gap-2 group/bar relative h-full">
                      <div className="flex gap-2 w-full justify-center items-end h-[180px]">
                        {/* Green inflow bar */}
                        <div 
                          className="w-4 bg-primary rounded-t-sm hover:bg-primary-container transition-colors" 
                          style={{ height: `${Math.max(4, inPct)}%` }}
                          title={`Inflow: ${symbol}${t.inflow}`}
                        ></div>
                        {/* Red outflow bar */}
                        <div 
                          className="w-4 bg-error rounded-t-sm hover:bg-error-container transition-colors" 
                          style={{ height: `${Math.max(4, outPct)}%` }}
                          title={`Outflow: ${symbol}${t.outflow}`}
                        ></div>
                      </div>
                      <span className="font-label-caps text-[10px] text-on-surface-variant font-bold mt-1">{t.label}</span>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-center gap-6 mt-2 border-t border-outline-variant/30 pt-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded bg-primary"></div>
                  <span className="text-on-surface-variant font-medium">Cash In</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded bg-error"></div>
                  <span className="text-on-surface-variant font-medium">Cash Out</span>
                </div>
              </div>
            </div>

            {/* Category Expenses distribution */}
            <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-6 shadow-sm flex flex-col">
              <h3 className="font-title-md text-xs font-bold text-on-surface border-b border-outline-variant/30 pb-2 mb-4 uppercase font-label-caps tracking-wider">
                Expense Categories
              </h3>
              
              <div className="flex-1 flex flex-col items-center justify-center">
                {categoryBreakdown.length === 0 ? (
                  <div className="text-center text-on-surface-variant opacity-50 text-xs py-10 flex flex-col items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-[32px]">bar_chart</span>
                    <div>No expense logs for this period.</div>
                  </div>
                ) : (
                  <>
                    <div className="relative w-36 h-36 mb-6">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        <circle className="text-surface-variant" cx="50" cy="50" fill="transparent" r="40" stroke="currentColor" strokeWidth="16"></circle>
                        {categoryBreakdown.map((c, i) => {
                          const pct = (c.amount / totalOut) * 100;
                          const offset = 251.2 - (251.2 * pct) / 100;
                          const currentAccum = accumOffset;
                          accumOffset += pct;
                          
                          // Custom color class mappings
                          const colors = ["stroke-tertiary", "stroke-tertiary-container", "stroke-tertiary-fixed", "stroke-outline", "stroke-outline-variant"];
                          const colorClass = colors[i % colors.length];

                          return (
                            <circle 
                              key={i}
                              className={colorClass} 
                              cx="50" 
                              cy="50" 
                              fill="transparent" 
                              r="40" 
                              strokeWidth="16" 
                              strokeDasharray="251.2" 
                              strokeDashoffset={offset}
                              transform={`rotate(${(currentAccum * 3.6)} 50 50)`}
                            ></circle>
                          );
                        })}
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center flex-col text-center">
                        <span className="font-headline-lg text-lg font-bold text-on-surface">{categoryBreakdown.length}</span>
                        <span className="font-label-caps text-[9px] text-on-surface-variant uppercase tracking-wider font-semibold">Spend Types</span>
                      </div>
                    </div>

                    <div className="w-full space-y-2 text-xs overflow-y-auto max-h-[140px] pr-1">
                      {categoryBreakdown.map((c, i) => {
                        const pct = Math.round((c.amount / totalOut) * 100);
                        const colors = ["bg-tertiary", "bg-tertiary-container", "bg-tertiary-fixed", "bg-outline", "bg-outline-variant"];
                        const colorClass = colors[i % colors.length];

                        return (
                          <div key={i} className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <div className={`w-2.5 h-2.5 rounded-full ${colorClass}`}></div>
                              <span className="text-on-surface-variant">{c.name}</span>
                            </div>
                            <span className="font-mono-data font-bold text-on-surface">{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Ledger view for print (and simple list) */}
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-sm overflow-hidden flex flex-col p-4">
            <div className="font-bold text-xs border-b border-outline-variant/30 pb-3 mb-3 uppercase tracking-wider font-label-caps text-on-surface print:block hidden">
              Ledger Transactions List
            </div>
            
            <div className="overflow-x-auto w-full max-w-full">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-outline-variant/30 text-on-surface-variant bg-surface-container-low/30">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Method</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {txs.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-10 text-center text-on-surface-variant opacity-50">
                        No transactions recorded in this date range.
                      </td>
                    </tr>
                  ) : (
                    txs.map((t) => (
                      <tr key={t.id} className="border-b border-outline-variant/20 hover:bg-surface-container-low/20">
                        <td className="py-3 px-3 font-mono-data text-on-surface-variant">{t.date}</td>
                        <td className="py-3 px-3">
                          <div className="font-semibold">{t.description}</div>
                          {t.note && <div className="text-[10px] text-on-surface-variant italic mt-0.5">{t.note}</div>}
                        </td>
                        <td className="py-3 px-3">{getCategoryName(t.categoryId)}</td>
                        <td className="py-3 px-3 text-on-surface-variant">{t.paymentMethod}</td>
                        <td className="py-3 px-3 font-bold text-xs">{t.type}</td>
                        <td className={`py-3 px-3 text-right font-mono-data font-bold text-sm ${t.type === 'In' ? 'text-[#2E7D32]' : 'text-on-surface'}`}>
                          {t.type === 'In' ? '+' : '-'}{symbol}{t.amount.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Exporter actions panel */}
          <div className="bg-surface-container-high border border-outline-variant/30 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
            <div>
              <h4 className="font-bold text-on-surface text-sm">Export Report Sheet</h4>
              <p className="text-xs text-on-surface-variant mt-0.5">Download current date range statement or trigger printer logs.</p>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={() => window.print()}
                className="bg-surface-container-lowest text-on-surface border border-outline-variant/30 px-4 py-2 rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 hover:bg-surface-container transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">print</span> 
                Print Statement
              </button>
              
              <button 
                onClick={handleExportCSV}
                disabled={txs.length === 0}
                className="bg-surface-container-lowest text-on-surface border border-outline-variant/30 px-4 py-2 rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 hover:bg-surface-container transition-all disabled:opacity-30"
              >
                <span className="material-symbols-outlined text-[18px]">table_chart</span> 
                Download CSV
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
