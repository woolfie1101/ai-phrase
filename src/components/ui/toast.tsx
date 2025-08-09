'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Date.now().toString();
    const newToast = { ...toast, id };
    
    setToasts((prev) => [...prev, newToast]);

    // Auto remove after duration (default 5 seconds)
    const duration = toast.duration || 5000;
    setTimeout(() => {
      removeToast(id);
    }, duration);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col space-y-2">
      {toasts.map((toast) => (
        <ToastComponent
          key={toast.id}
          toast={toast}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}

function ToastComponent({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-600" />;
      default:
        return null;
    }
  };

  const getBorderColor = () => {
    switch (toast.type) {
      case 'success':
        return 'border-l-green-500';
      case 'error':
        return 'border-l-red-500';
      case 'warning':
        return 'border-l-yellow-500';
      case 'info':
        return 'border-l-blue-500';
      default:
        return 'border-l-gray-500';
    }
  };

  return (
    <div
      className={cn(
        'relative flex w-full max-w-sm items-start space-x-3 rounded-lg bg-white p-4 shadow-lg border-l-4',
        getBorderColor()
      )}
    >
      <div className="flex-shrink-0">{getIcon()}</div>
      
      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className="text-sm font-medium text-gray-900">{toast.title}</p>
        )}
        <p className={cn(
          'text-sm text-gray-500',
          toast.title && 'mt-1'
        )}>
          {toast.message}
        </p>
      </div>

      <button
        className="flex-shrink-0 ml-3 text-gray-400 hover:text-gray-600"
        onClick={onClose}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// Convenience hooks
export function useToastSuccess() {
  const { addToast } = useToast();
  return (message: string, title?: string) => {
    addToast({ type: 'success', message, title });
  };
}

export function useToastError() {
  const { addToast } = useToast();
  return (message: string, title?: string) => {
    addToast({ type: 'error', message, title });
  };
}

export function useToastInfo() {
  const { addToast } = useToast();
  return (message: string, title?: string) => {
    addToast({ type: 'info', message, title });
  };
}

export function useToastWarning() {
  const { addToast } = useToast();
  return (message: string, title?: string) => {
    addToast({ type: 'warning', message, title });
  };
}