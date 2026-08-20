import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, LoginFormInput } from '../types';
import { useAuth } from '../hooks/useAuth';

interface LoginFormProps {
  onSuccess: () => void;
  autofillEmail?: string;
}

export function LoginForm({ onSuccess, autofillEmail }: LoginFormProps) {
  const { login, error, setError } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm<LoginFormInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: autofillEmail || '',
      password: ''
    }
  });

  // React to autofill request from parent
  React.useEffect(() => {
    if (autofillEmail) {
      setValue('email', autofillEmail);
      setValue('password', 'password'); // demo accounts password
    }
  }, [autofillEmail, setValue]);

  const onSubmit = async (data: LoginFormInput) => {
    setError(null);
    setSubmitting(true);
    try {
      await login(data);
      onSuccess();
    } catch (err: any) {
      // Error is stored globally in authStore/useAuth
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {/* Email Input */}
      <div className="relative group">
        <label 
          htmlFor="email"
          className="absolute -top-2 left-3 px-1 bg-surface-container-lowest text-[10px] uppercase font-semibold tracking-wider text-on-surface-variant z-10 group-focus-within:text-primary transition-colors"
        >
          Email Address
        </label>
        <div className="relative flex flex-col">
          <div className="relative flex items-center">
            <span className="material-symbols-outlined absolute left-3 text-on-surface-variant group-focus-within:text-primary transition-colors text-[20px] pointer-events-none">
              mail
            </span>
            <input
              id="email"
              type="email"
              placeholder="john@company.com"
              {...register('email')}
              aria-invalid={errors.email ? 'true' : 'false'}
              aria-describedby={errors.email ? 'email-error' : undefined}
              className={`w-full bg-surface-container-lowest text-on-surface text-body-md rounded-xl py-3 pl-10 pr-4 outline-none ring-1 transition-all shadow-sm placeholder:text-on-surface-variant/40 ${
                errors.email 
                  ? 'ring-error focus:ring-2 focus:ring-error' 
                  : 'ring-outline-variant focus:ring-2 focus:ring-primary'
              }`}
            />
          </div>
          {errors.email && (
            <span id="email-error" className="text-[11px] text-error font-medium mt-1 ml-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">error</span>
              {errors.email.message}
            </span>
          )}
        </div>
      </div>

      {/* Password Input */}
      <div className="relative group">
        <label 
          htmlFor="password"
          className="absolute -top-2 left-3 px-1 bg-surface-container-lowest text-[10px] uppercase font-semibold tracking-wider text-on-surface-variant z-10 group-focus-within:text-primary transition-colors"
        >
          Password
        </label>
        <div className="relative flex flex-col">
          <div className="relative flex items-center">
            <span className="material-symbols-outlined absolute left-3 text-on-surface-variant group-focus-within:text-primary transition-colors text-[20px] pointer-events-none">
              lock
            </span>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              {...register('password')}
              aria-invalid={errors.password ? 'true' : 'false'}
              aria-describedby={errors.password ? 'password-error' : undefined}
              className={`w-full bg-surface-container-lowest text-on-surface text-body-md rounded-xl py-3 pl-10 pr-10 outline-none ring-1 transition-all shadow-sm placeholder:text-on-surface-variant/40 ${
                errors.password 
                  ? 'ring-error focus:ring-2 focus:ring-error' 
                  : 'ring-outline-variant focus:ring-2 focus:ring-primary'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center p-1 focus:outline-none focus:ring-2 focus:ring-primary rounded-md"
            >
              <span className="material-symbols-outlined text-[20px]">
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
          {errors.password && (
            <span id="password-error" className="text-[11px] text-error font-medium mt-1 ml-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">error</span>
              {errors.password.message}
            </span>
          )}
        </div>
      </div>

      {/* Remember Me and Forgot Password */}
      <div className="flex items-center justify-between text-xs mt-1">
        <label className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            className="w-4 h-4 accent-primary rounded border-outline-variant cursor-pointer focus:ring-2 focus:ring-primary focus:outline-none"
          />
          <span className="text-on-surface-variant group-hover:text-on-surface transition-colors">
            Remember me
          </span>
        </label>
        <button
          type="button"
          onClick={() => alert('Demo Mode: Forgot password is not available.')}
          className="text-primary hover:text-primary-container font-semibold transition-colors hover:underline focus:outline-none focus:ring-2 focus:ring-primary rounded-md px-1"
        >
          Forgot password?
        </button>
      </div>

      {/* Global Error Display */}
      {error && (
        <div className="p-3 bg-error-container text-on-error-container rounded-xl text-body-sm flex items-center gap-2 border border-error/20">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-primary text-on-primary text-title-md font-bold py-3 rounded-xl shadow-md hover:shadow-lg hover:bg-primary-container hover:text-on-primary-container transition-all relative overflow-hidden group flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50"
      >
        {submitting ? (
          <div className="w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></div>
        ) : (
          <>
            <span>Login</span>
            <span className="material-symbols-outlined text-[18px] transition-transform group-hover:translate-x-1">
              arrow_forward
            </span>
          </>
        )}
      </button>
    </form>
  );
}
