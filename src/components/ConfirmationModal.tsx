import React, { useEffect, useState } from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  variant?: 'danger' | 'warning' | 'simple';
}

export function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  isLoading = false,
  variant = 'danger',
}: ConfirmationModalProps) {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      const timer = setTimeout(() => setAnimate(true), 10);
      return () => clearTimeout(timer);
    } else {
      setAnimate(false);
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!shouldRender) return null;

  const isSimple = variant === 'simple';

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-center justify-center p-4 transition-opacity duration-300 ${
        animate ? 'opacity-100' : 'opacity-0'
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300"
        onClick={isLoading ? undefined : onCancel}
      />

      {/* Modal Card */}
      <div
        className={`bg-surface-container-lowest border border-outline-variant/30 rounded-2xl w-full max-w-md mx-4 shadow-2xl p-6 relative z-10 transform transition-all duration-300 ${
          animate ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        {/* Header/Title */}
        <div className={`flex items-center ${isSimple ? 'mb-4' : 'gap-3 mb-3 text-error'}`}>
          {!isSimple && (
            <span className="material-symbols-outlined text-[32px] select-none">
              warning
            </span>
          )}
          <h3
            id="modal-title"
            className={`font-title-md text-title-md font-bold leading-tight ${
              isSimple ? 'text-on-surface' : ''
            }`}
          >
            {title}
          </h3>
        </div>

        {/* Message Content */}
        <div className="font-body-md text-body-md text-on-surface-variant mb-6 leading-relaxed">
          {message}
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-semibold rounded-xl text-on-surface-variant hover:bg-surface-container-low transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-5 py-2 text-sm font-semibold rounded-xl transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 ${
              isSimple
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-error text-on-error hover:bg-red-700'
            }`}
          >
            {isLoading && (
              <div
                className={`w-4 h-4 border-2 rounded-full animate-spin ${
                  isSimple ? 'border-white border-t-transparent' : 'border-on-error border-t-transparent'
                }`}
              />
            )}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

