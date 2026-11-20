import type { Money } from './types';

/**
 * Money is display-only in the browser. Amounts arrive as decimal strings from the API and are
 * formatted without arithmetic. Intl.NumberFormat accepts numeric strings exactly (no float drift).
 * Commission maths happens ONLY on the server.
 */
export function formatMoney(value: Money | null | undefined, currency = 'NGN'): string {
  if (value === null || value === undefined || value === '') return '—';
  const f = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  // `format` accepts a decimal string in modern runtimes; the cast keeps older TS lib typings happy.
  return f.format(String(value) as unknown as number);
}

export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return new Intl.NumberFormat('en-NG').format(n);
}

export function formatPercent(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return '—';
  return `${n.toFixed(digits)}%`;
}

export function formatDate(iso: string | null | undefined, withTime = false): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

export function timeAgo(iso: string): string {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return formatDate(iso);
}

/** Validates a user-typed amount: positive, max 2 decimals. Returns a number for the JSON body. */
export function parseAmount(input: string): { ok: true; value: number } | { ok: false; message: string } {
  const s = input.replace(/,/g, '').trim();
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return { ok: false, message: 'Enter an amount with up to 2 decimal places.' };
  const value = Number(s);
  if (!(value > 0)) return { ok: false, message: 'Amount must be greater than zero.' };
  return { ok: true, value };
}

/** Compare a typed amount to a balance in kobo (integer) to avoid float comparison errors. */
export const toKobo = (v: Money) => Math.round(Number(v) * 100);

export function commissionLabel(type: 'PERCENTAGE' | 'FIXED' | null | undefined, value: Money | null | undefined, currency = 'NGN') {
  if (!type || value == null) return '—';
  return type === 'PERCENTAGE' ? `${Number(value)}%` : formatMoney(value, currency);
}

/** One-line payout summary that works for performance, fixed-fee and hybrid campaigns. */
export function payoutLabel(c: {
  compensationModel?: string;
  commissionType?: 'PERCENTAGE' | 'FIXED' | null;
  commissionValue?: Money | null;
  fixedFeeAmount?: Money | null;
  currency?: string;
}) {
  const cur = c.currency ?? 'NGN';
  const com = c.commissionType && c.commissionValue != null ? commissionLabel(c.commissionType, c.commissionValue, cur) : null;
  const fee = c.fixedFeeAmount != null ? formatMoney(c.fixedFeeAmount, cur) : null;
  if (c.compensationModel === 'FIXED_FEE') return fee ? `${fee} fixed fee` : '—';
  if (c.compensationModel === 'HYBRID') return [fee && `${fee} fee`, com && `+ ${com}`].filter(Boolean).join(' ') || '—';
  return com ?? '—';
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}
