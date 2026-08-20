import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { dbService } from '../db';
import { ConfirmationModal } from '../components';

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

export default function Transactions({ hideHeader = false }) {
  const { currentBook, categories } = useApp();
  
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
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateRangeLabel, setDateRangeLabel] = useState('All Time');
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);

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
    if (!currentBook) return;
    setLoading(true);
    try {
      const filters = {
        search,
        type: typeFilter,
        categoryId: catFilter,
        paymentMethod: methodFilter,
        startDate,
        endDate
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
  }, [currentBook, search, typeFilter, catFilter, methodFilter, startDate, endDate]);

  useEffect(() => {
    // Set default category when categories load
    if (categories.length > 0 && !txCat) {
      setTxCat(categories[0].id);
    }
  }, [categories]);

  // Handle Preset Date Filter clicks
  const applyPresetDate = (preset) => {
    const today = new Date();
    let start = '';
    let end = today.toISOString().split('T')[0];

    switch (preset) {
      case 'today':
        start = end;
        setDateRangeLabel('Today');
        break;
      case '30days':
        const d30 = new Date();
        d30.setDate(today.getDate() - 30);
        start = d30.toISOString().split('T')[0];
        setDateRangeLabel('Last 30 Days');
        break;
      case '90days':
        const d90 = new Date();
        d90.setDate(today.getDate() - 90);
        start = d90.toISOString().split('T')[0];
        setDateRangeLabel('Last 90 Days');
        break;
      case 'all':
      default:
        start = '';
        end = '';
        setDateRangeLabel('All Time');
        break;
    }
    setStartDate(start);
    setEndDate(end);
    setDateDropdownOpen(false);
    setPage(1);
  };

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
      await loadTransactions();
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
      await loadTransactions();
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

  return (
    <div className="flex flex-col gap-6 w-full relative">
      {/* Top Section: Title & Actions */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        {!hideHeader && (
          <div>
            <h1 className="font-headline-lg text-headline-lg text-primary select-none">Transactions</h1>
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

          {/* Date presets selector */}
          <div className="relative">
            <button 
              onClick={() => setDateDropdownOpen(!dateDropdownOpen)}
              className="flex items-center gap-1.5 px-4 py-2 bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-sm text-xs font-semibold hover:shadow-md transition-all"
            >
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant">calendar_month</span>
              <span>{dateRangeLabel}</span>
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant">arrow_drop_down</span>
            </button>

            {dateDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl z-50 py-1 text-xs">
                <button onClick={() => applyPresetDate('all')} className="w-full text-left px-4 py-2 hover:bg-surface-container-low">All Time</button>
                <button onClick={() => applyPresetDate('today')} className="w-full text-left px-4 py-2 hover:bg-surface-container-low">Today</button>
                <button onClick={() => applyPresetDate('30days')} className="w-full text-left px-4 py-2 hover:bg-surface-container-low">Last 30 Days</button>
                <button onClick={() => applyPresetDate('90days')} className="w-full text-left px-4 py-2 hover:bg-surface-container-low">Last 90 Days</button>
              </div>
            )}
          </div>

          {/* Extra filter trigger */}
          <button 
            onClick={() => setFilterPanelOpen(!filterPanelOpen)}
            className={`flex items-center gap-1.5 px-4 py-2 bg-surface-container-lowest rounded-xl border shadow-sm text-xs font-semibold hover:shadow-md transition-all ${
              filterPanelOpen || typeFilter || catFilter || methodFilter || startDate || endDate
                ? 'border-primary text-primary bg-primary/5' 
                : 'border-outline-variant/30 text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">filter_list</span>
            <span>Filter</span>
          </button>

          {/* Add transaction float-trigger */}
          {!isReadOnly && (
            <button 
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-on-primary rounded-xl shadow-md hover:shadow-lg hover:bg-primary-container hover:text-on-primary-container transition-all font-semibold text-xs"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>Add Transaction</span>
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {(filterPanelOpen || typeFilter || catFilter || methodFilter || startDate || endDate) && (
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
            <div className="flex-1 w-full">
              <label className="block font-label-caps text-[10px] text-on-surface-variant uppercase font-bold mb-1.5">Date Range</label>
              <div className="flex gap-1.5 items-center w-full">
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => { setStartDate(e.target.value); setDateRangeLabel('Custom'); setPage(1); }}
                  className="flex-1 w-full p-2 border border-outline-variant bg-surface rounded-lg outline-none text-xs"
                />
                <span className="text-on-surface-variant shrink-0">-</span>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => { setEndDate(e.target.value); setDateRangeLabel('Custom'); setPage(1); }}
                  className="flex-1 w-full p-2 border border-outline-variant bg-surface rounded-lg outline-none text-xs"
                />
              </div>
            </div>
            
            <button 
              onClick={() => {
                setTypeFilter('');
                setCatFilter('');
                setMethodFilter('');
                setStartDate('');
                setEndDate('');
                setDateRangeLabel('All Time');
                setPage(1);
              }}
              className="p-2 border border-error-red/20 text-error-red hover:bg-error-container hover:text-on-error-container rounded-lg shrink-0"
              title="Reset Filters"
            >
              <span className="material-symbols-outlined text-[18px]">filter_alt_off</span>
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

            {/* Mobile view (card list) */}
            <div className="block md:hidden divide-y divide-outline-variant/20">
              {displayedTxs.map((t) => {
                const symbol = getCurrencySymbol(currentBook.currency);
                const isCashIn = t.type === 'In';
                const catName = getCategoryName(t.categoryId);
                const catIcon = getCategoryIcon(catName);

                return (
                  <div key={t.id} className="p-4 flex flex-col gap-3 hover:bg-surface-container-low/40 transition-colors">
                    {/* Top Row: Date & Type */}
                    <div className="flex justify-between items-center">
                      <span className="font-mono-data text-on-surface-variant font-medium text-[11px]">
                        {new Date(t.date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isCashIn ? 'bg-[#E8F5E9] text-[#2E7D32]' : 'bg-[#FFEBEE] text-[#C62828]'
                      }`}>
                        {isCashIn ? 'Cash In' : 'Cash Out'}
                      </span>
                    </div>

                    {/* Middle Row: Description & Amount */}
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-on-surface leading-snug break-words">{t.description}</div>
                        {t.note && <div className="text-on-surface-variant text-[11px] mt-1 break-words">{t.note}</div>}
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-surface-variant text-on-surface rounded-full text-[10px] font-medium border border-outline-variant/20">
                            <span className="material-symbols-outlined text-[12px]">{catIcon}</span>
                            {catName}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-surface-variant text-on-surface-variant rounded-full text-[10px] font-medium border border-outline-variant/20">
                            {t.paymentMethod}
                          </span>
                        </div>
                      </div>

                      <div className={`font-mono-data font-bold text-base shrink-0 text-right ${
                        isCashIn ? 'text-[#2E7D32]' : 'text-[#C62828]'
                      }`}>
                        {isCashIn ? '+' : '-'}{symbol}{t.amount.toLocaleString()}
                      </div>
                    </div>

                    {/* Bottom Row: Actions (Receipt & CRUD) */}
                    <div className="flex items-center justify-between border-t border-outline-variant/10 pt-2 mt-1">
                      {/* Left: Receipt Preview */}
                      <div>
                        {t.attachment ? (
                          <button 
                            onClick={() => setPreviewAttachment(t.attachment)}
                            className="text-primary hover:text-primary-container p-2 -ml-2 rounded-lg hover:bg-primary/5 transition-all flex items-center gap-1 font-semibold"
                          >
                            <span className="material-symbols-outlined text-[20px]">description</span>
                            <span className="text-[11px]">View Receipt</span>
                          </button>
                        ) : (
                          <span className="text-on-surface-variant/40 text-[11px] italic">No receipt</span>
                        )}
                      </div>

                      {/* Right: Edit / Delete */}
                      {!isReadOnly && (
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => handleOpenEdit(t)}
                            className="p-2.5 text-on-surface-variant hover:text-primary rounded-xl hover:bg-surface-variant/60 transition-colors flex items-center justify-center min-w-[40px] min-h-[40px]"
                            title="Edit transaction"
                          >
                            <span className="material-symbols-outlined text-[20px]">edit</span>
                          </button>
                          <button 
                            onClick={() => handleDeleteClick(t)}
                            className="p-2.5 text-on-surface-variant hover:text-error rounded-xl hover:bg-error-container/60 transition-colors flex items-center justify-center min-w-[40px] min-h-[40px]"
                            title="Delete transaction"
                          >
                            <span className="material-symbols-outlined text-[20px]">delete</span>
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
          className="fixed bottom-6 right-6 lg:right-10 z-40 flex items-center justify-center gap-1.5 px-5 py-3.5 bg-primary text-on-primary rounded-full shadow-[0_8px_32px_rgba(0,109,48,0.35)] hover:shadow-[0_12px_48px_rgba(0,109,48,0.55)] hover:-translate-y-0.5 transition-all duration-300 group"
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
                <div className="flex p-1 bg-surface-container-low rounded-xl relative">
                  <button 
                    type="button"
                    onClick={() => setTxType('In')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg text-center z-10 transition-all ${
                      txType === 'In' ? 'bg-[#E8F5E9] text-[#2E7D32] shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    Cash In (+)
                  </button>
                  <button 
                    type="button"
                    onClick={() => setTxType('Out')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg text-center z-10 transition-all ${
                      txType === 'Out' ? 'bg-[#FFEBEE] text-[#C62828] shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
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
                  <select 
                    value={txCat} 
                    onChange={(e) => setTxCat(e.target.value)}
                    className="w-full bg-surface border border-outline-variant rounded-xl py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                    required
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-label-caps text-[10px] text-on-surface-variant uppercase font-bold mb-2">Payment Method</label>
                  <select 
                    value={txMethod} 
                    onChange={(e) => setTxMethod(e.target.value)}
                    className="w-full bg-surface border border-outline-variant rounded-xl py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank">Bank</option>
                    <option value="Card">Card</option>
                    <option value="Other">Other</option>
                  </select>
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
    </div>
  );
}
