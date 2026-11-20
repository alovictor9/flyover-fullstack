'use client';
import { useState } from 'react';
import { clsx } from 'clsx';
import { Check, Copy, Share2 } from 'lucide-react';
import { initials } from '@/lib/format';

export function Logo({ className, inverted, compact }: { className?: string; inverted?: boolean; compact?: boolean }) {
  return (
    <span className={clsx('inline-flex items-center gap-2', className)} aria-label="Flyover">
      <svg viewBox="0 0 32 32" className="h-8 w-8 shrink-0" aria-hidden>
        <rect width="32" height="32" rx="8" fill={inverted ? '#FFFFFF' : '#17324D'} />
        <path d="M7 21.5c4.5-6.5 9.5-9.5 18-10.5" stroke="#B13A3E" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M7 15.5h9" stroke={inverted ? '#17324D' : '#FFFFFF'} strokeWidth="3" strokeLinecap="round" />
        <path d="M7 9.5h13" stroke={inverted ? '#17324D' : '#FFFFFF'} strokeWidth="3" strokeLinecap="round" />
      </svg>
      {!compact && (
        <span className={clsx('text-lg font-extrabold tracking-[0.12em]', inverted ? 'text-white' : 'text-navy-700')}>FLYOVER</span>
      )}
    </span>
  );
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span className={clsx('inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-100 text-sm font-semibold text-navy-700', className)} aria-hidden>
      {initials(name) || '?'}
    </span>
  );
}

export function CopyButton({ value, label = 'Copy', className, compact }: { value: string; label?: string; className?: string; compact?: boolean }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
        } catch {
          const t = document.createElement('textarea');
          t.value = value;
          document.body.appendChild(t);
          t.select();
          document.execCommand('copy');
          t.remove();
        }
        setDone(true);
        setTimeout(() => setDone(false), 1800);
      }}
      className={clsx(
        'inline-flex items-center justify-center gap-1.5 rounded-lg border border-line bg-white font-medium text-navy-700 hover:bg-mist',
        compact ? 'h-8 w-8' : 'h-8 px-3 text-sm',
        className,
      )}
      aria-label={compact ? `${label}: ${value}` : undefined}
    >
      {done ? <Check className="h-4 w-4 text-success-600" /> : <Copy className="h-4 w-4" />}
      {!compact && (done ? 'Copied' : label)}
      <span className="sr-only" aria-live="polite">
        {done ? 'Copied to clipboard' : ''}
      </span>
    </button>
  );
}

export function ShareButton({ url, title, className }: { url: string; title: string; className?: string }) {
  const can = typeof navigator !== 'undefined' && 'share' in navigator;
  if (!can) return null;
  return (
    <button
      type="button"
      onClick={() => navigator.share({ title, url }).catch(() => undefined)}
      className={clsx('inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-sm font-medium text-navy-700 hover:bg-mist', className)}
    >
      <Share2 className="h-4 w-4" /> Share
    </button>
  );
}

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div>
      {label && (
        <div className="mb-1.5 flex justify-between text-xs font-medium text-slate">
          <span>{label}</span>
          <span className="tabular-nums text-navy-700">{v}%</span>
        </div>
      )}
      <div className="h-2 overflow-hidden rounded-full bg-navy-50" role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className={clsx('h-full rounded-full transition-all', v === 100 ? 'bg-success-600' : 'bg-navy-700')} style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}

export function Steps({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex items-center gap-2 overflow-x-auto pb-1">
      {steps.map((s, i) => (
        <li key={s} className="flex shrink-0 items-center gap-2">
          <span
            className={clsx(
              'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold',
              i < current ? 'bg-success-600 text-white' : i === current ? 'bg-navy-700 text-white' : 'bg-mist text-slate ring-1 ring-line',
            )}
            aria-current={i === current ? 'step' : undefined}
          >
            {i < current ? <Check className="h-3.5 w-3.5" /> : i + 1}
          </span>
          <span className={clsx('text-sm font-medium', i === current ? 'text-navy-800' : 'text-slate')}>{s}</span>
          {i < steps.length - 1 && <span className="mx-1 h-px w-6 bg-line" aria-hidden />}
        </li>
      ))}
    </ol>
  );
}
