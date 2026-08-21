import { createClient } from '@supabase/supabase-js';

// Get env keys (Vite convention)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const useSupabase = !!(supabaseUrl && supabaseAnonKey && supabaseUrl !== 'YOUR_SUPABASE_URL');

export const supabase = useSupabase ? createClient(supabaseUrl, supabaseAnonKey) : null;

if (useSupabase) {
  console.log("Supabase backend active.");
} else {
  console.log("LocalStorage mock backend active.");
}

// ----------------------------------------------------
// LOCALSTORAGE MOCK IMPLEMENTATION (FALLBACK)
// ----------------------------------------------------

const DEFAULT_CATEGORIES = [
  "Sales", "Salary", "Food", "Travel", "Office", "Other"
];

const SEED_DATA = {
  users: [
    { id: "user-1", name: "Jane Doe", email: "owner@example.com", password: "password" },
    { id: "user-2", name: "Nihal Kumar", email: "editor@example.com", password: "password" },
    { id: "user-3", name: "Sarah Jenkins", email: "viewer@example.com", password: "password" }
  ],
  books: [
    { id: "book-1", name: "Apta Office", ownerId: "user-1", currency: "INR", openingBalance: 10000, workspace: "Personal" }
  ],
  book_members: [
    { bookId: "book-1", userId: "user-1", role: "Owner" },
    { bookId: "book-1", userId: "user-2", role: "Editor" },
    { bookId: "book-1", userId: "user-3", role: "Viewer" }
  ],
  categories: [
    { id: "cat-1", bookId: "book-1", name: "Sales" },
    { id: "cat-2", bookId: "book-1", name: "Salary" },
    { id: "cat-3", bookId: "book-1", name: "Food" },
    { id: "cat-4", bookId: "book-1", name: "Travel" },
    { id: "cat-5", bookId: "book-1", name: "Fuel" },
    { id: "cat-6", bookId: "book-1", name: "Office" },
    { id: "cat-7", bookId: "book-1", name: "Marketing" },
    { id: "cat-8", bookId: "book-1", name: "Purchase" },
    { id: "cat-9", bookId: "book-1", name: "Refund" },
    { id: "cat-10", bookId: "book-1", name: "Other" }
  ],
  transactions: [
    { id: "tx-1", bookId: "book-1", type: "In", amount: 15000, date: "2026-08-19", description: "Client Payment - Project X", categoryId: "cat-1", paymentMethod: "Bank", note: "Received for milestone 1", attachment: null },
    { id: "tx-2", bookId: "book-1", type: "Out", amount: 2450, date: "2026-08-18", description: "Office Supplies", categoryId: "cat-6", paymentMethod: "Card", note: "Paper, pens and folders", attachment: null },
    { id: "tx-3", bookId: "book-1", type: "Out", amount: 12000, date: "2026-08-15", description: "Monthly Rent", categoryId: "cat-10", paymentMethod: "Bank", note: "Office rent payment", attachment: null },
    { id: "tx-4", bookId: "book-1", type: "In", amount: 8500, date: "2026-08-14", description: "Consulting Fee", categoryId: "cat-1", paymentMethod: "Bank", note: "Advisory session", attachment: null },
    { id: "tx-5", bookId: "book-1", type: "Out", amount: 1200, date: "2026-08-12", description: "Internet Bill", categoryId: "cat-10", paymentMethod: "Card", note: "Broadband charge", attachment: null }
  ],
  activity_logs: [
    { id: "log-1", bookId: "book-1", userId: "user-1", userName: "Jane Doe", action: "created cash book Apta Office", time: "2026-08-19T10:00:00Z" },
    { id: "log-2", bookId: "book-1", userId: "user-1", userName: "Jane Doe", action: "added transaction Client Payment - Project X (+ ₹15,000)", time: "2026-08-19T10:42:00Z" }
  ]
};

// Initialize localStorage if empty
const getStoredData = () => {
  const data = localStorage.getItem('cashbook_db');
  if (!data) {
    localStorage.setItem('cashbook_db', JSON.stringify(SEED_DATA));
    return SEED_DATA;
  }
  return JSON.parse(data);
};

const setStoredData = (data) => {
  localStorage.setItem('cashbook_db', JSON.stringify(data));
  // Broadcast change for other tabs
  window.dispatchEvent(new Event('storage'));
};

