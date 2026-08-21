import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { dbService } from '../db';
import { ConfirmationModal } from '../components';
import { getPeriodDates, getPeriodLabel } from '../utils/dateHelpers';

const CATEGORY_ICONS = {
  "sales": "storefront",
  "salary": "payments",
  "food": "restaurant",
  "travel": "flight",
  "fuel": "local_gas_station",
  "office": "corporate_fare",
  "marketing": "campaign",
  "purchase": "shopping_cart",
  "refund": "assignment_return",
  "other": "more_horiz",
  "services": "work",
  "software": "desktop_windows",
  "equipment": "chair"
};

const getCategoryIcon = (name) => {
  return CATEGORY_ICONS[name?.toLowerCase()] || "sell";
};

export default function Transactions(props) {
  const { hideHeader = false, startDate = '', endDate = '' } = props;
  const { currentBook, categories, setCurrentTab, txTrigger, triggerTxUpdate, refreshCategories } = useApp();
  
  // Authorization role
  const isReadOnly = currentBook?.role?.toLowerCase() === 'viewer';

  // Transaction list & loading
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);

  // Local period states if not passed as props
  const [localPeriod, setLocalPeriod] = useState('this_month');
  const [localPeriodLabel, setLocalPeriodLabel] = useState('This Month');
  const [localCustomStartDate, setLocalCustomStartDate] = useState('');
  const [localCustomEndDate, setLocalCustomEndDate] = useState('');

  // Use props if provided, otherwise use local state
  const currentPeriod = props.period !== undefined ? props.period : localPeriod;
  const currentPeriodLabel = props.periodLabel !== undefined ? props.periodLabel : localPeriodLabel;
  const currentCustomStartDate = props.customStartDate !== undefined ? props.customStartDate : localCustomStartDate;
  const currentCustomEndDate = props.customEndDate !== undefined ? props.customEndDate : localCustomEndDate;

  // Period dropdown state
  const [periodDropdownOpen, setPeriodDropdownOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  // Calendar states
  const [calendarYear, setCalendarYear] = useState(() => new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(() => new Date().getMonth());
  const [tempFrom, setTempFrom] = useState(null);
  const [tempTo, setTempTo] = useState(null);

  // Custom Category and Method dropdown states
  const [catDropdownOpen, setCatDropdownOpen] = useState(false);
  const [catSearchQuery, setCatSearchQuery] = useState('');
  const [methodDropdownOpen, setMethodDropdownOpen] = useState(false);

  // Refs for click outside
  const periodRef = useRef(null);
  const catDropdownRef = useRef(null);
  const methodDropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (periodRef.current && !periodRef.current.contains(event.target)) {
        setPeriodDropdownOpen(false);
      }
      if (catDropdownRef.current && !catDropdownRef.current.contains(event.target)) {
        setCatDropdownOpen(false);
      }
      if (methodDropdownRef.current && !methodDropdownRef.current.contains(event.target)) {
        setMethodDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Pagination
  const [page, setPage] = useState(1);
  const limit = 8;

  // CRUD modals state
  const [formOpen, setFormOpen] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [txType, setTxType] = useState('In');
  const [txAmount, setTxAmount] = useState('');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [txDesc, setTxDesc] = useState('');
  const [txCat, setTxCat] = useState('');
  const [txMethod, setTxMethod] = useState('Bank');
  const [txNote, setTxNote] = useState('');
  
  // File Upload states
  const [uploadingFile, setUploadingFile] = useState(false);
  const [fileAttachment, setFileAttachment] = useState(null);
  const [formError, setFormError] = useState('');

  // States for in-app deletion confirmation
  const [txToDelete, setTxToDelete] = useState(null);
  const [deleteTxLoading, setDeleteTxLoading] = useState(false);

  // Attachment lightbox modal
  const [previewAttachment, setPreviewAttachment] = useState(null);

  // Load transactions
  const loadTransactions = async () => {
    if (!currentBook) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      let activeStart = startDate;
      let activeEnd = endDate;

      // If startDate and endDate props are empty, use local period selection
      if (!startDate && !endDate) {
        const periodDates = getPeriodDates(currentPeriod, currentCustomStartDate, currentCustomEndDate);
        activeStart = periodDates.startDate;
        activeEnd = periodDates.endDate;
      }

      const filters = {
        search,
        type: typeFilter,
        categoryId: catFilter,
        paymentMethod: methodFilter,
        startDate: activeStart,
        endDate: activeEnd
      };
      const list = await dbService.transactions.getTransactions(currentBook.id, filters);
      setTxs(list);
    } catch (err) {
      console.error("Error loading transactions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [currentBook, search, typeFilter, catFilter, methodFilter, startDate, endDate, currentPeriod, currentCustomStartDate, currentCustomEndDate, txTrigger]);

  const handlePeriodSelect = (val, label) => {
    if (props.onPeriodChange) {
      props.onPeriodChange(val, label, '', '');
    } else {
      setLocalPeriod(val);
      setLocalPeriodLabel(label);
      setLocalCustomStartDate('');
      setLocalCustomEndDate('');
      setPage(1);
    }
    setPeriodDropdownOpen(false);
  };

  const handleApplyCustom = () => {
    if (!tempFrom) return;
    const start = tempFrom;
    const end = tempTo || tempFrom;
    
    const formatDateLabel = (str) => {
      const parts = str.split('-');
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };
    const label = `${formatDateLabel(start)} - ${formatDateLabel(end)}`;

    if (props.onPeriodChange) {
      props.onPeriodChange('custom', label, start, end);
    } else {
      setLocalPeriod('custom');
      setLocalPeriodLabel(label);
      setLocalCustomStartDate(start);
      setLocalCustomEndDate(end);
      setPage(1);
    }
    setPeriodDropdownOpen(false);
  };

  const handleCreateCustomCategory = async () => {
    const name = catSearchQuery.trim();
    if (!name) return;
    try {
      setFormError('');
      const newCat = await dbService.categories.addCategory(currentBook.id, name);
      await triggerTxUpdate();
      if (refreshCategories) {
        await refreshCategories();
      }
      setTxCat(newCat.id);
      setCatSearchQuery('');
      setCatDropdownOpen(false);
    } catch (err) {
      setFormError(err.message || 'Failed to create category.');
    }
  };

  const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const calendarMonthName = () => MONTH_NAMES[calendarMonth];

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

  const generateCalendarDays = () => {
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
  };

  useEffect(() => {
    // Set default category when categories load
    if (categories.length > 0 && !txCat) {
      setTxCat(categories[0].id);
    }
  }, [categories]);

  const handleOpenAdd = () => {
    if (isReadOnly) return;
    setEditingTx(null);
    setTxType('In');
    setTxAmount('');
    setTxDate(new Date().toISOString().split('T')[0]);
    setTxDesc('');
    setTxCat(categories[0]?.id || '');
    setTxMethod('Bank');
    setTxNote('');
    setFileAttachment(null);
    setFormError('');
    setFormOpen(true);
  };

  const handleOpenEdit = (tx) => {
    if (isReadOnly) return;
    setEditingTx(tx);
    setTxType(tx.type);
    setTxAmount(tx.amount.toString());
    setTxDate(tx.date);
    setTxDesc(tx.description);
    setTxCat(tx.categoryId);
    setTxMethod(tx.paymentMethod);
    setTxNote(tx.note || '');
    setFileAttachment(tx.attachment);
    setFormError('');
    setFormOpen(true);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingFile(true);
    setFormError('');
    try {
      const result = await dbService.attachments.uploadFile(file);
      setFileAttachment(result);
    } catch (err) {
      setFormError('Failed to upload file attachment.');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!txAmount || Number(txAmount) <= 0) {
      setFormError("Amount must be greater than zero.");
      return;
    }
    if (!txDesc.trim()) {
      setFormError("Description is required.");
      return;
    }

    const payload = {
      bookId: currentBook.id,
      type: txType,
      amount: Number(txAmount),
      date: txDate,
      description: txDesc,
      categoryId: txCat,
      paymentMethod: txMethod,
      note: txNote,
      attachment: fileAttachment
    };

    try {
      if (editingTx) {
        await dbService.transactions.updateTransaction(editingTx.id, payload);
      } else {
        await dbService.transactions.addTransaction(payload);
      }
      setFormOpen(false);
      triggerTxUpdate();
    } catch (err) {
      setFormError(err.message || "Failed to save transaction.");
    }
  };

  const handleDeleteClick = (tx) => {
    setTxToDelete(tx);
  };

  const handleConfirmDelete = async () => {
    if (!txToDelete) return;
    setDeleteTxLoading(true);
    try {
      await dbService.transactions.deleteTransaction(txToDelete.id);
      triggerTxUpdate();
      setTxToDelete(null);
    } catch (err) {
      alert(err.message || "Failed to delete transaction.");
    } finally {
      setDeleteTxLoading(false);
    }
  };

  // Pagination slicing
  const totalPages = Math.max(1, Math.ceil(txs.length / limit));
  const displayedTxs = txs.slice((page - 1) * limit, page * limit);

  const getCurrencySymbol = (curr) => {
    return curr === 'INR' ? '₹' : curr === 'USD' ? '$' : curr === 'EUR' ? '€' : '£';
  };

  const getCategoryName = (catId) => {
    const match = categories.find(c => c.id === catId);
    return match ? match.name : "Uncategorized";
  };

  if (!currentBook) {
    return (
      <div className="flex flex-col gap-6 w-full relative">
        {!hideHeader && (
          <div>
            <h1 className="font-headline-lg text-2xl text-primary select-none">Transactions</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">Manage and track your cash book ledger entries.</p>
          </div>
        )}

        <div className="flex flex-col items-center justify-center py-16 px-4 bg-surface-container-lowest border border-outline-variant/30 rounded-2xl text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
            <span className="material-symbols-outlined text-[32px]">receipt_long</span>
          </div>
          <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold mb-2">No Active Cash Book</h3>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-sm mb-6">
            Please select or create a Cash Book first to view and manage transactions.
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
    <div className="flex flex-col gap-6 w-full relative">
      {/* Top Section: Title & Actions */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        {!hideHeader && (
          <div>
            <h1 className="font-headline-lg text-2xl text-primary select-none">Transactions</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">Manage and track your cash book ledger entries.</p>
          </div>
        )}

        <div className={`flex flex-wrap items-center gap-3 w-full lg:w-auto ${hideHeader ? 'ml-auto' : ''}`}>
          {/* Search bar */}
          <div className="relative flex-1 sm:flex-initial sm:w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">search</span>
            <input 
              className="w-full bg-surface-container-lowest text-on-surface font-body-md text-xs pl-10 pr-4 py-2.5 rounded-xl border border-outline-variant/30 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all placeholder:text-on-surface-variant/40"
              placeholder="Search description, note..." 
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          {/* Period filter dropdown selector */}
          <div className="relative" ref={periodRef}>
            <button 
              type="button"
              onClick={() => {
                setPeriodDropdownOpen(!periodDropdownOpen);
                setShowCalendar(currentPeriod === 'custom');
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-sm text-xs font-semibold hover:shadow-md transition-all animate-fade-in text-on-surface"
            >
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant">calendar_today</span>
              <span>{currentPeriodLabel}</span>
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant">arrow_drop_down</span>
            </button>

            {periodDropdownOpen && (
              <div className="absolute right-0 mt-2 bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden text-xs min-w-[160px]">
                {!showCalendar ? (
                  /* Presets Column only */
                  <div className="p-2 flex flex-col gap-1">
                    <div className="px-3 py-1 text-[10px] uppercase font-bold text-on-surface-variant/60 tracking-wider">Presets</div>
                    <button type="button" onClick={() => handlePeriodSelect('today', 'Today')} className={`w-full text-left px-3 py-1.5 rounded-lg transition-colors ${currentPeriod === 'today' ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-surface-container-low'}`}>Today</button>
                    <button type="button" onClick={() => handlePeriodSelect('this_week', 'This Week')} className={`w-full text-left px-3 py-1.5 rounded-lg transition-colors ${currentPeriod === 'this_week' ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-surface-container-low'}`}>This Week</button>
                    <button type="button" onClick={() => handlePeriodSelect('this_month', 'This Month')} className={`w-full text-left px-3 py-1.5 rounded-lg transition-colors ${currentPeriod === 'this_month' ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-surface-container-low'}`}>This Month</button>
                    <button type="button" onClick={() => handlePeriodSelect('all', 'All Time')} className={`w-full text-left px-3 py-1.5 rounded-lg transition-colors ${currentPeriod === 'all' ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-surface-container-low'}`}>All Time</button>
                    <button 
                      type="button"
                      onClick={() => {
                        setShowCalendar(true);
                        if (!tempFrom && currentCustomStartDate) {
                          setTempFrom(currentCustomStartDate);
                          setTempTo(currentCustomEndDate);
                        }
                      }} 
                      className={`w-full text-left px-3 py-1.5 rounded-lg transition-colors border-t border-outline-variant/20 mt-1 font-semibold text-primary ${currentPeriod === 'custom' ? 'bg-primary/15' : 'hover:bg-surface-container-low'}`}
                    >
                      Custom Range
                    </button>
                  </div>
                ) : (
                  /* Calendar Column only */
                  <div className="w-[280px] p-3 flex flex-col gap-3">
                    <div className="flex items-center gap-1.5 -ml-1 border-b border-outline-variant/30 pb-2 mb-1">
                      <button
                        type="button"
                        onClick={() => setShowCalendar(false)}
                        className="p-1 hover:bg-surface-container-low rounded-full flex items-center justify-center"
                      >
                        <span className="material-symbols-outlined text-[16px] text-on-surface-variant">arrow_back</span>
                      </button>
                      <span className="font-semibold text-xs text-on-surface">Select Custom Range</span>
                    </div>

                    <div className="flex items-center justify-between mb-1">
                      <button type="button" onClick={handlePrevMonth} className="p-1 hover:bg-surface-container-low rounded-full">
                        <span className="material-symbols-outlined text-[16px] text-on-surface-variant">chevron_left</span>
                      </button>
                      <span className="font-bold text-xs text-on-surface">
                        {calendarMonthName()} {calendarYear}
                      </span>
                      <button type="button" onClick={handleNextMonth} className="p-1 hover:bg-surface-container-low rounded-full">
                        <span className="material-symbols-outlined text-[16px] text-on-surface-variant">chevron_right</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-y-1 text-center font-bold text-[10px] text-on-surface-variant/70 mb-0.5">
                      <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
                    </div>

                    <div className="grid grid-cols-7 gap-y-1 justify-items-center">
                      {generateCalendarDays()}
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
                          onClick={handleApplyCustom}
                          className="px-3.5 py-1 bg-primary text-on-primary font-semibold rounded-md hover:bg-primary-container disabled:opacity-50 transition-colors"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Extra filter trigger */}
          <button 
            onClick={() => setFilterPanelOpen(!filterPanelOpen)}
            className={`flex items-center gap-1.5 px-4 py-2 bg-surface-container-lowest rounded-xl border shadow-sm text-xs font-semibold hover:shadow-md transition-all ${
              filterPanelOpen || typeFilter || catFilter || methodFilter
                ? 'border-primary text-primary bg-primary/5' 
                : 'border-outline-variant/30 text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">filter_list</span>
            <span>Filter</span>
          </button>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {(filterPanelOpen || typeFilter || catFilter || methodFilter) && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block font-label-caps text-[10px] text-on-surface-variant uppercase font-bold mb-1.5">Type</label>
            <select 
              value={typeFilter} 
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              className="w-full p-2 border border-outline-variant bg-surface rounded-lg"
            >
              <option value="">All Types</option>
              <option value="In">Cash In (+)</option>
              <option value="Out">Cash Out (-)</option>
            </select>
          </div>

          <div>
            <label className="block font-label-caps text-[10px] text-on-surface-variant uppercase font-bold mb-1.5">Category</label>
            <select 
              value={catFilter} 
              onChange={(e) => { setCatFilter(e.target.value); setPage(1); }}
              className="w-full p-2 border border-outline-variant bg-surface rounded-lg"
            >
              <option value="">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-label-caps text-[10px] text-on-surface-variant uppercase font-bold mb-1.5">Payment Method</label>
            <select 
              value={methodFilter} 
              onChange={(e) => { setMethodFilter(e.target.value); setPage(1); }}
              className="w-full p-2 border border-outline-variant bg-surface rounded-lg"
            >
              <option value="">All Methods</option>
              <option value="Cash">Cash</option>
              <option value="Bank">Bank</option>
              <option value="Card">Card</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="flex gap-2 items-end">
            <button 
              onClick={() => {
                setTypeFilter('');
                setCatFilter('');
                setMethodFilter('');
                setPage(1);
              }}
              className="w-full py-2 border border-error-red/20 text-error-red hover:bg-error-container hover:text-on-error-container rounded-lg flex items-center justify-center gap-1.5 font-semibold"
              title="Reset Filters"
            >
              <span className="material-symbols-outlined text-[18px]">filter_alt_off</span>
              <span>Reset Filters</span>
            </button>
          </div>
        </div>
      )}

      {/* Ledger Table Container */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[400px]">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <div className="text-xs text-on-surface-variant">Syncing Ledger...</div>
          </div>
        ) : txs.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-on-surface-variant py-20">
            <span className="material-symbols-outlined text-[48px] opacity-30">receipt_long</span>
            <div className="font-semibold text-sm">No transactions yet.</div>
            <p className="text-xs opacity-75">Click "Add Entry" to create your first ledger transaction.</p>
          </div>
        ) : (
          <>
            {/* Desktop view (table) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low text-on-surface-variant border-b border-outline-variant/30">
                    <th className="py-3 px-4 font-label-caps text-label-caps uppercase tracking-wider">Date</th>
                    <th className="py-3 px-4 font-label-caps text-label-caps uppercase tracking-wider min-w-[200px]">Description</th>
                    <th className="py-3 px-4 font-label-caps text-label-caps uppercase tracking-wider">Category</th>
                    <th className="py-3 px-4 font-label-caps text-label-caps uppercase tracking-wider">Method</th>
                    <th className="py-3 px-4 font-label-caps text-label-caps uppercase tracking-wider">Type</th>
                    <th className="py-3 px-4 font-label-caps text-label-caps uppercase tracking-wider text-right">Amount</th>
                    <th className="py-3 px-4 font-label-caps text-label-caps uppercase tracking-wider text-center">Receipt</th>
                    {!isReadOnly && <th className="py-3 px-4 font-label-caps text-label-caps uppercase tracking-wider text-center">Actions</th>}
                  </tr>
                </thead>
                <tbody className="text-on-surface font-body-sm text-xs">
                  {displayedTxs.map((t) => {
                    const symbol = getCurrencySymbol(currentBook.currency);
                    const isCashIn = t.type === 'In';
                    const catName = getCategoryName(t.categoryId);
                    const catIcon = getCategoryIcon(catName);

                    return (
                      <tr key={t.id} className="border-b border-outline-variant/20 hover:bg-surface-container-low/40 transition-colors group">
                        {/* Date */}
                        <td className="py-4 px-4 whitespace-nowrap font-mono-data text-on-surface-variant font-medium">
                          {new Date(t.date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        
                        {/* Description */}
                        <td className="py-4 px-4">
                          <div className="font-semibold text-on-surface leading-snug">{t.description}</div>
                          {t.note && <div className="text-on-surface-variant text-[11px] line-clamp-1 mt-0.5">{t.note}</div>}
                        </td>

                        {/* Category */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-surface-variant text-on-surface rounded-full text-[11px] font-medium border border-outline-variant/20">
                            <span className="material-symbols-outlined text-[14px]">{catIcon}</span>
                            {catName}
                          </span>
                        </td>

                        {/* Payment Method */}
                        <td className="py-4 px-4 whitespace-nowrap text-on-surface-variant">
                          {t.paymentMethod}
                        </td>

                        {/* Type */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isCashIn ? 'bg-[#E8F5E9] text-[#2E7D32]' : 'bg-[#FFEBEE] text-[#C62828]'
                          }`}>
                            {isCashIn ? 'Cash In' : 'Cash Out'}
                          </span>
                        </td>

                        {/* Amount */}
                        <td className={`py-4 px-4 whitespace-nowrap text-right font-mono-data font-bold text-sm ${
                          isCashIn ? 'text-[#2E7D32]' : 'text-[#C62828]'
                        }`}>
                          {isCashIn ? '+' : '-'}{symbol}{t.amount.toLocaleString()}
                        </td>

                        {/* Attachment Receipt */}
                        <td className="py-4 px-4 whitespace-nowrap text-center">
                          {t.attachment ? (
                            <button 
                              onClick={() => setPreviewAttachment(t.attachment)}
                              className="text-primary hover:text-primary-container p-1 rounded hover:bg-primary/5 transition-all"
                            >
                              <span className="material-symbols-outlined text-[20px]">description</span>
                            </button>
                          ) : (
                            <span className="material-symbols-outlined text-[18px] opacity-20">horizontal_rule</span>
                          )}
                        </td>

                        {/* Actions (Edit/Delete) */}
                        {!isReadOnly && (
                          <td className="py-4 px-4 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center gap-1 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => handleOpenEdit(t)}
                                className="p-1 text-on-surface-variant hover:text-primary rounded-full hover:bg-surface-variant transition-colors"
                              >
                                <span className="material-symbols-outlined text-[18px]">edit</span>
                              </button>
                              <button 
                                onClick={() => handleDeleteClick(t)}
                                className="p-1 text-on-surface-variant hover:text-error rounded-full hover:bg-error-container transition-colors"
                                title="Delete transaction"
                              >
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile view (card-table hybrid) */}
            <div className="block md:hidden divide-y divide-outline-variant/10">
              {displayedTxs.map((t) => {
                const symbol = getCurrencySymbol(currentBook.currency);
                const isCashIn = t.type === 'In';
                const catName = getCategoryName(t.categoryId);
                const catIcon = getCategoryIcon(catName);

                return (
                  <div key={t.id} className="p-3.5 flex flex-col gap-2 hover:bg-surface-container-low/40 transition-colors">
                    {/* Main Row */}
                    <div className="flex items-center justify-between gap-3">
                      {/* Left: Category Icon & Text details */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${
                          isCashIn ? 'bg-[#E8F5E9] text-[#2E7D32] border-[#2E7D32]/10' : 'bg-[#FFEBEE] text-[#C62828] border-[#C62828]/10'
                        }`}>
                          <span className="material-symbols-outlined text-[20px]">{catIcon}</span>
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-sm text-on-surface truncate leading-tight">{t.description}</div>
                          <div className="flex items-center gap-1.5 text-[11px] text-on-surface-variant font-medium mt-1">
                            <span className="font-mono-data">{new Date(t.date).toLocaleDateString('en-US', { day: '2-digit', month: 'short' })}</span>
                            <span className="opacity-30">•</span>
                            <span>{t.paymentMethod}</span>
                            <span className="opacity-30">•</span>
                            <span className="font-semibold text-primary">{catName}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Amount & Compact Badge */}
                      <div className="flex flex-col items-end shrink-0">
                        <div className={`font-mono-data font-bold text-sm ${
                          isCashIn ? 'text-[#2E7D32]' : 'text-[#C62828]'
                        }`}>
                          {isCashIn ? '+' : '-'}{symbol}{t.amount.toLocaleString()}
                        </div>
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase mt-1 tracking-wider ${
                          isCashIn ? 'bg-[#E8F5E9] text-[#2E7D32] border border-[#2E7D32]/15' : 'bg-[#FFEBEE] text-[#C62828] border border-[#C62828]/15'
                        }`}>
                          {isCashIn ? 'In' : 'Out'}
                        </span>
                      </div>
                    </div>

                    {/* Note if exists */}
                    {t.note && (
                      <div className="pl-[52px] text-[11px] text-on-surface-variant/80 italic break-words line-clamp-1 bg-surface-container-low/30 p-1.5 rounded border-l-2 border-outline-variant/30">
                        {t.note}
                      </div>
                    )}

                    {/* Actions Row */}
                    <div className="pl-[52px] flex items-center justify-between border-t border-outline-variant/5 pt-1.5 mt-0.5">
                      {/* Left: Receipt Preview */}
                      <div>
                        {t.attachment ? (
                          <button 
                            onClick={() => setPreviewAttachment(t.attachment)}
                            className="text-primary hover:text-primary-container p-1 rounded-lg hover:bg-primary/5 transition-all flex items-center gap-1 font-semibold text-[11px]"
                          >
                            <span className="material-symbols-outlined text-[16px]">description</span>
                            <span>Receipt</span>
                          </button>
                        ) : (
                          <span className="text-on-surface-variant/30 text-[10px] italic">No receipt</span>
                        )}
                      </div>

                      {/* Right: Edit / Delete */}
                      {!isReadOnly && (
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => handleOpenEdit(t)}
                            className="p-1.5 text-on-surface-variant hover:text-primary rounded-lg hover:bg-surface-variant/40 transition-colors flex items-center justify-center"
                            title="Edit transaction"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </button>
                          <button 
                            onClick={() => handleDeleteClick(t)}
                            className="p-1.5 text-on-surface-variant hover:text-error rounded-lg hover:bg-error-container/40 transition-colors flex items-center justify-center"
                            title="Delete transaction"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination controls */}
            <div className="bg-surface-container-low border-t border-outline-variant/30 p-4 flex items-center justify-between mt-auto">
              <div className="text-xs text-on-surface-variant">
                Showing {((page - 1) * limit) + 1}-{Math.min(page * limit, txs.length)} of {txs.length} entries
              </div>
              <div className="flex items-center gap-2">
                <button 
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-variant hover:text-on-surface transition-colors disabled:opacity-30"
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <div className="flex gap-1 text-xs font-semibold">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button 
                      key={i}
                      onClick={() => setPage(i + 1)}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                        page === i + 1 
                          ? 'bg-primary text-on-primary' 
                          : 'text-on-surface-variant hover:bg-surface-variant hover:text-on-surface'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button 
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                  className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-variant hover:text-on-surface transition-colors disabled:opacity-30"
                >
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* FLOAT ACTION BUTTON FOR ADD TRANSACTION (MOBILE/DESKTOP ALTERNATIVE) */}
      {!isReadOnly && !formOpen && !hideHeader && (
        <button 
          onClick={handleOpenAdd}
          className="fixed bottom-20 right-4 md:bottom-6 md:right-6 lg:right-10 z-40 flex items-center justify-center gap-1.5 px-5 py-3.5 bg-primary text-on-primary rounded-full shadow-[0_8px_32px_rgba(0,109,48,0.35)] hover:shadow-[0_12px_48px_rgba(0,109,48,0.55)] hover:-translate-y-0.5 transition-all duration-300 group"
        >
          <span className="material-symbols-outlined text-[22px] group-hover:rotate-90 transition-transform duration-300">add</span>
          <span className="font-bold text-xs tracking-wider uppercase">New Entry</span>
        </button>
      )}

      {/* ADD / EDIT TRANSACTION DIALOG MODAL */}
      {formOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-lg mx-4 shadow-2xl p-6 relative">
            <button 
              onClick={() => setFormOpen(false)}
              className="absolute right-4 top-4 text-on-surface-variant hover:text-on-surface"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <h3 className="font-headline-lg text-headline-lg text-on-background mb-4">
              {editingTx ? 'Edit Ledger Entry' : 'Add Ledger Entry'}
            </h3>
            
            {formError && (
              <div className="mb-4 p-3 bg-error-container text-on-error-container rounded-xl text-body-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Type selector toggle */}
              <div>
                <label className="block font-label-caps text-[10px] text-on-surface-variant uppercase font-bold mb-2">Transaction Type</label>
                <div className="flex p-1 bg-surface-container-low rounded-xl relative border border-outline-variant/30">
                  <button 
                    type="button"
                    onClick={() => setTxType('In')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg text-center z-10 transition-all ${
                      txType === 'In' ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-high/50 hover:text-on-surface'
                    }`}
                  >
                    Cash In (+)
                  </button>
                  <button 
                    type="button"
                    onClick={() => setTxType('Out')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg text-center z-10 transition-all ${
                      txType === 'Out' ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-high/50 hover:text-on-surface'
                    }`}
                  >
                    Cash Out (-)
                  </button>
                </div>
              </div>

              {/* Amount and Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-label-caps text-[10px] text-on-surface-variant uppercase font-bold mb-2">Amount</label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-on-surface font-bold">{getCurrencySymbol(currentBook.currency)}</span>
                    <input 
                      type="number" 
                      value={txAmount}
                      onChange={(e) => setTxAmount(e.target.value)}
                      placeholder="0.00"
                      step="any"
                      min="0.01"
                      className="w-full bg-surface border border-outline-variant rounded-xl py-2.5 pl-7 pr-4 outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-label-caps text-[10px] text-on-surface-variant uppercase font-bold mb-2">Date</label>
                  <input 
                    type="date" 
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="w-full bg-surface border border-outline-variant rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    required
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block font-label-caps text-[10px] text-on-surface-variant uppercase font-bold mb-2">Description</label>
                <input 
                  type="text" 
                  value={txDesc}
                  onChange={(e) => setTxDesc(e.target.value)}
                  placeholder="e.g. Sales Payment, Petrol expense"
                  className="w-full bg-surface border border-outline-variant rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  required
                />
              </div>

              {/* Category and Payment Method */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-label-caps text-[10px] text-on-surface-variant uppercase font-bold mb-2">Category</label>
                  <div className="relative" ref={catDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setCatDropdownOpen(!catDropdownOpen)}
                      className="w-full bg-surface border border-outline-variant rounded-xl py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-primary flex items-center justify-between transition-all"
                    >
                      <span className="truncate">{categories.find(c => c.id === txCat)?.name || "Select Category"}</span>
                      <span className="material-symbols-outlined text-[18px] text-on-surface-variant">arrow_drop_down</span>
                    </button>

                    {catDropdownOpen && (
                      <div className="absolute left-0 mt-1.5 w-full bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl z-50 overflow-hidden flex flex-col text-xs max-h-56">
                        {/* Search Input */}
                        <div className="p-2 border-b border-outline-variant/20 bg-surface-container-low/20">
                          <input
                            type="text"
                            value={catSearchQuery}
                            onChange={(e) => setCatSearchQuery(e.target.value)}
                            placeholder="Search or add category..."
                            className="w-full px-2.5 py-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-xs outline-none focus:ring-1 focus:ring-primary focus:border-transparent"
                            autoFocus
                          />
                        </div>

                        {/* List */}
                        <div className="overflow-y-auto py-1 flex-1 max-h-36">
                          {categories
                            .filter(c => c.name.toLowerCase().includes(catSearchQuery.toLowerCase()))
                            .map((c) => {
                              const isSelected = txCat === c.id;
                              return (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => {
                                    setTxCat(c.id);
                                    setCatDropdownOpen(false);
                                    setCatSearchQuery('');
                                  }}
                                  className={`w-full text-left px-3.5 py-2 transition-colors flex items-center justify-between ${
                                    isSelected 
                                      ? 'bg-primary/10 text-primary font-bold' 
                                      : 'hover:bg-primary/5 hover:text-primary'
                                  }`}
                                >
                                  <span>{c.name}</span>
                                  {isSelected && <span className="material-symbols-outlined text-[16px] text-primary">check</span>}
                                </button>
                              );
                            })}

                          {catSearchQuery.trim() && !categories.some(c => c.name.toLowerCase() === catSearchQuery.trim().toLowerCase()) && (
                            <button
                              type="button"
                              onClick={handleCreateCustomCategory}
                              className="w-full text-left px-3.5 py-2 text-primary font-semibold hover:bg-primary/5 transition-colors border-t border-outline-variant/10 mt-1 flex items-center gap-1.5"
                            >
                              <span className="material-symbols-outlined text-[16px]">add</span>
                              <span>Add "{catSearchQuery.trim()}"</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block font-label-caps text-[10px] text-on-surface-variant uppercase font-bold mb-2">Payment Method</label>
                  <div className="relative" ref={methodDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setMethodDropdownOpen(!methodDropdownOpen)}
                      className="w-full bg-surface border border-outline-variant rounded-xl py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-primary flex items-center justify-between transition-all"
                    >
                      <span>{txMethod}</span>
                      <span className="material-symbols-outlined text-[18px] text-on-surface-variant">arrow_drop_down</span>
                    </button>

                    {methodDropdownOpen && (
                      <div className="absolute left-0 mt-1.5 w-full bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl z-50 overflow-hidden py-1 text-xs">
                        {["Cash", "Bank", "Card", "Other"].map((method) => {
                          const isSelected = txMethod === method;
                          return (
                            <button
                              key={method}
                              type="button"
                              onClick={() => {
                                  setTxMethod(method);
                                  setMethodDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3.5 py-2 transition-colors flex items-center justify-between ${
                                isSelected 
                                  ? 'bg-primary/10 text-primary font-bold' 
                                  : 'hover:bg-primary/5 hover:text-primary'
                              }`}
                            >
                              <span>{method}</span>
                              {isSelected && <span className="material-symbols-outlined text-[16px] text-primary">check</span>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block font-label-caps text-[10px] text-on-surface-variant uppercase font-bold mb-2">Note (Optional)</label>
                <textarea 
                  value={txNote}
                  onChange={(e) => setTxNote(e.target.value)}
                  placeholder="Additional transaction info..."
                  className="w-full bg-surface border border-outline-variant rounded-xl py-2 px-4 h-16 outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
                />
              </div>

              {/* File Attachment Receipt */}
              <div>
                <label className="block font-label-caps text-[10px] text-on-surface-variant uppercase font-bold mb-2">Receipt Attachment (Optional)</label>
                <div className="flex items-center gap-3">
                  <label className="px-4 py-2 border border-dashed border-outline-variant bg-surface-container-low hover:bg-surface-container rounded-lg cursor-pointer font-semibold flex items-center gap-1.5 transition-colors">
                    <span className="material-symbols-outlined text-[18px]">upload</span>
                    {uploadingFile ? 'Uploading...' : 'Choose File'}
                    <input 
                      type="file" 
                      accept="image/*,application/pdf"
                      onChange={handleFileUpload}
                      className="hidden" 
                      disabled={uploadingFile}
                    />
                  </label>
                  
                  {fileAttachment ? (
                    <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 text-primary px-3 py-1.5 rounded-lg text-xs font-semibold">
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      <span className="max-w-[150px] truncate">{fileAttachment.fileName}</span>
                      <button 
                        type="button" 
                        onClick={() => setFileAttachment(null)}
                        className="text-on-surface-variant hover:text-error ml-1"
                      >
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    </div>
                  ) : (
                    <span className="text-on-surface-variant text-[11px]">No receipt attached.</span>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-outline-variant/20 flex items-center justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setFormOpen(false)}
                  className="px-5 py-2 rounded-xl text-on-surface hover:bg-surface-container-low transition-colors font-semibold text-xs"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={uploadingFile}
                  className="px-6 py-2 rounded-xl bg-primary text-on-primary font-semibold hover:bg-primary-container hover:text-on-primary-container transition-colors text-xs"
                >
                  {editingTx ? 'Save Changes' : 'Add Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LIGHTBOX ATTACHMENT PREVIEW MODAL */}
      {previewAttachment && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-2xl mx-4 shadow-2xl p-6 relative">
            <button 
              onClick={() => setPreviewAttachment(null)}
              className="absolute right-4 top-4 text-on-surface-variant hover:text-on-surface p-1 hover:bg-surface-container rounded-full"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <h3 className="font-title-md text-title-md text-on-surface font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">description</span>
              Receipt Attachment: {previewAttachment.fileName}
            </h3>

            <div className="bg-black/5 rounded-xl border border-outline-variant/30 flex items-center justify-center min-h-[300px] max-h-[500px] overflow-hidden p-2">
              {previewAttachment.fileUrl && previewAttachment.fileUrl.startsWith('data:image') || previewAttachment.fileName.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                <img 
                  src={previewAttachment.fileUrl} 
                  alt="Receipt Preview" 
                  className="max-h-[460px] object-contain rounded-lg shadow-sm"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-center gap-4 py-16">
                  <span className="material-symbols-outlined text-[64px] text-on-surface-variant opacity-40">picture_as_pdf</span>
                  <div className="text-sm font-semibold text-on-surface">PDF / Document Attached</div>
                  <p className="text-xs text-on-surface-variant px-10">We cannot embed PDF viewers natively in this modal. Use the download action to open in a new tab.</p>
                  <a 
                    href={previewAttachment.fileUrl} 
                    download={previewAttachment.fileName}
                    target="_blank" 
                    rel="noreferrer"
                    className="px-5 py-2 bg-primary text-on-primary font-semibold text-xs rounded-xl flex items-center gap-2 shadow hover:bg-primary-container hover:text-on-primary-container transition-all"
                  >
                    <span className="material-symbols-outlined text-[16px]">download</span>
                    Download Document
                  </a>
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <button 
                onClick={() => setPreviewAttachment(null)}
                className="px-5 py-2 bg-surface-container-low hover:bg-surface-container text-on-surface font-semibold text-xs rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-app confirmation modal for deleting a transaction */}
      <ConfirmationModal
        isOpen={!!txToDelete}
        title="Delete Transaction"
        message={
          txToDelete
            ? `Are you sure you want to delete the transaction entry "${
                txToDelete.description
              }" of amount ${getCurrencySymbol(currentBook?.currency || 'INR')}${txToDelete.amount.toLocaleString()}? This action cannot be undone.`
            : ''
        }
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => setTxToDelete(null)}
        isLoading={deleteTxLoading}
      />

      {/* Floating Action Button (FAB) */}
      {!isReadOnly && (
        <button 
          onClick={handleOpenAdd}
          className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 flex items-center justify-center gap-2 px-5 py-4 bg-primary text-on-primary rounded-full shadow-2xl hover:bg-primary-container hover:text-on-primary-container hover:scale-105 active:scale-95 transition-all font-bold text-sm tracking-wide border border-primary/20"
          title="Add Transaction"
        >
          <span className="material-symbols-outlined text-[24px]">add</span>
          <span className="pr-1">Add Transaction</span>
        </button>
      )}
    </div>
  );
}
