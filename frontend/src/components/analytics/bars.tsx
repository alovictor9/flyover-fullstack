'use client';
import { formatNumber } from '@/lib/format';

/** Minimal accessible horizontal bar list (no chart library — keeps the PWA light). */
export function BarList({ items, valueLabel = (n: number) => formatNumber(n) }: { items: { label: string; value: number; tone?: string }[]; valueLabel?: (n: number) => string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-3">
      {items.map((i) => (
        <li key={i.label}>
          <div className="mb-1 flex justify-between gap-3 text-sm">
            <span className="truncate text-navy-700">{i.label}</span>
            <span className="shrink-0 font-semibold tabular-nums text-navy-800">{valueLabel(i.value)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-navy-50" aria-hidden>
            <div className={`h-full rounded-full ${i.tone ?? 'bg-navy-700'}`} style={{ width: `${(i.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Funnel: clicks → conversions → approved */
export function Funnel({ steps }: { steps: { label: string; value: number }[] }) {
  const top = Math.max(1, steps[0]?.value ?? 1);
  return (
    <ol className="space-y-2">
      {steps.map((s, i) => {
        const pct = (s.value / top) * 100;
        const prev = i > 0 ? steps[i - 1]!.value : null;
        return (
          <li key={s.label} className="flex items-center gap-3">
            <div className="relative h-10 flex-1 overflow-hidden rounded-xl bg-mist">
              <div className="absolute inset-y-0 left-0 rounded-xl bg-navy-700/90" style={{ width: `${Math.max(pct, 2)}%` }} />
              <span className="relative flex h-full items-center px-3 text-sm font-semibold text-white mix-blend-difference">{s.label}</span>
            </div>
            <div className="w-24 text-right">
              <p className="font-bold tabular-nums text-navy-800">{formatNumber(s.value)}</p>
              {prev !== null && <p className="text-[11px] text-slate">{prev ? ((s.value / prev) * 100).toFixed(1) : '0.0'}% of prev.</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
