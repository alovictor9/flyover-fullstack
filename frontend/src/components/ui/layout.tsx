'use client';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { clsx } from 'clsx';
import { ChevronLeft } from 'lucide-react';

export function Card({ children, className, padded = true }: { children: ReactNode; className?: string; padded?: boolean }) {
  return <section className={clsx('rounded-2xl border border-line bg-white shadow-card', padded && 'p-5 sm:p-6', className)}>{children}</section>;
}

export function CardHeader({ title, description, action }: { title: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold text-navy-800">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-slate">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  back,
  eyebrow,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
  eyebrow?: string;
}) {
  return (
    <header className="mb-6">
      {back && (
        <Link href={back.href} className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-slate hover:text-navy-700">
          <ChevronLeft className="h-4 w-4" aria-hidden />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-brick-500">{eyebrow}</p>}
          <h1 className="text-2xl font-bold tracking-tight text-navy-700 sm:text-[28px]">{title}</h1>
          {description && <p className="mt-1 max-w-2xl text-sm text-slate sm:text-base">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'default',
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: 'default' | 'brand' | 'accent';
}) {
  return (
    <div
      className={clsx(
        'rounded-2xl border p-5',
        tone === 'brand' ? 'border-navy-700 bg-navy-700 text-white' : tone === 'accent' ? 'border-brick-100 bg-brick-50' : 'border-line bg-white shadow-card',
      )}
    >
      <div className="flex items-center justify-between">
        <p className={clsx('text-sm font-medium', tone === 'brand' ? 'text-navy-100' : 'text-slate')}>{label}</p>
        {icon && <span className={clsx(tone === 'brand' ? 'text-navy-200' : 'text-navy-300')}>{icon}</span>}
      </div>
      <p className={clsx('mt-2 text-2xl font-bold tracking-tight tabular-nums', tone === 'brand' ? 'text-white' : 'text-navy-800')}>{value}</p>
      {hint && <p className={clsx('mt-1 text-xs', tone === 'brand' ? 'text-navy-200' : 'text-slate')}>{hint}</p>}
    </div>
  );
}

export function Tabs<V extends string>({
  value,
  onChange,
  tabs,
  className,
}: {
  value: V;
  onChange: (v: V) => void;
  tabs: { value: V; label: string; count?: number }[];
  className?: string;
}) {
  return (
    <div role="tablist" className={clsx('-mx-1 flex gap-1 overflow-x-auto px-1 pb-1', className)}>
      {tabs.map((t) => {
        const on = t.value === value;
        return (
          <button
            key={t.value}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(t.value)}
            className={clsx(
              'inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
              on ? 'bg-navy-700 text-white' : 'bg-white text-slate ring-1 ring-line hover:text-navy-700',
            )}
          >
            {t.label}
            {t.count !== undefined && (
              <span className={clsx('rounded-full px-1.5 text-xs tabular-nums', on ? 'bg-white/20' : 'bg-mist')}>{t.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Responsive table: real table on desktop, stacked cards on mobile. */
export interface Column<R> {
  key: string;
  header: string;
  cell: (row: R) => ReactNode;
  className?: string;
  /** hide this column in the mobile card view */
  hideOnMobile?: boolean;
  align?: 'left' | 'right';
}

export function DataTable<R>({
  rows,
  columns,
  rowKey,
  onRowClick,
  caption,
}: {
  rows: R[];
  columns: Column<R>[];
  rowKey: (r: R) => string;
  onRowClick?: (r: R) => void;
  caption?: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
      <table className="hidden w-full text-sm md:table">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead className="border-b border-line bg-mist/60">
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" className={clsx('px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate', c.align === 'right' ? 'text-right' : 'text-left', c.className)}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => (
            <tr
              key={rowKey(r)}
              onClick={onRowClick ? () => onRowClick(r) : undefined}
              onKeyDown={onRowClick ? (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onRowClick(r)) : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              className={clsx(onRowClick && 'cursor-pointer hover:bg-mist/60 focus:bg-mist focus:outline-none')}
            >
              {columns.map((c) => (
                <td key={c.key} className={clsx('px-4 py-3 align-middle text-navy-800', c.align === 'right' && 'text-right', c.className)}>
                  {c.cell(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="divide-y divide-line md:hidden">
        {rows.map((r) => (
          <li key={rowKey(r)}>
            <div
              role={onRowClick ? 'button' : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              onClick={onRowClick ? () => onRowClick(r) : undefined}
              onKeyDown={onRowClick ? (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onRowClick(r)) : undefined}
              className={clsx('space-y-2 p-4', onRowClick && 'active:bg-mist')}
            >
              {columns
                .filter((c) => !c.hideOnMobile)
                .map((c, i) => (
                  <div key={c.key} className={clsx('flex items-start justify-between gap-3 text-sm', i === 0 && 'font-semibold')}>
                    {i > 0 && <span className="shrink-0 text-xs text-slate">{c.header}</span>}
                    <span className={clsx('min-w-0', i > 0 && 'text-right')}>{c.cell(r)}</span>
                  </div>
                ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DescriptionList({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="divide-y divide-line">
      {items.map((i) => (
        <div key={i.label} className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:justify-between sm:gap-4">
          <dt className="text-sm text-slate">{i.label}</dt>
          <dd className="text-sm font-medium text-navy-800 sm:text-right">{i.value}</dd>
        </div>
      ))}
    </dl>
  );
}
