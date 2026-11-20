'use client';
import { Lock, Unlock, Mail, Clock, MousePointerClick, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/feedback';
import { DescriptionList } from '@/components/ui/layout';
import { accessMode, attributionModel, campaignAction } from '@/lib/status';
import { commissionLabel, formatDate, formatMoney, payoutLabel } from '@/lib/format';
import type { Campaign, CampaignAccess } from '@/lib/types';

export function AccessBadge({ access }: { access: CampaignAccess }) {
  const Icon = access === 'OPEN' ? Unlock : access === 'APPROVAL' || access === 'PRIVATE' ? Lock : Mail;
  return (
    <Badge tone={access === 'OPEN' ? 'success' : access === 'APPROVAL' ? 'warning' : 'brand'}>
      <Icon className="h-3 w-3" aria-hidden />
      {accessMode[access].label}
    </Badge>
  );
}

/** Big headline commission, e.g. "8%  per sale" or "₦4,000.00 per sign-up". */
export function CommissionHeadline({ c, size = 'md' }: { c: Pick<Campaign, 'commissionType' | 'commissionValue' | 'currency' | 'action' | 'compensationModel' | 'fixedFeeAmount'>; size?: 'md' | 'lg' }) {
  return (
    <p className="flex items-baseline gap-1.5">
      <span className={size === 'lg' ? 'text-3xl font-extrabold text-brick-500' : 'text-xl font-bold text-brick-500'}>{payoutLabel(c)}</span>
      {c.compensationModel !== 'FIXED_FEE' && <span className="text-sm font-medium text-slate">{campaignAction[c.action].short.toLowerCase()}</span>}
    </p>
  );
}

export function CampaignTerms({ c }: { c: Campaign }) {
  return (
    <DescriptionList
      items={[
        { label: 'Payout model', value: `${campaignAction[c.action].label} (${c.action})` },
        ...(c.commissionType && c.commissionValue != null
          ? [{ label: 'Commission', value: c.commissionType === 'PERCENTAGE' ? `${Number(c.commissionValue)}% of verified sale value` : `${commissionLabel('FIXED', c.commissionValue, c.currency)} fixed per conversion` }]
          : []),
        ...(c.fixedFeeAmount != null
          ? [{ label: 'Fixed fee', value: `${formatMoney(c.fixedFeeAmount, c.currency)} for ${c.requiredDeliverables ?? 1} approved deliverable${(c.requiredDeliverables ?? 1) === 1 ? '' : 's'}` }]
          : []),
        { label: 'Who can join', value: accessMode[c.access].help },
        { label: 'Attribution', value: `${attributionModel[c.attributionModel].label} · ${c.attributionDays}-day window` },
        { label: 'Validation period', value: c.validationDays === 0 ? 'None — commission can be released right after approval' : `${c.validationDays} days after approval before commission becomes withdrawable` },
        { label: 'Country', value: c.country },
        ...(c.startsAt || c.endsAt ? [{ label: 'Runs', value: `${formatDate(c.startsAt) } → ${formatDate(c.endsAt)}` }] : []),
      ]}
    />
  );
}

export function TrustStrip({ c }: { c: Campaign }) {
  return (
    <ul className="grid gap-3 text-sm sm:grid-cols-3">
      <li className="flex items-start gap-2">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success-600" aria-hidden />
        <span className="text-slate">Verified business, campaign reviewed by Flyover</span>
      </li>
      <li className="flex items-start gap-2">
        <MousePointerClick className="mt-0.5 h-4 w-4 shrink-0 text-navy-500" aria-hidden />
        <span className="text-slate">{c.attributionDays}-day {attributionModel[c.attributionModel].label.toLowerCase()} tracking</span>
      </li>
      <li className="flex items-start gap-2">
        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-warning-600" aria-hidden />
        <span className="text-slate">{c.validationDays === 0 ? 'Commission available right after approval' : `Commission available ${c.validationDays} days after approval`}</span>
      </li>
    </ul>
  );
}
