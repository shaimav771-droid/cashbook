import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signUpSchema, SignUpFormInput, SignUpResult } from '../types';
import { useAuth } from '../hooks/useAuth';

interface SignUpFormProps {
  onSuccess: (result: SignUpResult) => void;
}

export function SignUpForm({ onSuccess }: SignUpFormProps) {
  const { signup, error, setError } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<SignUpFormInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: '',
      email: '',
      password: ''
    }
  });

  const onSubmit = async (data: SignUpFormInput) => {
    setError(null);
    setSubmitting(true);
    try {
      const result = await signup(data);
      onSuccess(result);
    } catch (err: any) {
      // Error is handled globally in store/hook
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {/* Full Name Input */}
      <div className="relative group">
        <label 
          htmlFor="name"
          className="absolute -top-2 left-3 px-1 bg-surface-container-lowest text-[10px] uppercase font-semibold tracking-wider text-on-surface-variant z-10 group-focus-within:text-primary transition-colors"
        >
          Full Name
        </label>
        <div className="relative flex flex-col">
          <div className="relative flex items-center">
            <span className="material-symbols-outlined absolute left-3 text-on-surface-variant group-focus-within:text-primary transition-colors text-[20px] pointer-events-none">
              person
            </span>
            <input
              id="name"
              type="text"
              placeholder="John Doe"
              {...register('name')}
              aria-invalid={errors.name ? 'true' : 'false'}
              aria-describedby={errors.name ? 'name-error' : undefined}
              className={`w-full bg-surface-container-lowest text-on-surface text-body-md rounded-xl py-3 pl-10 pr-4 outline-none ring-1 transition-all shadow-sm placeholder:text-on-surface-variant/40 ${
                errors.name 
                  ? 'ring-error focus:ring-2 focus:ring-error' 
                  : 'ring-outline-variant focus:ring-2 focus:ring-primary'
              }`}
            />
          </div>
          {errors.name && (
            <span id="name-error" className="text-[11px] text-error font-medium mt-1 ml-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">error</span>
              {errors.name.message}
            </span>
          )}
        </div>
      </div>

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
            <span>Create Account</span>
            <span className="material-symbols-outlined text-[18px] transition-transform group-hover:translate-x-1">
              arrow_forward
            </span>
          </>
        )}
      </button>
    </form>
  );
}
