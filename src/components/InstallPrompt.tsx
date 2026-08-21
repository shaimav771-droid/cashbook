import React, { useState, useEffect } from 'react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="bg-primary/10 border-b border-primary/20 px-4 py-3 flex flex-col sm:flex-row justify-between items-center text-sm gap-3 z-50 relative">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white shrink-0">
          <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
        </div>
        <div>
          <strong className="text-primary block font-medium">Install CashBook App</strong>
          <span className="text-on-surface-variant text-xs sm:text-sm">Get quick access from your home screen</span>
        </div>
      </div>
      <div className="flex gap-2 w-full sm:w-auto">
        <button
          onClick={() => setShowPrompt(false)}
          className="flex-1 sm:flex-none px-4 py-2 text-on-surface-variant hover:bg-black/5 rounded-md transition-colors text-sm font-medium"
        >
          Not Now
        </button>
        <button
          onClick={handleInstallClick}
          className="flex-1 sm:flex-none px-4 py-2 bg-primary text-on-primary rounded-md shadow-sm hover:bg-primary/90 transition-colors text-sm font-medium"
        >
          Install
        </button>
      </div>
    </div>
  );
}
