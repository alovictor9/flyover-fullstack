'use client';
import { useQuery } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { notificationApi } from '@/lib/endpoints';
import { useApiMutation } from '@/lib/hooks';
import type { NotificationPreferences, NotificationType } from '@/lib/types';
import { Card, CardHeader } from '@/components/ui/layout';
import { ErrorState, LoadingBlock } from '@/components/ui/feedback';

const TYPES: { value: NotificationType; label: string }[] = [
  { value: 'BUSINESS_VERIFICATION', label: 'Business verification' },
  { value: 'CAMPAIGN', label: 'Campaigns' },
  { value: 'APPLICATION', label: 'Applications and invitations' },
  { value: 'CONVERSION', label: 'Conversions' },
  { value: 'COMMISSION', label: 'Commissions' },
  { value: 'WITHDRAWAL', label: 'Withdrawals' },
  { value: 'GENERAL', label: 'General updates' },
];

function Toggle({ checked, onChange, label, hint, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string; disabled?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-medium text-navy-800">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-slate">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={clsx('relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50', checked ? 'bg-navy-700' : 'bg-slate-light')}
      >
        <span className={clsx('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', checked ? 'left-[22px]' : 'left-0.5')} />
      </button>
    </div>
  );
}

export function NotificationPreferencesCard() {
  const q = useQuery({ queryKey: ['notification-preferences'], queryFn: notificationApi.preferences });
  const save = useApiMutation(notificationApi.updatePreferences, { success: 'Preferences saved', invalidate: [['notification-preferences']] });

  if (q.isLoading) return <LoadingBlock />;
  if (q.isError || !q.data) return <ErrorState error={q.error} onRetry={() => q.refetch()} title="Could not load your preferences" />;
  const p: NotificationPreferences = q.data;
  const muted = new Set(p.mutedTypes);
  const toggleType = (t: NotificationType, on: boolean) => {
    const next = new Set(muted);
    if (on) next.delete(t);
    else next.add(t);
    save.mutate({ mutedTypes: Array.from(next) });
  };

  return (
    <Card>
      <CardHeader title="Notification preferences" description="Choose how Flyover keeps you updated." />
      <div className="divide-y divide-line">
        <Toggle label="In-app notifications" hint="Show updates in this notification centre." checked={p.inAppEnabled} disabled={save.isPending} onChange={(v) => save.mutate({ inAppEnabled: v })} />
        <Toggle label="Email notifications" hint="Your choice is saved now. Email delivery starts once Flyover’s email service is switched on." checked={p.emailEnabled} disabled={save.isPending} onChange={(v) => save.mutate({ emailEnabled: v })} />
      </div>
      <h3 className="mb-1 mt-5 text-sm font-semibold text-navy-800">Tell me about</h3>
      <div className="divide-y divide-line">
        {TYPES.map((t) => (
          <Toggle key={t.value} label={t.label} checked={!muted.has(t.value)} disabled={save.isPending} onChange={(on) => toggleType(t.value, on)} />
        ))}
      </div>
    </Card>
  );
}
