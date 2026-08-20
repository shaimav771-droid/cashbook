import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { dbService } from '../db';
import { ConfirmationModal } from '../components';

export default function CashBooks() {
  const { user, books, currentBook, selectBook, refreshBooks, setCurrentTab, currentWorkspace } = useApp();
  
  // Local state for modals & forms
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [sharingModalOpen, setSharingModalOpen] = useState(false);
  const [selectedBookForSharing, setSelectedBookForSharing] = useState(null);

  // States for in-app deletion confirmations
  const [bookToDelete, setBookToDelete] = useState(null);
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [deleteBookLoading, setDeleteBookLoading] = useState(false);
  const [removeMemberLoading, setRemoveMemberLoading] = useState(false);
  
  // Create book states
  const [bookName, setBookName] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [createError, setCreateError] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  // Sharing members states
  const [members, setMembers] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Editor');
  const [inviteError, setInviteError] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);

  // Dynamic balances for books
  const [bookBalances, setBookBalances] = useState({});

  useEffect(() => {
    // Load balances for all books on mount
    const loadBalances = async () => {
      const balances = {};
      for (const b of books) {
        try {
          const txs = await dbService.transactions.getTransactions(b.id);
          const totalIn = txs.filter(t => t.type === 'In').reduce((sum, t) => sum + t.amount, 0);
          const totalOut = txs.filter(t => t.type === 'Out').reduce((sum, t) => sum + t.amount, 0);
          balances[b.id] = b.openingBalance + totalIn - totalOut;
        } catch (err) {
          balances[b.id] = b.openingBalance;
        }
      }
      setBookBalances(balances);
    };
    if (books.length > 0) {
      loadBalances();
    }
  }, [books]);

  const handleCreateBook = async (e) => {
    e.preventDefault();
    if (!bookName.trim()) return;
    if (!currentWorkspace) {
      setCreateError('Please select or create a workspace first.');
      return;
    }
    setCreateError('');
    setCreateLoading(true);
    try {
      const newBook = await dbService.books.createBook(bookName, currency, openingBalance, currentWorkspace);
      if (user) {
        localStorage.setItem(`cashbook_active_book_id_${user.id}_${currentWorkspace}`, newBook.id);
        localStorage.setItem(`cashbook_active_book_id_${user.id}`, newBook.id);
      }
      await refreshBooks();
      if (setCurrentTab) {
        setCurrentTab('dashboard');
      }
      setCreateModalOpen(false);
      setBookName('');
      setOpeningBalance('0');
    } catch (err) {
      setCreateError(err.message || 'Failed to create book.');
    } finally {
      setCreateLoading(false);
    }
  };

  const openSharingModal = async (book) => {
    setSelectedBookForSharing(book);
    setInviteError('');
    setInviteEmail('');
    setSharingModalOpen(true);
    await loadMembers(book.id);
  };

  const loadMembers = async (bookId) => {
    try {
      const list = await dbService.books.getBookMembers(bookId);
      setMembers(list);
    } catch (err) {
      console.error("Error loading members:", err);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteError('');
    setInviteLoading(true);
    try {
      await dbService.books.shareBook(selectedBookForSharing.id, inviteEmail, inviteRole);
      await loadMembers(selectedBookForSharing.id);
      setInviteEmail('');
    } catch (err) {
      setInviteError(err.message || 'Failed to invite collaborator.');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await dbService.books.updateBookMemberRole(selectedBookForSharing.id, userId, newRole);
      await loadMembers(selectedBookForSharing.id);
    } catch (err) {
      alert(err.message || 'Failed to update role.');
    }
  };

  const handleRemoveMemberClick = (member) => {
    setMemberToRemove(member);
  };

  const handleConfirmRemoveMember = async () => {
    if (!memberToRemove || !selectedBookForSharing) return;
    setRemoveMemberLoading(true);
    try {
      await dbService.books.removeBookMember(selectedBookForSharing.id, memberToRemove.userId);
      await loadMembers(selectedBookForSharing.id);
      setMemberToRemove(null);
    } catch (err) {
      alert(err.message || 'Failed to remove member.');
    } finally {
      setRemoveMemberLoading(false);
    }
  };

  const handleDeleteBookClick = (bookId, name) => {
    setBookToDelete({ id: bookId, name });
  };

  const handleConfirmDeleteBook = async () => {
    if (!bookToDelete) return;
    setDeleteBookLoading(true);
    try {
      await dbService.books.deleteBook(bookToDelete.id);
      await refreshBooks();
      setBookToDelete(null);
    } catch (err) {
      alert(err.message || 'Failed to delete book.');
    } finally {
      setDeleteBookLoading(false);
    }
  };

  const getCurrencySymbol = (curr) => {
    switch (curr) {
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'GBP': return '£';
      default: return '₹';
    }
  };

  return (
    <div className="flex flex-col relative w-full gap-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-background">Cash Books</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">Manage your digital ledgers and collaboration channels.</p>
        </div>
        <button 
          onClick={() => {
            if (!currentWorkspace) {
              alert('Please select or create a workspace first using the top navbar dropdown.');
              return;
            }
            setCreateModalOpen(true);
          }}
          className="bg-primary text-on-primary font-bold px-5 py-2.5 rounded-xl hover:bg-primary-container hover:text-on-primary-container transition-all flex items-center justify-center gap-2 shadow-sm self-start"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          New Cash Book
        </button>
      </div>

      {/* Books List Grid */}
      {!currentWorkspace ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-surface-container-lowest border border-outline-variant/30 rounded-2xl text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
            <span className="material-symbols-outlined text-[32px]">folder</span>
          </div>
          <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold mb-2">No Workspace Selected</h3>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-sm mb-6">
            Please select or create a workspace first using the top navbar dropdown.
          </p>
        </div>
      ) : books.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-surface-container-lowest border border-outline-variant/30 rounded-2xl text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
            <span className="material-symbols-outlined text-[32px]">menu_book</span>
          </div>
          <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold mb-2">No Cash Books Found</h3>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-sm mb-6">
            There are no cash books in the <span className="font-semibold text-primary">"{currentWorkspace}"</span> workspace yet. Create one to start managing your cash flow.
          </p>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="bg-primary text-on-primary font-bold px-5 py-2.5 rounded-xl hover:bg-primary-container hover:text-on-primary-container transition-all flex items-center gap-2 shadow-sm"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            Create First Book
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {books.map((book) => {
            const balance = bookBalances[book.id] !== undefined ? bookBalances[book.id] : book.openingBalance;
            const symbol = getCurrencySymbol(book.currency);
            const isActive = currentBook?.id === book.id;

            return (
              <div 
                key={book.id}
                className={`bg-surface-container-lowest rounded-2xl border transition-all duration-300 relative overflow-hidden group flex flex-col justify-between ${
                  isActive 
                    ? 'ring-2 ring-primary border-transparent shadow-md' 
                    : 'border-outline-variant/30 hover:border-primary/30 hover:shadow-lg'
                }`}
              >
                {/* Highlight bar */}
                <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${
                  isActive ? 'from-primary to-inverse-primary' : 'from-outline-variant/40 to-outline-variant/20'
                }`}></div>

                <div className="p-6 flex-1 flex flex-col justify-between gap-6">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1 text-[10px] uppercase font-bold tracking-wider text-on-surface-variant font-label-caps">
                          <span className="material-symbols-outlined text-[12px]">account_balance</span>
                          Role: {book.role}
                        </div>
                        <h2 className="font-title-md text-title-md text-on-surface font-bold leading-tight group-hover:text-primary transition-colors">
                          {book.name}
                        </h2>
                      </div>
                      {book.role?.toLowerCase() === 'owner' && (
                        <button 
                          onClick={() => handleDeleteBookClick(book.id, book.name)}
                          className="text-on-surface-variant hover:text-error p-1 rounded hover:bg-surface-container-low transition-colors"
                          title="Delete Book"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      )}
                    </div>

                    <div className="bg-surface-container-low p-3 rounded-xl flex items-center justify-between text-xs mb-4">
                      <div>
                        <span className="text-on-surface-variant">Currency</span>
                        <div className="font-bold text-on-surface text-sm mt-0.5">{book.currency} ({symbol})</div>
                      </div>
                      <div className="text-right">
                        <span className="text-on-surface-variant">Opening Balance</span>
                        <div className="font-bold text-on-surface text-sm mt-0.5">{symbol}{book.openingBalance.toLocaleString()}</div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-end border-t border-outline-variant/30 pt-4 mb-4">
                      <span className="text-xs text-on-surface-variant">Current Balance</span>
                      <div className={`text-headline-lg font-bold tracking-tight ${balance >= 0 ? 'text-primary' : 'text-error'}`}>
                        {balance < 0 ? '-' : ''}{symbol}{Math.abs(balance).toLocaleString()}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2">
                      <button 
                        onClick={() => openSharingModal(book)}
                        className="text-primary border border-primary/20 hover:bg-primary/5 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[14px]">share</span>
                        {book.role?.toLowerCase() === 'owner' ? 'Manage Sharing' : 'View Members'}
                      </button>

                      <button 
                        onClick={() => {
                          selectBook(book);
                          setCurrentTab('dashboard');
                        }}
                        className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                          isActive 
                            ? 'bg-primary text-on-primary' 
                            : 'bg-surface-container-low text-on-surface hover:bg-primary hover:text-on-primary'
                        }`}
                      >
                        <span>View</span>
                        <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE BOOK MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-md mx-4 shadow-2xl p-6 relative">
            <button 
              onClick={() => setCreateModalOpen(false)}
              className="absolute right-4 top-4 text-on-surface-variant hover:text-on-surface"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <h3 className="font-headline-lg text-headline-lg text-on-background mb-4">Create Cash Book</h3>
            
            {createError && (
              <div className="mb-4 p-3 bg-error-container text-on-error-container rounded-xl text-body-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateBook} className="space-y-4">
              <div>
                <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2">Book Name</label>
                <input 
                  type="text" 
                  value={bookName}
                  onChange={(e) => setBookName(e.target.value)}
                  placeholder="e.g. Apta Demo"
                  className="w-full px-4 py-2.5 rounded-xl border border-outline-variant bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2">Currency</label>
                  <select 
                    value={currency} 
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-outline-variant bg-surface focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  >
                    <option value="INR">₹ (INR)</option>
                    <option value="USD">$ (USD)</option>
                    <option value="EUR">€ (EUR)</option>
                    <option value="GBP">£ (GBP)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2">Opening Balance</label>
                  <input 
                    type="number" 
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                    min="0"
                    className="w-full px-4 py-2.5 rounded-xl border border-outline-variant bg-surface focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                    required
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-on-surface hover:bg-surface-container-low transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={createLoading}
                  className="px-6 py-2 rounded-xl bg-primary text-on-primary font-semibold hover:bg-primary-container hover:text-on-primary-container transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {createLoading ? 'Creating...' : 'Create Book'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SHARING / COLLABORATION MODAL */}
      {sharingModalOpen && selectedBookForSharing && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-lg mx-4 shadow-2xl p-6 relative">
            <button 
              onClick={() => setSharingModalOpen(false)}
              className="absolute right-4 top-4 text-on-surface-variant hover:text-on-surface"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <h3 className="font-headline-lg text-headline-lg text-on-background mb-1">Book Collaboration</h3>
            <p className="text-xs text-on-surface-variant mb-4">Manage access controls for ledger book: <span className="font-bold text-on-surface">{selectedBookForSharing.name}</span></p>
            
            {/* Invite Collaborator Form (Owner Only) */}
            {selectedBookForSharing.role?.toLowerCase() === 'owner' ? (
              <div className="mb-6 bg-surface-container-low p-4 rounded-xl border border-outline-variant/30">
                <div className="font-semibold text-xs text-on-surface mb-2 font-label-caps uppercase tracking-wider">Invite New Member</div>
                
                {inviteError && (
                  <div className="mb-3 p-2 bg-error-container text-on-error-container rounded-lg text-xs flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">error</span>
                    {inviteError}
                  </div>
                )}

                <form onSubmit={handleInvite} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="block text-[10px] font-semibold text-on-surface-variant uppercase mb-1">Email Address</label>
                    <input 
                      type="email" 
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="editor@example.com"
                      className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest text-xs outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
                      required
                    />
                  </div>

                  <div className="w-28">
                    <label className="block text-[10px] font-semibold text-on-surface-variant uppercase mb-1">Role Type</label>
                    <select 
                      value={inviteRole} 
                      onChange={(e) => setInviteRole(e.target.value)}
                      className="w-full px-2 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest text-xs focus:outline-none"
                    >
                      <option value="Editor">Editor</option>
                      <option value="Viewer">Viewer</option>
                    </select>
                  </div>

                  <button 
                    type="submit" 
                    disabled={inviteLoading}
                    className="bg-primary text-on-primary px-4 py-2.5 rounded-lg text-xs font-semibold hover:bg-primary-container hover:text-on-primary-container disabled:opacity-50 transition-colors"
                  >
                    {inviteLoading ? 'Inviting...' : 'Invite'}
                  </button>
                </form>
              </div>
            ) : (
              <div className="mb-4 p-3 bg-surface-container-low rounded-lg text-xs text-on-surface-variant">
                Only the cash book owner can invite new members or change collaboration permissions.
              </div>
            )}

            {/* Current Members List */}
            <div>
              <div className="font-semibold text-xs text-on-surface mb-3 font-label-caps uppercase tracking-wider">Active Collaborators ({members.length})</div>
              
              <div className="max-h-60 overflow-y-auto space-y-3">
                {members.map((member) => {
                  const isSelf = member.userId === user.id;

                  return (
                    <div key={member.userId} className="flex items-center justify-between p-3 bg-surface rounded-xl border border-outline-variant/20">
                      <div>
                        <div className="font-bold text-on-surface text-sm flex items-center gap-1.5">
                          {member.name} {isSelf && <span className="text-[10px] font-normal text-on-surface-variant">(You)</span>}
                        </div>
                        <div className="text-xs text-on-surface-variant">{member.email}</div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Role dropdown/badge */}
                        {selectedBookForSharing.role?.toLowerCase() === 'owner' && !isSelf ? (
                          <>
                            <select 
                              value={member.role}
                              onChange={(e) => handleRoleChange(member.userId, e.target.value)}
                              className="px-2 py-1 border border-outline-variant bg-surface-container-lowest rounded-md text-xs"
                            >
                              <option value="Owner">Owner</option>
                              <option value="Editor">Editor</option>
                              <option value="Viewer">Viewer</option>
                            </select>

                            <button 
                              onClick={() => handleRemoveMemberClick(member)}
                              className="text-on-surface-variant hover:text-error p-1 rounded hover:bg-surface-container-low transition-colors"
                              title="Revoke access"
                            >
                              <span className="material-symbols-outlined text-[16px]">close</span>
                            </button>
                          </>
                        ) : (
                          <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${
                            member.role?.toLowerCase() === 'owner' 
                              ? 'text-primary bg-primary/5 border-primary/10' 
                              : member.role?.toLowerCase() === 'editor' 
                              ? 'text-amber-700 bg-amber-50 border-amber-200' 
                              : 'text-slate-600 bg-slate-50 border-slate-200'
                          }`}>
                            {member.role}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-outline-variant/30 flex justify-end">
              <button 
                onClick={() => setSharingModalOpen(false)}
                className="px-5 py-2 bg-surface-container-low hover:bg-surface-container text-on-surface font-semibold text-xs rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-app confirmation modal for deleting a book */}
      <ConfirmationModal
        isOpen={!!bookToDelete}
        title="Delete Cash Book"
        message={bookToDelete ? 'Are you sure you want to delete this cash book?' : ''}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDeleteBook}
        onCancel={() => setBookToDelete(null)}
        isLoading={deleteBookLoading}
        variant="simple"
      />

      {/* In-app confirmation modal for removing a collaborator */}
      <ConfirmationModal
        isOpen={!!memberToRemove}
        title="Revoke Member Access"
        message={memberToRemove ? `Are you sure you want to remove access for "${memberToRemove.name || memberToRemove.email}"?` : ''}
        confirmText="Remove"
        cancelText="Cancel"
        onConfirm={handleConfirmRemoveMember}
        onCancel={() => setMemberToRemove(null)}
        isLoading={removeMemberLoading}
      />
    </div>
  );
}
