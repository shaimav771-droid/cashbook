import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { dbService } from '../db';

export default function Header({ onMenuClick }) {
  const { 
    user, 
    books, 
    currentBook, 
    selectBook, 
    logoutUser, 
    refreshBooks, 
    setCurrentTab,
    currentWorkspace,
    selectWorkspace,
    addWorkspace,
    workspaces
  } = useApp();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [workspaceDropdownOpen, setWorkspaceDropdownOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [workspaceModalOpen, setWorkspaceModalOpen] = useState(false);
  const [workspaceError, setWorkspaceError] = useState('');
  
  // New book form state
  const [bookName, setBookName] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateBook = async (e) => {
    e.preventDefault();
    if (!bookName.trim()) return;
    if (!currentWorkspace) {
      setError('Please select or create a workspace first.');
      return;
    }
    setError('');
    setLoading(true);
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
      setError(err.message || 'Failed to create book.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorkspace = (e) => {
    e.preventDefault();
    const name = newWorkspaceName.trim();
    if (!name) return;
    
    if (workspaces.some(ws => ws.toLowerCase() === name.toLowerCase())) {
      setWorkspaceError('Workspace/Category already exists.');
      return;
    }
    
    addWorkspace(name);
    setNewWorkspaceName('');
    setWorkspaceError('');
    setWorkspaceModalOpen(false);
  };

  const getRoleColor = (role) => {
    const r = role?.toLowerCase();
    switch (r) {
      case 'owner': return 'text-primary bg-primary/10 border-primary/20';
      case 'editor': return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'viewer': return 'text-slate-600 bg-slate-50 border-slate-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  const getDisplayRole = (role) => {
    if (!role) return '';
    return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 h-[72px] bg-surface-container-lowest border-b border-outline-variant z-50 px-3 sm:px-6 flex items-center justify-between shadow-sm">
        {/* Left Section: Logo, Hamburger and Book Switcher */}
        <div className="flex items-center gap-1.5 sm:gap-4 overflow-hidden">
          <button 
            onClick={onMenuClick}
            className="lg:hidden p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors"
            aria-label="Toggle Sidebar"
          >
            <span className="material-symbols-outlined text-[24px]">menu</span>
          </button>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <img 
              alt="CashBook Logo" 
              className="h-7 w-auto sm:h-8 object-contain" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBJm-CmABP0LkKzZyWNdTo-FpbY89aEe6vMmDzfu43y67Lp2A06BOgMnSjRbDiXaXIm3MF-lwh6TBIu68EFIXn3JU6PCje8eKjG0kgfbNl1yNRs0rOOF4lgr5o-Lxd4A2PueiyQbbjZFd0uFutPn4hkrugL9e9jatj3O0GBfhkCpddXOS4Ja_RwuZYWKpaw1iTr_22dsTJ8RG4_-b--Hbd8QpRV7Y212iiOGwbiR6HBt-ETLFXTVYVK"
            />
            <span className="hidden md:block font-headline-lg text-headline-lg text-primary select-none mr-1 sm:mr-2">CashBook</span>
          </div>

          {/* Workspace Switcher */}
          <div className="relative">
            <div 
              onClick={() => setWorkspaceDropdownOpen(!workspaceDropdownOpen)}
              className="flex items-center gap-1 sm:gap-2 cursor-pointer px-2 sm:px-3.5 py-1.5 bg-surface-container-low rounded-lg border border-outline-variant hover:bg-surface-container/50 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px] sm:text-[18px] text-primary">add</span>
              <span className="text-xs sm:text-sm text-on-surface font-semibold max-w-[65px] sm:max-w-[120px] md:max-w-none truncate">{currentWorkspace || 'Select Workspace'}</span>
              <span className="material-symbols-outlined text-on-surface-variant text-[16px] sm:text-[20px]">arrow_drop_down</span>
            </div>

            {workspaceDropdownOpen && (
              <div className="absolute left-0 mt-2 w-56 sm:w-64 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl z-50 py-2">
                <div className="px-4 py-2 font-label-caps text-label-caps text-on-surface-variant border-b border-outline-variant">Workspaces</div>
                
                <div className="max-h-60 overflow-y-auto py-1">
                  {workspaces.length === 0 ? (
                    <div className="px-4 py-3 text-center text-body-xs text-on-surface-variant italic">
                      No workspaces created
                    </div>
                  ) : (
                    workspaces.map((ws) => (
                      <button
                        key={ws}
                        onClick={() => {
                          selectWorkspace(ws);
                          setWorkspaceDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 font-body-sm text-body-sm flex items-center justify-between hover:bg-surface-container-low transition-colors ${currentWorkspace === ws ? 'bg-primary/5 text-primary font-semibold' : 'text-on-surface'}`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px]">folder</span>
                          {ws}
                        </span>
                        {currentWorkspace === ws && (
                          <span className="material-symbols-outlined text-primary text-[16px]">check</span>
                        )}
                      </button>
                    ))
                  )}
                </div>
                
                <div className="border-t border-outline-variant pt-2 px-2">
                  <button
                    onClick={() => {
                      setWorkspaceModalOpen(true);
                      setWorkspaceDropdownOpen(false);
                    }}
                    className="w-full py-2 px-3 rounded-lg text-primary hover:bg-primary/5 text-left font-body-sm text-body-sm font-semibold flex items-center gap-2 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    + Add New Workspace/Category
                  </button>
                </div>
              </div>
            )}
          </div>

          {currentBook && (
            <div className="relative">
              <div 
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="ml-1 sm:ml-4 flex items-center gap-1 sm:gap-2 cursor-pointer px-2 sm:px-4 py-1.5 bg-surface-container-low rounded-lg border border-outline-variant hover:bg-surface-container/50 transition-colors"
              >
                <span className="text-xs sm:text-sm text-on-surface font-semibold max-w-[65px] sm:max-w-[120px] md:max-w-none truncate">{currentBook.name}</span>
                <span className="material-symbols-outlined text-on-surface-variant text-[16px] sm:text-[20px]">arrow_drop_down</span>
              </div>

              {dropdownOpen && (
                <div className="absolute left-1 sm:left-4 mt-2 w-56 sm:w-64 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl z-50 py-2">
                  <div className="px-4 py-2 font-label-caps text-label-caps text-on-surface-variant border-b border-outline-variant">Switch CashBook</div>
                  
                  <div className="max-h-60 overflow-y-auto py-1">
                    {books.map((book) => (
                      <button
                        key={book.id}
                        onClick={() => {
                          selectBook(book);
                          setDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 font-body-sm text-body-sm flex items-center justify-between hover:bg-surface-container-low transition-colors ${currentBook.id === book.id ? 'bg-primary/5 text-primary font-semibold' : 'text-on-surface'}`}
                      >
                        <span className="truncate mr-2">{book.name}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border shrink-0 ${getRoleColor(book.role)}`}>
                          {getDisplayRole(book.role)}
                        </span>
                      </button>
                    ))}
                  </div>
                  
                  <div className="border-t border-outline-variant pt-2 px-2">
                    <button
                      onClick={() => {
                        setCreateModalOpen(true);
                        setDropdownOpen(false);
                      }}
                      className="w-full py-2 px-3 rounded-lg text-primary hover:bg-primary/5 text-left font-body-sm text-body-sm font-semibold flex items-center gap-2 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">add</span>
                      Create New Book
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
 
        {/* Right Section: User Profile & Actions */}
        <div className="flex items-center gap-2 sm:gap-4 relative shrink-0">
          {currentBook && (
            <div className={`hidden md:inline-flex items-center border px-3 py-1 rounded-full text-xs font-semibold ${getRoleColor(currentBook.role)}`}>
              {getDisplayRole(currentBook.role)} View
            </div>
          )}

          {user && (
            <div className="relative">
              <div 
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-1.5 sm:gap-3 cursor-pointer select-none group"
              >
                <div className="text-right hidden sm:block">
                  <div className="font-title-md text-title-md text-on-surface font-semibold group-hover:text-primary transition-colors">{user.name}</div>
                  <div className="font-label-caps text-label-caps text-on-surface-variant">{user.email}</div>
                </div>
                <img 
                  alt="Profile" 
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-primary/20 group-hover:ring-primary transition-all duration-300"
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200"
                />
              </div>

              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl z-50 py-2">
                  <button
                    onClick={() => {
                      logoutUser();
                      setProfileDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2.5 font-body-sm text-body-sm text-error hover:bg-error/5 flex items-center gap-2 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* CREATE NEW BOOK MODAL */}
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
            
            {error && (
              <div className="mb-4 p-3 bg-error-container text-on-error-container rounded-xl text-body-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                {error}
              </div>
            )}

            <form onSubmit={handleCreateBook} className="space-y-4">
              <div>
                <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2">Book Name</label>
                <input 
                  type="text" 
                  value={bookName}
                  onChange={(e) => setBookName(e.target.value)}
                  placeholder="e.g. Personal Expenses, Shop ledger"
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
                  className="px-4 py-2 rounded-xl text-on-surface hover:bg-surface-container-low transition-colors font-title-md text-body-md"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="px-6 py-2 rounded-xl bg-primary text-on-primary font-title-md text-body-md hover:bg-primary-container hover:text-on-primary-container transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? 'Creating...' : 'Create Book'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD NEW WORKSPACE/CATEGORY MODAL */}
      {workspaceModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-md mx-4 shadow-2xl p-6 relative">
            <button 
              onClick={() => {
                setWorkspaceModalOpen(false);
                setWorkspaceError('');
                setNewWorkspaceName('');
              }}
              className="absolute right-4 top-4 text-on-surface-variant hover:text-on-surface"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <h3 className="font-headline-lg text-headline-lg text-on-background mb-4">Add Workspace / Category</h3>
            
            {workspaceError && (
              <div className="mb-4 p-3 bg-error-container text-on-error-container rounded-xl text-body-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                {workspaceError}
              </div>
            )}

            <form onSubmit={handleCreateWorkspace} className="space-y-4">
              <div>
                <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2">Workspace Name</label>
                <input 
                  type="text" 
                  value={newWorkspaceName}
                  onChange={(e) => {
                    setNewWorkspaceName(e.target.value);
                    setWorkspaceError('');
                  }}
                  placeholder="e.g. Shop, Office, Trip"
                  className="w-full px-4 py-2.5 rounded-xl border border-outline-variant bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-on-surface"
                  required
                  autoFocus
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => {
                    setWorkspaceModalOpen(false);
                    setWorkspaceError('');
                    setNewWorkspaceName('');
                  }}
                  className="px-4 py-2 rounded-xl text-on-surface hover:bg-surface-container-low transition-colors font-title-md text-body-md"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2 rounded-xl bg-primary text-on-primary font-title-md text-body-md hover:bg-primary-container hover:text-on-primary-container transition-colors"
                >
                  Add Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