const getLoggedUser = () => {
  const user = localStorage.getItem('cashbook_current_user');
  return user ? JSON.parse(user) : null;
};

const normalizeRole = (role) => {
  if (!role) return null;
  const lower = role.toLowerCase();
  if (lower === 'owner') return 'Owner';
  if (lower === 'editor') return 'Editor';
  if (lower === 'viewer') return 'Viewer';
  return role;
};

const hasWritePermissions = (role) => {
  if (!role) return false;
  const r = role.toLowerCase();
  return r === 'owner' || r === 'editor';
};

const isOwner = (role) => {
  if (!role) return false;
  return role.toLowerCase() === 'owner';
};

const parseTransaction = (tx) => {
  if (!tx) return tx;
  let parsedAttachment = null;
  if (tx.attachment) {
    if (typeof tx.attachment === 'string') {
      try {
        parsedAttachment = JSON.parse(tx.attachment);
      } catch (e) {
        parsedAttachment = tx.attachment;
      }
    } else {
      parsedAttachment = tx.attachment;
    }
  }
  return {
    ...tx,
    attachment: parsedAttachment
  };
};

// Helper to check user permission on a book
const getUserRoleOnBook = async (bookId, userId) => {
  if (!userId) return null;

  // Check if owner first by fetching book
  let isOwnerOfBook = false;
  if (useSupabase) {
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('ownerId')
      .eq('id', bookId)
      .maybeSingle();
    if (!bookError && book && book.ownerId === userId) {
      isOwnerOfBook = true;
    }
  } else {
    const db = getStoredData();
    const book = db.books.find(b => b.id === bookId);
    if (book && book.ownerId === userId) {
      isOwnerOfBook = true;
    }
  }

  if (isOwnerOfBook) {
    return 'Owner';
  }

  if (useSupabase) {
    const { data, error } = await supabase
      .from('book_members')
      .select('role')
      .eq('bookId', bookId)
      .eq('userId', userId)
      .maybeSingle();
    if (error) {
      console.error("Error checking user role on book:", error);
      return null;
    }
    return data ? normalizeRole(data.role) : null;
  } else {
    const db = getStoredData();
    const membership = db.book_members.find(m => m.bookId === bookId && m.userId === userId);
    return membership ? normalizeRole(membership.role) : null;
  }
};

// ----------------------------------------------------
// UNIFIED EXPORTABLE API
// ----------------------------------------------------

