'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    if (standalone) return;

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);

    // Check if dismissed recently
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      // Don't show for 7 days after dismissal
      if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) return;
    }

    // For Android/Desktop - listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show prompt after a delay
      setTimeout(() => setShowPrompt(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // For iOS - show custom prompt after delay
    if (iOS) {
      setTimeout(() => setShowPrompt(true), 5000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  if (isStandalone || !showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-20 sm:bottom-4 left-4 right-4 z-[100] sm:left-auto sm:right-4 sm:w-80"
      >
        <div className="bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl p-4 shadow-xl border border-white/20">
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 p-1 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
          >
            <X size={16} />
          </button>

          <div className="flex items-start gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Smartphone size={24} className="text-white" />
            </div>

            <div className="flex-1">
              <h3 className="text-white font-bold text-sm">Install CinePurr</h3>
              <p className="text-white/80 text-xs mt-0.5">
                {isIOS
                  ? 'Tap Share then "Add to Home Screen"'
                  : 'Install for faster access & offline support'
                }
              </p>
            </div>
          </div>

          {!isIOS && deferredPrompt && (
            <button
              onClick={handleInstall}
              className="mt-3 w-full py-2 bg-white text-purple-600 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-white/90 transition-colors"
            >
              <Download size={16} />
              Install App
            </button>
          )}

          {isIOS && (
            <div className="mt-3 flex items-center justify-center gap-2 text-white/80 text-xs">
              <span>📤</span>
              <span>→</span>
              <span>Add to Home Screen</span>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
