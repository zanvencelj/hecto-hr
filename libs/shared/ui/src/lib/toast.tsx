import { useState, useCallback, createContext, useContext } from 'react';
import { cn } from './utils';

type ToastVariant = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, variant: ToastVariant = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'flex items-center gap-2 border px-4 py-3 text-sm font-medium shadow-lg pointer-events-auto',
              'animate-in fade-in slide-in-from-bottom-2 duration-200',
              t.variant === 'success' && 'border-green-200 bg-green-50 text-green-800',
              t.variant === 'error' && 'border-red-200 bg-red-50 text-red-800',
              t.variant === 'info' && 'border-blue-200 bg-blue-50 text-blue-800',
            )}
          >
            {t.variant === 'success' && <span>✓</span>}
            {t.variant === 'error' && <span>✕</span>}
            {t.variant === 'info' && <span>ℹ</span>}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx.toast;
}
