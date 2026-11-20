'use client';
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { clsx } from 'clsx';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

type ToastTone = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
}
const Ctx = createContext<{ toast: (t: Omit<Toast, 'id'>) => void } | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const dismiss = useCallback((id: number) => setItems((x) => x.filter((t) => t.id !== id)), []);
  const toast = useCallback(
    (t: Omit<Toast, 'id'>) => {
      const id = Date.now() + Math.random();
      setItems((x) => [...x.slice(-3), { ...t, id }]);
      setTimeout(() => dismiss(id), t.tone === 'error' ? 7000 : 4500);
    },
    [dismiss],
  );
  const Icon = { success: CheckCircle2, error: XCircle, info: Info };
  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6 md:items-end md:pr-6">
        {items.map((t) => {
          const I = Icon[t.tone];
          return (
            <div
              key={t.id}
              role={t.tone === 'error' ? 'alert' : 'status'}
              className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-line bg-white p-4 shadow-pop"
            >
              <I className={clsx('mt-0.5 h-5 w-5 shrink-0', t.tone === 'success' ? 'text-success-600' : t.tone === 'error' ? 'text-brick-500' : 'text-info-600')} aria-hidden />
              <div className="flex-1 text-sm">
                <p className="font-semibold text-navy-800">{t.title}</p>
                {t.description && <p className="mt-0.5 text-slate">{t.description}</p>}
              </div>
              <button onClick={() => dismiss(t.id)} className="text-slate hover:text-navy-700" aria-label="Dismiss">
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useToast must be used inside ToastProvider');
  return c.toast;
}
