'use client';

import React, { createContext, useContext, useState, useCallback, memo } from 'react';
import { usePokemonTheme } from '@/components/PokemonThemeProvider';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(7);
    setToasts(prev => [...prev, { ...toast, id }]);

    setTimeout(() => {
      removeToast(id);
    }, toast.duration || 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
};

const ToastContainer: React.FC = memo(function ToastContainer() {
  const { toasts, removeToast } = useToast();
  const { currentTheme, isDarkMode } = usePokemonTheme();

  const getIcon = (type: Toast['type']) => {
    switch (type) {
      case 'success': return '✓';
      case 'error': return '✕';
      case 'warning': return '⚠';
      case 'info': return 'ℹ';
    }
  };

  const getColors = (type: Toast['type']) => {
    switch (type) {
      case 'success': return { bg: '#10B981', border: '#059669' };
      case 'error': return { bg: '#EF4444', border: '#DC2626' };
      case 'warning': return { bg: '#F59E0B', border: '#D97706' };
      case 'info': return { bg: currentTheme.colors.primary, border: currentTheme.colors.secondary };
    }
  };

  return (
    <div
      className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none"
      role="status"
      aria-label="Notifications"
    >
      {toasts.map((toast, index) => {
        const colors = getColors(toast.type);
        return (
          <div
            key={toast.id}
            role="alert"
            aria-atomic="true"
            className="pointer-events-auto animate-slide-in-right min-w-[280px] max-w-[380px] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-3 flex items-start gap-3"
            style={{
              backgroundColor: isDarkMode ? '#1a1a2e' : 'white',
              animationDelay: `${index * 50}ms`
            }}
          >
            <div
              className="w-8 h-8 flex items-center justify-center text-white font-bold text-sm border-2 border-black flex-shrink-0"
              style={{ backgroundColor: colors.bg }}
              aria-hidden="true"
            >
              {getIcon(toast.type)}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-black'}`}>
                {toast.title}
              </h4>
              {toast.message && (
                <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  {toast.message}
                </p>
              )}
              {toast.action && (
                <button
                  onClick={() => { toast.action!.onClick(); removeToast(toast.id); }}
                  className="mt-1.5 px-3 py-1 text-xs font-bold text-white bg-green-500 border-2 border-black hover:bg-green-600 transition-colors"
                >
                  {toast.action.label}
                </button>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className={`text-xs font-bold hover:opacity-70 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}
              aria-label={`Dismiss ${toast.title} notification`}
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
});

export default ToastProvider;