export const dbService = {
  // --- AUTHENTICATION ---
  auth: {
    async login(email, password) {
      if (useSupabase) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Fetch user profile name from custom table or metadata
        return {
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.name || data.user.email.split('@')[0]
        };
      } else {
        const db = getStoredData();
        const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
        if (!user) throw new Error("Invalid email or password.");
        const sessionUser = { id: user.id, email: user.email, name: user.name };
        localStorage.setItem('cashbook_current_user', JSON.stringify(sessionUser));
        return sessionUser;
      }
    },

    async signup(email, password, name) {
      if (useSupabase) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name } }
        });
        if (error) throw error;
        return { id: data.user.id, email: data.user.email, name };
      } else {
        const db = getStoredData();
        if (db.users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
          throw new Error("Email already registered.");
        }
        const newUser = { id: 'user-' + Date.now(), name, email, password };
        db.users.push(newUser);
        setStoredData(db);
        const sessionUser = { id: newUser.id, email: newUser.email, name: newUser.name };
        localStorage.setItem('cashbook_current_user', JSON.stringify(sessionUser));
        return sessionUser;
      }
    },

    async logout() {
      if (useSupabase) {
        await supabase.auth.signOut();
      } else {
        localStorage.removeItem('cashbook_current_user');
      }
    },

    async getCurrentUser() {
      if (useSupabase) {
        const { data } = await supabase.auth.getUser();
        if (!data.user) return null;
        return {
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.name || data.user.email.split('@')[0]
        };
      } else {
        return getLoggedUser();
      }
    },

    async getUsers() {
      if (useSupabase) {
        // Mock query or fetch from a profiles table
        const { data, error } = await supabase.from('profiles').select('id, name, email');
        if (error) return [];
        return data;
      } else {
        const db = getStoredData();
        return db.users.map(u => ({ id: u.id, name: u.name, email: u.email }));
      }
    },

    async updateProfile(name) {
      if (useSupabase) {
        const { data, error } = await supabase.auth.updateUser({
          data: { name }
        });
        if (error) throw error;
        return {
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.name || data.user.email.split('@')[0]
        };
      } else {
        const sessionUser = JSON.parse(localStorage.getItem('cashbook_current_user') || '{}');
        sessionUser.name = name;
        localStorage.setItem('cashbook_current_user', JSON.stringify(sessionUser));
        
        const db = getStoredData();
        const userIdx = db.users.findIndex(u => u.id === sessionUser.id);
        if (userIdx !== -1) {
          db.users[userIdx].name = name;
          setStoredData(db);
        }
        return sessionUser;
      }
    },

    async updatePassword(newPassword) {
      if (useSupabase) {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
      } else {
        const sessionUser = JSON.parse(localStorage.getItem('cashbook_current_user') || '{}');
        const db = getStoredData();
        const userIdx = db.users.findIndex(u => u.id === sessionUser.id);
        if (userIdx !== -1) {
          db.users[userIdx].password = newPassword;
          setStoredData(db);
        }
      }
    }
  },

  // --- CASH BOOKS ---
  books: {
    async getBooks(userId) {
      let targetUserId = userId;
      if (!targetUserId) {
        const user = await dbService.auth.getCurrentUser();
        targetUserId = user?.id;
      }
      if (!targetUserId) return [];

      if (useSupabase) {
        // Query books through book_memberships
        const { data: memberData, error: memberErr } = await supabase
          .from('book_members')
          .select('role, books(*)')
          .eq('userId', targetUserId);
        
        // Also query books where ownerId is targetUserId
        const { data: ownedBooks, error: ownedErr } = await supabase
          .from('books')
          .select('*')
          .eq('ownerId', targetUserId);

        if (memberErr) throw memberErr;
        if (ownedErr) throw ownedErr;

        const booksMap = new Map();

        if (ownedBooks) {
          for (const book of ownedBooks) {
            booksMap.set(book.id, { ...book, role: 'Owner' });
          }
        }

        if (memberData) {
          for (const item of memberData) {
            if (item.books) {
              const role = (item.books.ownerId === targetUserId) ? 'Owner' : normalizeRole(item.role);
              booksMap.set(item.books.id, { ...item.books, role });
            }
          }
        }

        return Array.from(booksMap.values());
      } else {
        const db = getStoredData();
        const booksMap = new Map();

        // Add owned books
        db.books.filter(b => b.ownerId === targetUserId).forEach(book => {
          booksMap.set(book.id, { ...book, role: 'Owner' });
        });

        // Add member books
        db.book_members.filter(m => m.userId === targetUserId).forEach(m => {
          const book = db.books.find(b => b.id === m.bookId);
          if (book) {
            const role = (book.ownerId === targetUserId) ? 'Owner' : normalizeRole(m.role);
            booksMap.set(book.id, { ...book, role });
          }
        });

        return Array.from(booksMap.values());
      }
    },

    async createBook(name, currency, openingBalance, workspace = 'Personal') {
      if (useSupabase) {
        // Get user session directly using supabase.auth.getUser()
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          throw new Error("Unauthenticated: " + (userError?.message || "No active user session"));
        }

        let insertObj = {
          name,
          currency,
          openingBalance: Number(openingBalance) || 0,
          ownerId: user.id,
          workspace
        };

        let data = null;
        let err1 = null;

        try {
          const result = await supabase
            .from('books')
            .insert(insertObj)
            .select();
          data = result.data;
          err1 = result.error;

          // If failed because of camelCase columns not existing, retry with snake_case
          if (err1 && (err1.message?.includes('column') || err1.code === '42703')) {
            console.warn("CamelCase insert failed, retrying with snake_case columns:", err1.message);
            const snakeInsertObj = {
              name,
              currency,
              opening_balance: Number(openingBalance) || 0,
              owner_id: user.id,
              workspace
            };
            const retryResult = await supabase
              .from('books')
              .insert(snakeInsertObj)
              .select();
            data = retryResult.data;
            err1 = retryResult.error;
          }
        } catch (insertErr) {
          console.error("Exception during book insert:", insertErr);
          throw insertErr;
        }

        if (err1) throw err1;

        let rawBook = data && data.length > 0 ? data[0] : null;
        
        // Normalize the book object to ensure UI gets expected camelCase fields
        const book = rawBook ? {
          id: rawBook.id,
          name: rawBook.name,
          currency: rawBook.currency,
          openingBalance: rawBook.openingBalance !== undefined ? Number(rawBook.openingBalance) : (rawBook.opening_balance !== undefined ? Number(rawBook.opening_balance) : 0),
          ownerId: rawBook.ownerId || rawBook.owner_id,
          workspace: rawBook.workspace,
          created_at: rawBook.created_at
        } : {
          id: 'temp-' + Date.now(),
          name,
          currency,
          openingBalance: Number(openingBalance) || 0,
          ownerId: user.id,
          workspace
        };

        if (book.id && !book.id.startsWith('temp-')) {
          // Upsert owner membership to handle/resolve conflicts with DB trigger gracefully
          try {
            const memberObj = { bookId: book.id, userId: user.id, role: 'Owner' };
            const { error: err2 } = await supabase
              .from('book_members')
              .upsert(memberObj, { onConflict: 'bookId,userId' });
            
            if (err2 && (err2.message?.includes('column') || err2.code === '42703')) {
              const snakeMemberObj = { book_id: book.id, user_id: user.id, role: 'Owner' };
              await supabase
                .from('book_members')
                .upsert(snakeMemberObj, { onConflict: 'book_id,user_id' });
            }
          } catch (memberErr) {
            console.warn("Could not insert/upsert owner membership:", memberErr);
          }

          try {
            await dbService.activity.logActivity(book.id, `created cash book "${name}"`);
          } catch (logErr) {
            console.warn("Could not log activity for book creation:", logErr);
          }
        }

        return { ...book, role: 'Owner' };
      } else {
        const user = await dbService.auth.getCurrentUser();
        if (!user) throw new Error("Unauthenticated");

        const db = getStoredData();
        const bookId = 'book-' + Date.now();
        const newBook = { id: bookId, name, ownerId: user.id, currency, openingBalance: Number(openingBalance), workspace };
        
        db.books.push(newBook);
        db.book_members.push({ bookId, userId: user.id, role: 'Owner' });

        // Add default categories
        DEFAULT_CATEGORIES.forEach(cName => {
          db.categories.push({ id: 'cat-' + Math.random().toString(36).substr(2, 9), bookId, name: cName });
        });

        setStoredData(db);
        await dbService.activity.logActivity(bookId, `created cash book "${name}"`);
        return { ...newBook, role: 'Owner' };
      }
    },

    async renameBook(bookId, name) {
      const user = await dbService.auth.getCurrentUser();
      const role = await getUserRoleOnBook(bookId, user?.id);
      if (!isOwner(role)) throw new Error("Only owners can rename the book.");

      if (useSupabase) {
        const { error } = await supabase.from('books').update({ name }).eq('id', bookId);
        if (error) throw error;
        await dbService.activity.logActivity(bookId, `renamed cash book to "${name}"`);
      } else {
        const db = getStoredData();
        const book = db.books.find(b => b.id === bookId);
        if (book) {
          book.name = name;
          setStoredData(db);
          await dbService.activity.logActivity(bookId, `renamed cash book to "${name}"`);
        }
      }
    },

    async deleteBook(bookId) {
      const user = await dbService.auth.getCurrentUser();
      const role = await getUserRoleOnBook(bookId, user?.id);
      if (!isOwner(role)) throw new Error("Only owners can delete the book.");

      if (useSupabase) {
        const { error } = await supabase.from('books').delete().eq('id', bookId);
        if (error) throw error;
      } else {
        const db = getStoredData();
        db.books = db.books.filter(b => b.id !== bookId);
        db.book_members = db.book_members.filter(m => m.bookId !== bookId);
        db.transactions = db.transactions.filter(t => t.bookId !== bookId);
        db.categories = db.categories.filter(c => c.bookId !== bookId);
        db.activity_logs = db.activity_logs.filter(l => l.bookId !== bookId);
        setStoredData(db);
      }
    },

    async getBookMembers(bookId) {
      if (useSupabase) {
        const { data, error } = await supabase
          .from('book_members')
          .select('role, userId, profiles(name, email)')
          .eq('bookId', bookId);
        if (error) throw error;
        return data.map(item => ({
          userId: item.userId,
          name: item.profiles.name,
          email: item.profiles.email,
          role: item.role
        }));
      } else {
        const db = getStoredData();
        const members = db.book_members.filter(m => m.bookId === bookId);
        return members.map(m => {
          const u = db.users.find(user => user.id === m.userId);
          return u ? { userId: u.id, name: u.name, email: u.email, role: m.role } : null;
        }).filter(Boolean);
      }
    },

    async shareBook(bookId, email, role) {
      const currentUser = await dbService.auth.getCurrentUser();
      const currentRole = await getUserRoleOnBook(bookId, currentUser?.id);
      if (!isOwner(currentRole)) throw new Error("Only owners can invite members.");

      if (useSupabase) {
        // 1. Fetch user by email
        const { data: profile, error: pErr } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email)
          .single();
        if (pErr) throw new Error("User with this email not found on the platform.");

        // 2. Insert member
        const { error } = await supabase
          .from('book_members')
          .insert({ bookId, userId: profile.id, role });
        if (error) throw error;

        await dbService.activity.logActivity(bookId, `invited ${email} as ${role}`);
      } else {
        const db = getStoredData();
        const invitee = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (!invitee) throw new Error("User with this email not registered in mock database.");

        const existing = db.book_members.find(m => m.bookId === bookId && m.userId === invitee.id);
        if (existing) throw new Error("User already has access to this book.");

        db.book_members.push({ bookId, userId: invitee.id, role });
        setStoredData(db);

        await dbService.activity.logActivity(bookId, `invited ${invitee.name} (${email}) as ${role}`);
      }
    },

    async updateBookMemberRole(bookId, userId, newRole) {
      const currentUser = await dbService.auth.getCurrentUser();
      const currentRole = await getUserRoleOnBook(bookId, currentUser?.id);
      if (!isOwner(currentRole)) throw new Error("Only owners can modify roles.");
      if (currentUser.id === userId) throw new Error("You cannot change your own role.");

      if (useSupabase) {
        const { error } = await supabase
          .from('book_members')
          .update({ role: newRole })
          .match({ bookId, userId });
        if (error) throw error;

        // Fetch name
        const { data: p } = await supabase.from('profiles').select('name').eq('id', userId).single();
        await dbService.activity.logActivity(bookId, `changed ${p?.name || 'member'}'s role to ${newRole}`);
      } else {
        const db = getStoredData();
        const member = db.book_members.find(m => m.bookId === bookId && m.userId === userId);
        if (member) {
          member.role = newRole;
          setStoredData(db);

          const u = db.users.find(user => user.id === userId);
          await dbService.activity.logActivity(bookId, `changed ${u?.name || 'member'}'s role to ${newRole}`);
        }
      }
    },

    async removeBookMember(bookId, userId) {
      const currentUser = await dbService.auth.getCurrentUser();
      const currentRole = await getUserRoleOnBook(bookId, currentUser?.id);
      if (!isOwner(currentRole)) throw new Error("Only owners can remove members.");
      if (currentUser.id === userId) throw new Error("Owners cannot remove themselves.");

      if (useSupabase) {
        const { error } = await supabase
          .from('book_members')
          .delete()
          .match({ bookId, userId });
        if (error) throw error;

        const { data: p } = await supabase.from('profiles').select('name').eq('id', userId).single();
        await dbService.activity.logActivity(bookId, `removed ${p?.name || 'member'}`);
      } else {
        const db = getStoredData();
        db.book_members = db.book_members.filter(m => !(m.bookId === bookId && m.userId === userId));
        setStoredData(db);

        const u = db.users.find(user => user.id === userId);
        await dbService.activity.logActivity(bookId, `removed ${u?.name || 'member'}`);
      }
    }
  },

  // --- TRANSACTIONS ---
  transactions: {
    async getTransactions(bookId, filters = {}) {
      const user = await dbService.auth.getCurrentUser();
      if (!user) return [];
      const role = await getUserRoleOnBook(bookId, user.id);
      if (!role) return [];

      if (useSupabase) {
        let query = supabase
          .from('transactions')
          .select('*')
          .eq('bookId', bookId)
          .order('date', { ascending: false })
          .order('created_at', { ascending: false });

        if (filters.type) {
          query = query.eq('type', filters.type);
        }
        if (filters.categoryId) {
          query = query.eq('categoryId', filters.categoryId);
        }
        if (filters.paymentMethod) {
          query = query.eq('paymentMethod', filters.paymentMethod);
        }
        if (filters.startDate) {
          query = query.gte('date', filters.startDate);
        }
        if (filters.endDate) {
          query = query.lte('date', filters.endDate);
        }

        const { data, error } = await query;
        if (error) throw error;

        const parsedData = data.map(parseTransaction);

        // Clientside text search filter
        if (filters.search) {
          const s = filters.search.toLowerCase();
          return parsedData.filter(t => 
            (t.description && t.description.toLowerCase().includes(s)) ||
            (t.note && t.note.toLowerCase().includes(s)) ||
            (t.amount.toString().includes(s))
          );
        }

        return parsedData;
      } else {
        const db = getStoredData();
        let txs = db.transactions.filter(t => t.bookId === bookId);

        // Sort newest first by date, then by ID (since ID is timestamp in mock)
        txs.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

        if (filters.type) {
          txs = txs.filter(t => t.type === filters.type);
        }
        if (filters.categoryId) {
          txs = txs.filter(t => t.categoryId === filters.categoryId);
        }
        if (filters.paymentMethod) {
          txs = txs.filter(t => t.paymentMethod === filters.paymentMethod);
        }
        if (filters.startDate) {
          txs = txs.filter(t => t.date >= filters.startDate);
        }
        if (filters.endDate) {
          txs = txs.filter(t => t.date <= filters.endDate);
        }
        if (filters.search) {
          const s = filters.search.toLowerCase();
          txs = txs.filter(t => 
            (t.description && t.description.toLowerCase().includes(s)) ||
            (t.note && t.note.toLowerCase().includes(s)) ||
            (t.amount.toString().includes(s))
          );
        }

        return txs.map(parseTransaction);
      }
    },

    async addTransaction(data) {
      const currentUser = await dbService.auth.getCurrentUser();
      const role = await getUserRoleOnBook(data.bookId, currentUser?.id);
      if (!hasWritePermissions(role)) {
        throw new Error("You do not have write permissions for this book.");
      }
      if (Number(data.amount) <= 0) {
        throw new Error("Amount must be greater than zero.");
      }

      const attachmentRaw = data.attachment || null;
      const attachmentStringified = attachmentRaw ? (typeof attachmentRaw === 'object' ? JSON.stringify(attachmentRaw) : attachmentRaw) : null;

      if (useSupabase) {
        const formattedData = {
          bookId: data.bookId,
          type: data.type,
          amount: Number(data.amount),
          date: data.date,
          description: data.description,
          categoryId: data.categoryId,
          paymentMethod: data.paymentMethod,
          note: data.note,
          attachment: attachmentStringified
        };

        const { data: newTx, error } = await supabase
          .from('transactions')
          .insert(formattedData)
          .select()
          .single();
        if (error) throw error;

        await dbService.activity.logActivity(
          data.bookId,
          `added transaction "${data.description}" (${data.type === 'In' ? '+' : '-'} ₹${data.amount})`
        );
        return parseTransaction(newTx);
      } else {
        const formattedData = {
          bookId: data.bookId,
          type: data.type,
          amount: Number(data.amount),
          date: data.date,
          description: data.description,
          categoryId: data.categoryId,
          paymentMethod: data.paymentMethod,
          note: data.note,
          attachment: attachmentRaw
        };
        const db = getStoredData();
        const newTx = {
          id: 'tx-' + Date.now(),
          ...formattedData
        };

        db.transactions.push(newTx);
        setStoredData(db);

        await dbService.activity.logActivity(
          data.bookId,
          `added transaction "${data.description}" (${data.type === 'In' ? '+' : '-'} ₹${data.amount})`
        );
        return parseTransaction(newTx);
      }
    },

    async updateTransaction(id, data) {
      const currentUser = await dbService.auth.getCurrentUser();
      const role = await getUserRoleOnBook(data.bookId, currentUser?.id);
      if (!hasWritePermissions(role)) {
        throw new Error("You do not have write permissions for this book.");
      }
      if (Number(data.amount) <= 0) {
        throw new Error("Amount must be greater than zero.");
      }

      const attachmentRaw = data.attachment || null;
      const attachmentStringified = attachmentRaw ? (typeof attachmentRaw === 'object' ? JSON.stringify(attachmentRaw) : attachmentRaw) : null;

      if (useSupabase) {
        const formattedData = {
          type: data.type,
          amount: Number(data.amount),
          date: data.date,
          description: data.description,
          categoryId: data.categoryId,
          paymentMethod: data.paymentMethod,
          note: data.note,
          attachment: attachmentStringified
        };
        const { data: updatedTx, error } = await supabase
          .from('transactions')
          .update(formattedData)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;

        await dbService.activity.logActivity(
          data.bookId,
          `edited transaction "${data.description}" (${data.type === 'In' ? '+' : '-'} ₹${data.amount})`
        );
        return parseTransaction(updatedTx);
      } else {
        const formattedData = {
          type: data.type,
          amount: Number(data.amount),
          date: data.date,
          description: data.description,
          categoryId: data.categoryId,
          paymentMethod: data.paymentMethod,
          note: data.note,
          attachment: attachmentRaw
        };
        const db = getStoredData();
        const index = db.transactions.findIndex(t => t.id === id);
        if (index === -1) throw new Error("Transaction not found.");

        const updatedTx = {
          ...db.transactions[index],
          ...formattedData
        };

        db.transactions[index] = updatedTx;
        setStoredData(db);

        await dbService.activity.logActivity(
          data.bookId,
          `edited transaction "${data.description}" (${data.type === 'In' ? '+' : '-'} ₹${data.amount})`
        );
        return parseTransaction(updatedTx);
      }
    },

    async deleteTransaction(id) {
      let tx;
      if (useSupabase) {
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('id', id)
          .single();
        if (error || !data) throw new Error("Transaction not found.");
        tx = data;
      } else {
        const db = getStoredData();
        tx = db.transactions.find(t => t.id === id);
        if (!tx) throw new Error("Transaction not found.");
      }

      const currentUser = await dbService.auth.getCurrentUser();
      const role = await getUserRoleOnBook(tx.bookId, currentUser?.id);
      if (!hasWritePermissions(role)) {
        throw new Error("You do not have write permissions for this book.");
      }

      if (useSupabase) {
        const { error } = await supabase.from('transactions').delete().eq('id', id);
        if (error) throw error;

        await dbService.activity.logActivity(
          tx.bookId,
          `deleted transaction "${tx.description}" (₹${tx.amount})`
        );
      } else {
        const db = getStoredData();
        db.transactions = db.transactions.filter(t => t.id !== id);
        setStoredData(db);

        await dbService.activity.logActivity(
          tx.bookId,
          `deleted transaction "${tx.description}" (₹${tx.amount})`
        );
      }
    }
  },

  // --- CATEGORIES ---
  categories: {
    async getCategories(bookId) {
      const user = await dbService.auth.getCurrentUser();
      if (!user) return [];
      const role = await getUserRoleOnBook(bookId, user.id);
      if (!role) return [];

      if (useSupabase) {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .eq('bookId', bookId)
          .order('name');
        if (error) throw error;
        return data;
      } else {
        const db = getStoredData();
        return db.categories.filter(c => c.bookId === bookId).sort((a, b) => a.name.localeCompare(b.name));
      }
    },

    async addCategory(bookId, name) {
      const currentUser = await dbService.auth.getCurrentUser();
      const role = await getUserRoleOnBook(bookId, currentUser?.id);
      if (!hasWritePermissions(role)) {
        throw new Error("You do not have write permissions to create categories.");
      }

      if (useSupabase) {
        const { data: newCat, error } = await supabase
          .from('categories')
          .insert({ bookId, name })
          .select()
          .single();
        if (error) throw error;
        return newCat;
      } else {
        const db = getStoredData();
        const existing = db.categories.find(c => c.bookId === bookId && c.name.toLowerCase() === name.toLowerCase());
        if (existing) throw new Error("Category already exists.");

        const newCat = {
          id: 'cat-' + Math.random().toString(36).substr(2, 9),
          bookId,
          name
        };
        db.categories.push(newCat);
        setStoredData(db);
        return newCat;
      }
    },

    async updateCategory(id, name) {
      let cat;
      if (useSupabase) {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .eq('id', id)
          .single();
        if (error || !data) throw new Error("Category not found.");
        cat = data;
      } else {
        const db = getStoredData();
        cat = db.categories.find(c => c.id === id);
        if (!cat) throw new Error("Category not found.");
      }

      const currentUser = await dbService.auth.getCurrentUser();
      const role = await getUserRoleOnBook(cat.bookId, currentUser?.id);
      if (!hasWritePermissions(role)) {
        throw new Error("You do not have write permissions to update categories.");
      }

      if (useSupabase) {
        const { data: updatedCat, error } = await supabase
          .from('categories')
          .update({ name })
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return updatedCat;
      } else {
        const db = getStoredData();
        const index = db.categories.findIndex(c => c.id === id);
        if (index === -1) throw new Error("Category not found.");
        db.categories[index].name = name;
        setStoredData(db);
        return db.categories[index];
      }
    },

    async deleteCategory(id) {
      let cat;
      if (useSupabase) {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .eq('id', id)
          .single();
        if (error || !data) throw new Error("Category not found.");
        cat = data;
      } else {
        const db = getStoredData();
        cat = db.categories.find(c => c.id === id);
        if (!cat) throw new Error("Category not found.");
      }

      const currentUser = await dbService.auth.getCurrentUser();
      const role = await getUserRoleOnBook(cat.bookId, currentUser?.id);
      if (!hasWritePermissions(role)) {
        throw new Error("You do not have write permissions to delete categories.");
      }

      // Check if transactions are using it
      if (useSupabase) {
        const { count, error } = await supabase
          .from('transactions')
          .select('*', { count: 'exact', head: true })
          .eq('categoryId', id);
        if (error) throw error;
        if (count && count > 0) {
          throw new Error("Cannot delete category. It is currently in use by active transactions.");
        }
      } else {
        const db = getStoredData();
        const inUse = db.transactions.some(t => t.categoryId === id);
        if (inUse) {
          throw new Error("Cannot delete category. It is currently in use by active transactions.");
        }
      }

      if (useSupabase) {
        const { error } = await supabase.from('categories').delete().eq('id', id);
        if (error) throw error;
      } else {
        const db = getStoredData();
        db.categories = db.categories.filter(c => c.id !== id);
        setStoredData(db);
      }
    }
  },

  // --- ACTIVITY LOGS ---
  activity: {
    async getActivityLogs(bookId) {
      const user = await dbService.auth.getCurrentUser();
      if (!user) return [];
      const role = await getUserRoleOnBook(bookId, user.id);
      if (!role) return [];

      if (useSupabase) {
        const { data, error } = await supabase
          .from('activity_logs')
          .select('*')
          .eq('bookId', bookId)
          .order('time', { ascending: false });
        if (error) throw error;
        return data;
      } else {
        const db = getStoredData();
        return db.activity_logs.filter(l => l.bookId === bookId).sort((a, b) => b.time.localeCompare(a.time));
      }
    },

    async logActivity(bookId, action) {
      const user = await dbService.auth.getCurrentUser();
      const userName = user ? user.name : "System";
      const userId = user ? user.id : "system";
      const time = new Date().toISOString();

      if (useSupabase) {
        await supabase.from('activity_logs').insert({
          bookId,
          userId,
          userName,
          action,
          time
        });
      } else {
        const db = getStoredData();
        db.activity_logs.push({
          id: 'log-' + Date.now() + Math.random().toString(36).substr(2, 4),
          bookId,
          userId,
          userName,
          action,
          time
        });
        setStoredData(db);
      }
    }
  },

  // --- ATTACHMENT UPLOADS ---
  attachments: {
    async uploadFile(file) {
      if (useSupabase) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substr(2, 9)}-${Date.now()}.${fileExt}`;
        const filePath = `receipts/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('attachments')
          .getPublicUrl(filePath);

        return {
          fileUrl: data.publicUrl,
          fileName: file.name
        };
      } else {
        // Return a mock object containing a simulated URL and local name
        // We will read the file as DataURL for local preview storage
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            resolve({
              fileUrl: reader.result, // Data URL for display
              fileName: file.name
            });
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }
    }
  }
};
