import { supabase } from '@/db';
import { LoginFormInput, SignUpFormInput, UserProfile, SignUpResult } from '../types';

export const authService = {
  async signIn({ email, password }: LoginFormInput): Promise<UserProfile> {
    if (!supabase) {
      throw new Error('Supabase client is not initialized.');
    }
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      throw error;
    }
    
    if (!data.user) {
      throw new Error('Login succeeded but no user data was returned.');
    }

    if (data.user.email && !data.user.email_confirmed_at) {
      await supabase.auth.signOut();
      throw new Error('Please check your email inbox to verify your account before logging in.');
    }

    return {
      id: data.user.id,
      email: data.user.email || '',
      name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || ''
    };
  },

  async signUp({ email, password, name }: SignUpFormInput): Promise<SignUpResult> {
    if (!supabase) {
      throw new Error('Supabase client is not initialized.');
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name }
      }
    });

    if (error) {
      throw error;
    }

    if (!data.user) {
      throw new Error('Signup succeeded but no user data was returned.');
    }

    return {
      user: {
        id: data.user.id,
        email: data.user.email || '',
        name
      },
      session: data.session
    };
  },

  async signOut(): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentUser(): Promise<UserProfile | null> {
    if (!supabase) return null;
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;

    if (user.email && !user.email_confirmed_at) {
      await supabase.auth.signOut();
      return null;
    }

    return {
      id: user.id,
      email: user.email || '',
      name: user.user_metadata?.name || user.email?.split('@')[0] || ''
    };
  },

  async updateProfile(name: string): Promise<UserProfile> {
    if (!supabase) {
      throw new Error('Supabase client is not initialized.');
    }

    const { data: { user }, error } = await supabase.auth.updateUser({
      data: { name }
    });

    if (error) {
      throw error;
    }

    if (!user) {
      throw new Error('Failed to retrieve updated user data.');
    }

    return {
      id: user.id,
      email: user.email || '',
      name: user.user_metadata?.name || user.email?.split('@')[0] || ''
    };
  },

  async signInWithGoogle(): Promise<UserProfile | null> {
    if (!supabase) {
      // Mock Google sign-in for local development
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return {
        id: 'google-mock-id',
        email: 'google.user@example.com',
        name: 'Google User'
      };
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });

    if (error) {
      throw error;
    }

    return null;
  }
};
