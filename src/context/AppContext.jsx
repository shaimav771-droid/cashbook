import React, { createContext, useContext, useState, useEffect } from 'react';
import { dbService } from '../db';
import { useAuthStore } from '../features/auth/store/authStore';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const { user, login: loginUser, signup: signupUser, logout: logoutUser } = useAuthStore();
  const [allBooks, setAllBooks] = useState([]);
  const [currentBook, setCurrentBook] = useState(null);
  const [categories, setCategories] = useState([]);
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [customWorkspaces, setCustomWorkspaces] = useState([]);
  const [txTrigger, setTxTrigger] = useState(0);

  const triggerTxUpdate = () => setTxTrigger(prev => prev + 1);
  const [currentWorkspace, setCurrentWorkspace] = useState(() => {
    return localStorage.getItem('cashbook_active_workspace') || '';
  });

  // Load custom workspaces on user change
  useEffect(() => {
    if (user) {
      try {
        const stored = localStorage.getItem(`cashbook_custom_workspaces_${user.id}`);
        if (stored) {
          setCustomWorkspaces(JSON.parse(stored) || []);
        } else {
          setCustomWorkspaces([]);
        }
      } catch (e) {
        console.error("Error loading custom workspaces:", e);
        setCustomWorkspaces([]);
      }
      
      const storedActive = localStorage.getItem(`cashbook_active_workspace_${user.id}`);
      if (storedActive) {
        setCurrentWorkspace(storedActive);
      }
    } else {
      setCustomWorkspaces([]);
      setCurrentWorkspace('');
    }
  }, [user]);

  const selectWorkspace = (workspaceName) => {
    setCurrentWorkspace(workspaceName);
    if (user) {
      localStorage.setItem(`cashbook_active_workspace_${user.id}`, workspaceName);
    }
    localStorage.setItem('cashbook_active_workspace', workspaceName);
    localStorage.setItem('activeWorkspaceId', workspaceName);

    // Immediately select currentBook for this workspace to prevent dashboard delay
    if (user && allBooks.length > 0) {
      const workspaceBooks = allBooks.filter(b => (b.workspace || '') === workspaceName);
      if (workspaceBooks.length > 0) {
        const storageKey = `cashbook_active_book_id_${user.id}_${workspaceName}`;
        const savedBookId = localStorage.getItem(storageKey);
        const match = workspaceBooks.find(b => b.id === savedBookId) || workspaceBooks[0];
        setCurrentBook(match);
        localStorage.setItem(storageKey, match.id);
        localStorage.setItem(`cashbook_active_book_id_${user.id}`, match.id);
        localStorage.setItem('activeBookId', match.id);
        loadCategories(match.id);
      } else {
        setCurrentBook(null);
        setCategories([]);
        localStorage.removeItem('activeBookId');
      }
    } else {
      setCurrentBook(null);
      setCategories([]);
      localStorage.removeItem('activeBookId');
    }
  };

  const addWorkspace = (workspaceName) => {
    const trimmed = workspaceName.trim();
    if (!trimmed || !user) return;
    
    setCustomWorkspaces(prev => {
      if (prev.includes(trimmed)) return prev;
      const updated = [...prev, trimmed];
      localStorage.setItem(`cashbook_custom_workspaces_${user.id}`, JSON.stringify(updated));
      return updated;
    });
    
    selectWorkspace(trimmed);
  };

  const books = React.useMemo(() => {
    return allBooks.filter(b => (b.workspace || '') === currentWorkspace);
  }, [allBooks, currentWorkspace]);

  const workspaces = React.useMemo(() => {
    const list = [...customWorkspaces];
    allBooks.forEach(b => {
      if (b.workspace && !list.includes(b.workspace)) {
        list.push(b.workspace);
      }
    });
    return list;
  }, [allBooks, customWorkspaces]);

  // Synchronize currentWorkspace with workspaces list
  useEffect(() => {
    if (!user) {
      setCurrentWorkspace('');
      return;
    }

    const savedWorkspace = localStorage.getItem(`cashbook_active_workspace_${user.id}`);
    
    if (workspaces.length > 0) {
      if (savedWorkspace && workspaces.includes(savedWorkspace)) {
        if (currentWorkspace !== savedWorkspace) {
          setCurrentWorkspace(savedWorkspace);
        }
      } else {
        if (!currentWorkspace || !workspaces.includes(currentWorkspace)) {
          setCurrentWorkspace(workspaces[0]);
          localStorage.setItem(`cashbook_active_workspace_${user.id}`, workspaces[0]);
        }
      }
    } else {
      setCurrentWorkspace('');
    }
  }, [workspaces, user, currentWorkspace]);

  const loadBooks = async (loggedUser) => {
    if (!loggedUser) return;
    try {
      const bookList = await dbService.books.getBooks(loggedUser.id);
      
      // If user changed during the async API call, ignore results
      if (loggedUser.id !== useAuthStore.getState().user?.id) {
        return;
      }
      
      setAllBooks(bookList);
    } catch (err) {
      console.error("Error loading books:", err);
    }
  };

  const loadCategories = async (bookId) => {
    try {
      const cats = await dbService.categories.getCategories(bookId);
      // Ensure we only set categories if this book is still active
      if (cats && cats.length > 0 && cats[0].bookId !== bookId) return;
      setCategories(cats);
    } catch (err) {
      console.error("Error loading categories:", err);
    }
  };

  const selectBook = async (book) => {
    setCurrentBook(book);
    if (user) {
      localStorage.setItem(`cashbook_active_book_id_${user.id}_${currentWorkspace}`, book.id);
      localStorage.setItem(`cashbook_active_book_id_${user.id}`, book.id);
    } else {
      localStorage.setItem('cashbook_active_book_id', book.id);
    }
    localStorage.setItem('activeBookId', book.id);
    await loadCategories(book.id);
  };

  // Synchronize currentBook based on active workspace and loaded books
  useEffect(() => {
    if (user && allBooks.length > 0) {
      const workspaceBooks = allBooks.filter(b => (b.workspace || '') === currentWorkspace);
      if (workspaceBooks.length > 0) {
        const storageKey = `cashbook_active_book_id_${user.id}_${currentWorkspace}`;
        const activeBookId = localStorage.getItem(storageKey);
        const match = workspaceBooks.find(b => b.id === activeBookId) || workspaceBooks[0];
        setCurrentBook(match);
        localStorage.setItem(storageKey, match.id);
        localStorage.setItem(`cashbook_active_book_id_${user.id}`, match.id);
        localStorage.setItem('activeBookId', match.id);
        loadCategories(match.id);
      } else {
        setCurrentBook(null);
        setCategories([]);
        localStorage.removeItem('activeBookId');
      }
    } else {
      setCurrentBook(null);
      setCategories([]);
      localStorage.removeItem('activeBookId');
    }
  }, [currentWorkspace, allBooks, user]);

  // Trigger books loading when user session is loaded/changed
  useEffect(() => {
    // Synchronously clear states immediately on user change to prevent stale display or unauthorized queries
    setAllBooks([]);
    setCurrentBook(null);
    setCategories([]);

    if (user) {
      loadBooks(user);
    }
  }, [user]);

  // Listen to LocalStorage events (for dual-tab collaboration testing)
  useEffect(() => {
    const handleStorageChange = () => {
      const storedWorkspace = localStorage.getItem('cashbook_active_workspace');
      if (storedWorkspace && storedWorkspace !== currentWorkspace) {
        setCurrentWorkspace(storedWorkspace);
      }
      if (user) {
        loadBooks(user);
        if (currentBook) {
          loadCategories(currentBook.id);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [user, currentBook, currentWorkspace]);

  return (
    <AppContext.Provider value={{
      user,
      books,
      allBooks,
      currentWorkspace,
      activeWorkspaceId: currentWorkspace,
      activeBookId: currentBook?.id || null,
      selectWorkspace,
      addWorkspace,
      workspaces,
      currentBook,
      categories,
      currentTab,
      setCurrentTab,
      loginUser,
      signupUser,
      logoutUser,
      selectBook,
      refreshBooks: () => loadBooks(user),
      refreshCategories: () => loadCategories(currentBook?.id),
      txTrigger,
      triggerTxUpdate
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
