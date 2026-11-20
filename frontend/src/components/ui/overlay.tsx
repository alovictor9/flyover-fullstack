'use client';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';
import { X } from 'lucide-react';
import { Button } from './button';
import { Textarea } from './form';

function useLockAndEscape(open: boolean, onClose: () => void, ref: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const body = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && ref.current) {
        const f = ref.current.querySelectorAll<HTMLElement>('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        const first = f[0]!;
        const last = f[f.length - 1]!;
        if (e.shiftKey && document.activeElement === first) (e.preventDefault(), last.focus());
        else if (!e.shiftKey && document.activeElement === last) (e.preventDefault(), first.focus());
      }
    };
    document.addEventListener('keydown', onKey);
    setTimeout(() => {
      const target = ref.current?.querySelector<HTMLElement>('[data-autofocus],input,textarea,select,button');
      target?.focus();
    }, 20);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = body;
      prev?.focus?.();
    };
  }, [open, onClose, ref]);
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  variant = 'center',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /** 'drawer' slides in from the right on desktop (detail panels). Both are bottom sheets on mobile. */
  variant?: 'center' | 'drawer';
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useLockAndEscape(open, onClose, ref);
  if (!open || !mounted) return null;
  const drawer = variant === 'drawer';
  return createPortal(
    <div className={clsx('fixed inset-0 z-50 flex items-end', drawer ? 'sm:items-stretch sm:justify-end' : 'sm:items-center sm:justify-center sm:p-4')}>
      <div className="absolute inset-0 bg-navy-900/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={clsx(
          'relative flex max-h-[92vh] w-full flex-col bg-white shadow-pop',
          'rounded-t-2xl',
          drawer ? 'sm:h-full sm:max-h-none sm:max-w-lg sm:rounded-none sm:rounded-l-2xl' : 'sm:rounded-2xl',
          !drawer && (size === 'sm' ? 'sm:max-w-md' : size === 'lg' ? 'sm:max-w-3xl' : 'sm:max-w-xl'),
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-navy-800">
              {title}
            </h2>
            {description && <p className="mt-0.5 text-sm text-slate">{description}</p>}
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate hover:bg-mist hover:text-navy-700" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && <div className="flex flex-col-reverse gap-2 border-t border-line px-5 py-4 sm:flex-row sm:justify-end">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/**
 * Explicit confirmation for consequential actions (approve/reject, payouts, suspensions).
 * `requireReason` collects text that is sent to the API (rejection reason, admin note).
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  tone = 'primary',
  loading,
  reason,
  children,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  tone?: 'primary' | 'danger' | 'accent';
  loading?: boolean;
  reason?: { label: string; required?: boolean; placeholder?: string };
  children?: ReactNode;
}) {
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => {
    if (open) {
      setText('');
      setErr('');
    }
  }, [open]);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant={tone === 'danger' ? 'accent' : tone}
            loading={loading}
            onClick={() => {
              if (reason?.required && !text.trim()) return setErr(`${reason.label} is required.`);
              onConfirm(text.trim());
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {description && <div className="text-sm text-slate">{description}</div>}
      {children}
      {reason && (
        <div className="mt-4">
          <Textarea
            label={reason.label}
            required={reason.required}
            placeholder={reason.placeholder}
            value={text}
            onChange={(e) => (setText(e.target.value), setErr(''))}
            error={err}
            rows={3}
            maxLength={1000}
          />
        </div>
      )}
    </Modal>
  );
}
