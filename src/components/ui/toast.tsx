'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { X, CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

const toastVariants = cva(
  [
    'flex items-start gap-3 w-full max-w-[420px] rounded-[var(--radius-xl)] p-4',
    'shadow-[var(--shadow-lg)] border',
    'transition-all duration-[var(--transition-slow)]',
    'animate-in slide-in-from-top-2 fade-in-0',
  ].join(' '),
  {
    variants: {
      variant: {
        success: 'bg-[var(--color-success-50)] border-[var(--color-success-500)]/30 text-[var(--color-success-700)]',
        warning: 'bg-[var(--color-warning-50)] border-[var(--color-warning-500)]/30 text-[var(--color-warning-700)]',
        error: 'bg-[var(--color-error-50)] border-[var(--color-error-500)]/30 text-[var(--color-error-700)]',
        info: 'bg-[var(--color-info-50)] border-[var(--color-info-500)]/30 text-[var(--color-info-700)]',
      },
    },
    defaultVariants: {
      variant: 'info',
    },
  },
);

const iconMap = {
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
  info: Info,
};

export interface ToastProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof toastVariants> {
  title?: string;
  description?: string;
  onClose?: () => void;
  duration?: number;
}

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ className, variant = 'info', title, description, onClose, duration = 5000, ...props }, ref) => {
    const Icon = iconMap[variant || 'info'];

    React.useEffect(() => {
      if (duration > 0 && onClose) {
        const timer = setTimeout(onClose, duration);
        return () => clearTimeout(timer);
      }
    }, [duration, onClose]);

    return (
      <div
        ref={ref}
        role="alert"
        aria-live="polite"
        className={cn(toastVariants({ variant, className }))}
        {...props}
      >
        <Icon className="h-5 w-5 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          {title && (
            <p className="text-[var(--font-size-sm)] font-[var(--font-weight-semibold)]">{title}</p>
          )}
          {description && (
            <p className="text-[var(--font-size-sm)] opacity-80 mt-0.5">{description}</p>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="shrink-0 rounded-[var(--radius-md)] p-0.5 opacity-60 hover:opacity-100 transition-opacity"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  },
);
Toast.displayName = 'Toast';

interface ToastItem {
  id: string;
  variant: 'success' | 'warning' | 'error' | 'info';
  title?: string;
  description?: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const addToast = React.useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[var(--z-toast)] flex flex-col gap-2">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            variant={toast.variant}
            title={toast.title}
            description={toast.description}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export { Toast, toastVariants };
