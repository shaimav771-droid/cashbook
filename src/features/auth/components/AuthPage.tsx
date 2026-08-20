import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { LoginForm } from './LoginForm';
import { SignUpForm } from './SignUpForm';
import { SignUpResult } from '../types';

export function AuthPage() {
  const { setError, loginWithGoogle } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [autofillEmail, setAutofillEmail] = useState('');
  const [showVerificationAlert, setShowVerificationAlert] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleTabChange = (loginTabSelected: boolean) => {
    setIsLogin(loginTabSelected);
    setError(null);
  };

  const handleAutofill = (email: string) => {
    setAutofillEmail(email);
    setIsLogin(true);
    setError(null);
  };

  const handleSignUpSuccess = (result: SignUpResult) => {
    // If Supabase requires email verification, we can show an alert.
    // If not, our Zustand store automatically logs them in.
    setShowVerificationAlert(true);
  };

  const handleLoginSuccess = () => {
    // Session is automatically populated in Zustand state, which transitions the app view.
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error(err);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex items-center justify-center relative overflow-hidden bg-background px-4 md:px-0">
      {/* Decorative Ambient Gradient Background */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[60%] h-[60%] bg-surface-tint opacity-10 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary-container opacity-[0.08] rounded-full blur-[120px]"></div>
      </div>

      {/* Main Auth Container */}
      <div className="w-full max-w-[440px] relative z-10 flex flex-col gap-6">
        <div className="bg-surface-container-lowest rounded-2xl shadow-xl overflow-hidden border border-outline-variant/30 hover:shadow-2xl transition-all duration-300">
          {/* Top Accent Line */}
          <div className="h-1.5 w-full bg-gradient-to-r from-primary to-inverse-primary"></div>
          
          <div className="p-8">
            {/* Logo Header */}
            <div className="flex flex-col items-center mb-6">
              <div className="w-16 h-16 rounded-xl bg-surface-container-low flex items-center justify-center mb-4 border border-outline-variant/30 overflow-hidden relative group">
                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <img 
                  alt="CashBook Logo" 
                  className="w-10 h-10 object-contain drop-shadow-sm transition-transform duration-300 group-hover:scale-105" 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBJm-CmABP0LkKzZyWNdTo-FpbY89aEe6vMmDzfu43y67Lp2A06BOgMnSjRbDiXaXIm3MF-lwh6TBIu68EFIXn3JU6PCje8eKjG0kgfbNl1yNRs0rOOF4lgr5o-Lxd4A2PueiyQbbjZFd0uFutPn4hkrugL9e9jatj3O0GBfhkCpddXOS4Ja_RwuZYWKpaw1iTr_22dsTJ8RG4_-b--Hbd8QpRV7Y212iiOGwbiR6HBt-ETLFXTVYVK"
                />
              </div>
              <h1 className="text-headline-lg-mobile md:text-headline-lg text-on-surface font-semibold tracking-tight">
                {isLogin ? 'Welcome Back' : 'Create Account'}
              </h1>
              <p className="text-body-sm text-on-surface-variant mt-1.5 text-center">
                {isLogin ? 'Secure access to your ledger' : 'Start optimizing your cashflow'}
              </p>
            </div>

            {showVerificationAlert && !isLogin ? (
              <div className="p-5 bg-primary/5 border border-primary/20 rounded-2xl text-center space-y-4 my-6">
                <span className="material-symbols-outlined text-primary text-[48px] animate-pulse">
                  mark_email_read
                </span>
                <h3 className="text-title-md font-bold text-on-surface">Verify Your Email</h3>
                <p className="text-body-sm text-on-surface-variant">
                  Please check your email inbox to verify your account before logging in.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(true);
                    setShowVerificationAlert(false);
                  }}
                  className="text-primary text-body-sm font-semibold hover:underline"
                >
                  Return to Login
                </button>
              </div>
            ) : (
              <>
                {/* Auth Toggle Tabs */}
                <div className="flex p-1 bg-surface-container-low rounded-xl mb-6 relative">
                  <button 
                    type="button"
                    onClick={() => handleTabChange(true)}
                    className={`flex-1 py-2 text-label-caps font-semibold rounded-lg uppercase tracking-wider text-center z-10 transition-all duration-200 ${
                      isLogin ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    Login
                  </button>
                  <button 
                    type="button"
                    onClick={() => handleTabChange(false)}
                    className={`flex-1 py-2 text-label-caps font-semibold rounded-lg uppercase tracking-wider text-center z-10 transition-all duration-200 ${
                      !isLogin ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    Sign Up
                  </button>
                </div>

                {/* Form Rendering */}
                {isLogin ? (
                  <LoginForm 
                    onSuccess={handleLoginSuccess} 
                    autofillEmail={autofillEmail} 
                  />
                ) : (
                  <SignUpForm 
                    onSuccess={handleSignUpSuccess} 
                  />
                )}

                {/* OR Divider */}
                <div className="relative flex py-4 items-center">
                  <div className="flex-grow border-t border-outline-variant/30"></div>
                  <span className="flex-shrink mx-4 text-on-surface-variant text-[11px] uppercase font-semibold tracking-wider">
                    or
                  </span>
                  <div className="flex-grow border-t border-outline-variant/30"></div>
                </div>

                {/* Continue with Google Button */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading}
                  className="w-full flex items-center justify-center gap-3 bg-surface-container-low text-on-surface hover:bg-surface-container hover:shadow-md border border-outline-variant/30 text-body-md font-semibold py-3 px-4 rounded-xl transition-all hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {googleLoading ? (
                    <div className="w-5 h-5 border-2 border-on-surface border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span>Continue with Google</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>

          <div className="bg-surface-container-low py-4 px-8 text-center border-t border-outline-variant/30 flex items-center justify-center gap-1.5 text-xs text-on-surface-variant">
            <span>{isLogin ? "Don't have an account?" : "Already have an account?"}</span>
            <button 
              type="button"
              onClick={() => handleTabChange(!isLogin)}
              className="text-primary font-bold hover:underline focus:outline-none focus:ring-2 focus:ring-primary rounded px-1"
            >
              {isLogin ? 'Sign Up' : 'Login'}
            </button>
          </div>
        </div>

        {/* DEMO ACCOUNTS QUICK-LOGIN PANEL */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-md p-4 text-xs space-y-2">
          <div className="font-semibold text-on-surface flex items-center gap-1.5 border-b border-outline-variant pb-1.5 uppercase font-label-caps text-[10px]">
            <span className="material-symbols-outlined text-[14px]">vpn_key</span>
            Quick-Login Demo Accounts
          </div>
          <p className="text-on-surface-variant text-[11px]">Click an account to instantly autofill and test collaboration views:</p>
          <div className="grid grid-cols-3 gap-2 pt-1">
            <button 
              onClick={() => handleAutofill('owner@example.com')}
              className="px-2.5 py-1.5 rounded-lg border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 font-bold transition-all text-center"
            >
              Owner View
            </button>
            <button 
              onClick={() => handleAutofill('editor@example.com')}
              className="px-2.5 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 font-bold transition-all text-center"
            >
              Editor View
            </button>
            <button 
              onClick={() => handleAutofill('viewer@example.com')}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 font-bold transition-all text-center"
            >
              Viewer View
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
