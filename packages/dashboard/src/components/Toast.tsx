import { useEffect, useState, useCallback } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X, Wrench } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  solution?: string;
  duration?: number;
}

const ICON_MAP: Record<ToastType, { icon: React.ElementType; bg: string; border: string; text: string }> = {
  success: { icon: CheckCircle, bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700' },
  error:   { icon: XCircle,     bg: 'bg-red-50',     border: 'border-red-300',     text: 'text-red-700' },
  warning: { icon: AlertTriangle, bg: 'bg-amber-50', border: 'border-amber-300',   text: 'text-amber-700' },
  info:    { icon: Info,         bg: 'bg-blue-50',    border: 'border-blue-300',    text: 'text-blue-700' },
};

let addToastGlobal: ((toast: Omit<ToastMessage, 'id'>) => void) | null = null;

export function toast(t: Omit<ToastMessage, 'id'>) {
  addToastGlobal?.(t);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((t: Omit<ToastMessage, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { ...t, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    addToastGlobal = addToast;
    return () => { addToastGlobal = null; };
  }, [addToast]);

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={removeToast} />
      ))}
    </div>
  );
}

function ToastItem({ toast: t, onDismiss }: { toast: ToastMessage; onDismiss: (id: string) => void }) {
  const conf = ICON_MAP[t.type];
  const Icon = conf.icon;

  useEffect(() => {
    const ms = t.duration ?? (t.type === 'error' ? 8000 : 5000);
    const timer = setTimeout(() => onDismiss(t.id), ms);
    return () => clearTimeout(timer);
  }, [t, onDismiss]);

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg ${conf.bg} ${conf.border} animate-slide-in`}
    >
      <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${conf.text}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${conf.text}`}>{t.title}</p>
        <p className="text-xs text-gray-600 mt-0.5">{t.message}</p>
        {t.solution && (
          <div className="mt-1.5 flex items-start gap-1.5 bg-white/60 rounded-md px-2 py-1.5 border border-dashed border-gray-300">
            <Wrench className="w-3 h-3 mt-0.5 text-gray-500 flex-shrink-0" />
            <p className="text-xs text-gray-700 font-medium">{t.solution}</p>
          </div>
        )}
      </div>
      <button onClick={() => onDismiss(t.id)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
