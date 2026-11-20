'use client';
import type { ReactNode } from 'react';
import { clsx } from 'clsx';
import { AlertTriangle, Info, CheckCircle2, XCircle, Construction, RefreshCw, Inbox } from 'lucide-react';
import { toneClasses, type StatusMeta, type Tone } from '@/lib/status';
import { errorMessage } from '@/lib/api-client';
import { Button } from './button';

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={clsx('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold', toneClasses[tone], className)}>
      {children}
    </span>
  );
}

export function StatusBadge<K extends string>({ map, value, withHelp }: { map: Record<K, StatusMeta>; value: K; withHelp?: boolean }) {
  const m = map[value] ?? { label: value, tone: 'neutral' as Tone };
  const dot: Record<Tone, string> = {
    neutral: 'bg-slate-light',
    info: 'bg-info-600',
    success: 'bg-success-600',
    warning: 'bg-warning-600',
    danger: 'bg-brick-500',
    brand: 'bg-navy-700',
  };
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Badge tone={m.tone}>
        <span className={clsx('h-1.5 w-1.5 rounded-full', dot[m.tone])} aria-hidden />
        {m.label}
      </Badge>
      {withHelp && m.help && <span className="text-xs text-slate">{m.help}</span>}
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <span className={clsx('inline-block h-5 w-5 animate-spin rounded-full border-2 border-navy-200 border-t-navy-700', className)} aria-label="Loading" />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('animate-pulse rounded-lg bg-navy-50', className)} aria-hidden />;
}

export function LoadingBlock({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx('flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-white px-6 py-12 text-center', className)}>
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-mist text-navy-400">{icon ?? <Inbox className="h-6 w-6" />}</div>
      <h3 className="text-base font-semibold text-navy-800">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-slate">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry, title = 'Could not load this' }: { error: unknown; onRetry?: () => void; title?: string }) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-2xl border border-brick-200 bg-brick-50/50 px-6 py-10 text-center">
      <XCircle className="mb-2 h-8 w-8 text-brick-500" aria-hidden />
      <h3 className="font-semibold text-navy-800">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-slate">{errorMessage(error)}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry} icon={<RefreshCw className="h-4 w-4" />}>
          Try again
        </Button>
      )}
    </div>
  );
}

const calloutIcon = { info: Info, success: CheckCircle2, warning: AlertTriangle, danger: XCircle, neutral: Info, brand: Info };
export function Callout({ tone = 'info', title, children, action, className }: { tone?: Tone; title?: string; children?: ReactNode; action?: ReactNode; className?: string }) {
  const Icon = calloutIcon[tone];
  return (
    <div className={clsx('flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-start', toneClasses[tone], className)}>
      <Icon className="h-5 w-5 shrink-0" aria-hidden />
      <div className="flex-1 text-sm">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={clsx(title && 'mt-0.5', 'opacity-90')}>{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** Marks UI that is designed but waiting for a backend endpoint (see docs/BACKEND_GAPS.md). */
export function ComingSoon({ title, children, endpoint }: { title: string; children?: ReactNode; endpoint?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-navy-200 bg-navy-50/50 p-5">
      <div className="flex items-center gap-2 text-navy-700">
        <Construction className="h-5 w-5" aria-hidden />
        <p className="font-semibold">{title}</p>
        <Badge tone="brand" className="ml-auto">
          Coming soon
        </Badge>
      </div>
      {children && <div className="mt-2 text-sm text-slate">{children}</div>}
      {endpoint && (
        <p className="mt-3 text-xs text-slate">
          Needs backend: <code className="rounded bg-white px-1.5 py-0.5 text-navy-700">{endpoint}</code>
        </p>
      )}
    </div>
  );
}
