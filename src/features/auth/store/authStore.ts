import { create } from 'zustand';
import { authService } from '../services/authService';
import { LoginFormInput, SignUpFormInput, UserProfile, SignUpResult } from '../types';

interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  setUser: (user: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  login: (input: LoginFormInput) => Promise<UserProfile>;
  signup: (input: SignUpFormInput) => Promise<SignUpResult>;
  logout: () => Promise<void>;
  checkSession: () => Promise<UserProfile | null>;
  updateProfile: (name: string) => Promise<UserProfile>;
  loginWithGoogle: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  error: null,

  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  login: async (input) => {
    set({ loading: true, error: null });
    try {
      const user = await authService.signIn(input);
      set({ user, loading: false });
      return user;
    } catch (err: any) {
      const message = err.message || 'Failed to sign in';
      set({ error: message, loading: false });
      throw err;
    }
  },

  signup: async (input) => {
    set({ loading: true, error: null });
    try {
      const result = await authService.signUp(input);
      // Do not auto-login unverified accounts
      if (result.session) {
        set({ user: result.user, loading: false });
      } else {
        set({ user: null, loading: false });
      }
      return result;
    } catch (err: any) {
      const message = err.message || 'Failed to sign up';
      set({ error: message, loading: false });
      throw err;
    }
  },

  logout: async () => {
    set({ loading: true, error: null });
    try {
      await authService.signOut();
      set({ user: null, loading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to sign out', loading: false });
      throw err;
    }
  },

  checkSession: async () => {
    set({ loading: true, error: null });
    try {
      const user = await authService.getCurrentUser();
      set({ user, loading: false });
      return user;
    } catch (err: any) {
      set({ user: null, loading: false });
      return null;
    }
  },

  updateProfile: async (name) => {
    set({ loading: true, error: null });
    try {
      const user = await authService.updateProfile(name);
      set({ user, loading: false });
      return user;
    } catch (err: any) {
      const message = err.message || 'Failed to update profile';
      set({ error: message, loading: false });
      throw err;
    }
  },

  loginWithGoogle: async () => {
    set({ loading: true, error: null });
    try {
      const user = await authService.signInWithGoogle();
      if (user) {
        set({ user, loading: false });
      }
    } catch (err: any) {
      const message = err.message || 'Failed to sign in with Google';
      set({ error: message, loading: false });
      throw err;
    }
  }
}));
