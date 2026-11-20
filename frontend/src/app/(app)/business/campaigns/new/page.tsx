'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Percent, Banknote, Unlock, Lock, Mail, ShoppingCart, UserPlus, ClipboardList, Target, ShieldCheck } from 'lucide-react';
import { useMe } from '@/lib/auth';
import { campaignApi, productApi, programApi } from '@/lib/endpoints';
import { useToast } from '@/components/ui/toast';
import { errorMessage, ApiError } from '@/lib/api-client';
import { CATEGORIES, COUNTRIES, accessMode, attributionModel, campaignAction } from '@/lib/status';
import { parseAmount, payoutLabel, formatMoney } from '@/lib/format';
import type { CampaignAccess, CampaignAction, CampaignInput, CommissionType, CompensationModel, AttributionModel } from '@/lib/types';
import { Card, PageHeader, DescriptionList } from '@/components/ui/layout';
import { Steps } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { Input, Textarea, Select, ChoiceCards, FormError } from '@/components/ui/form';
import { Callout } from '@/components/ui/feedback';
import { RequireApprovedBusiness } from '@/components/profile/verification-banner';
import { CommissionHeadline } from '@/components/campaign/campaign-bits';

const STEPS = ['Brief', 'Commission', 'Access & tracking', 'Review'];

interface Draft {
  name: string;
  description: string;
  instructions: string;
  category: string;
  country: string;
  productId: string;
  destinationUrl: string;
  startsAt: string;
  endsAt: string;
  action: CampaignAction;
  commissionType: CommissionType;
  commissionValue: string;
  access: CampaignAccess;
  attributionModel: AttributionModel;
  attributionDays: string;
  validationDays: string;
  compensationModel: CompensationModel;
  fixedFeeAmount: string;
  requiredDeliverables: string;
  programId: string;
}

function Builder() {
  const me = useMe();
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();
  const toast = useToast();
  const products = useQuery({ queryKey: ['products'], queryFn: productApi.list, enabled: me.business!.status === 'APPROVED' });
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState<'draft' | 'submit' | null>(null);
  const [d, setD] = useState<Draft>({
    name: '',
    description: '',
    instructions: '',
    category: '',
    country: 'Nigeria',
    productId: params.get('product') ?? '',
    destinationUrl: '',
    startsAt: '',
    endsAt: '',
    action: 'CPS',
    commissionType: 'PERCENTAGE',
    commissionValue: '',
    access: 'OPEN',
    attributionModel: 'LAST_CLICK',
    attributionDays: '30',
    validationDays: '14',
    compensationModel: 'PERFORMANCE',
    fixedFeeAmount: '',
    requiredDeliverables: '1',
    programId: '',
  });
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => (setD((x) => ({ ...x, [k]: v })), setErrors((e) => ({ ...e, [k]: '' })));
  const product = products.data?.find((p) => p.id === d.productId);
  const programs = useQuery({ queryKey: ['programs'], queryFn: programApi.list, enabled: me.business!.status === 'APPROVED' && d.access === 'PRIVATE' });

  function validate(s: number): boolean {
    const e: Record<string, string> = {};
    if (s === 0) {
      if (d.name.trim().length < 3) e.name = 'Give the campaign a name (at least 3 characters).';
      if (d.description.trim().length < 10) e.description = 'Describe the offer in at least 10 characters.';
      if (d.destinationUrl && !/^https?:\/\/\S+\.\S+/.test(d.destinationUrl)) e.destinationUrl = 'Enter a full URL starting with https://';
      if (!d.destinationUrl && !product?.destinationUrl) e.destinationUrl = 'Add the page affiliates should send customers to.';
      if (d.startsAt && d.endsAt && d.endsAt < d.startsAt) e.endsAt = 'End date must be after the start date.';
    }
    if (s === 1) {
      if (d.compensationModel !== 'FIXED_FEE') {
        const p = parseAmount(d.commissionValue);
        if (!p.ok) e.commissionValue = p.message;
        else if (d.commissionType === 'PERCENTAGE' && p.value > 100) e.commissionValue = 'A percentage commission cannot exceed 100%.';
      }
      if (d.compensationModel !== 'PERFORMANCE') {
        const f = parseAmount(d.fixedFeeAmount);
        if (!f.ok) e.fixedFeeAmount = f.message;
        const n = Number(d.requiredDeliverables);
        if (!Number.isInteger(n) || n < 1 || n > 50) e.requiredDeliverables = 'Choose between 1 and 50 deliverables.';
      }
    }
    if (s === 2) {
      const a = Number(d.attributionDays);
      const v = Number(d.validationDays);
      if (!Number.isInteger(a) || a < 1 || a > 90) e.attributionDays = 'Choose between 1 and 90 days.';
      if (!Number.isInteger(v) || v < 0 || v > 180) e.validationDays = 'Choose between 0 and 180 days.';
    }
    if (s === 2 && d.access === 'PRIVATE' && !d.programId) e.programId = 'Choose the programme this campaign belongs to.';
    setErrors(e);
    return Object.values(e).every((x) => !x);
  }

  function payload(): CampaignInput {
    return {
      name: d.name.trim(),
      description: d.description.trim(),
      instructions: d.instructions.trim() || undefined,
      category: d.category || undefined,
      country: d.country,
      productId: d.productId || undefined,
      destinationUrl: d.destinationUrl || product?.destinationUrl || undefined,
      startsAt: d.startsAt ? new Date(d.startsAt).toISOString() : undefined,
      endsAt: d.endsAt ? new Date(d.endsAt).toISOString() : undefined,
      action: d.action,
      compensationModel: d.compensationModel,
      ...(d.compensationModel !== 'FIXED_FEE'
        ? { commissionType: d.commissionType, commissionValue: (parseAmount(d.commissionValue) as { value: number }).value }
        : {}),
      ...(d.compensationModel !== 'PERFORMANCE'
        ? { fixedFeeAmount: (parseAmount(d.fixedFeeAmount) as { value: number }).value, requiredDeliverables: Number(d.requiredDeliverables) }
        : {}),
      currency: 'NGN',
      access: d.access,
      ...(d.access === 'PRIVATE' ? { programId: d.programId } : {}),
      attributionModel: d.attributionModel,
      attributionDays: Number(d.attributionDays),
      validationDays: Number(d.validationDays),
    };
  }

  async function save(submit: boolean) {
    setFormError(null);
    setSaving(submit ? 'submit' : 'draft');
    try {
      const c = await campaignApi.create(payload());
      if (submit) await campaignApi.submit(c.id);
      await qc.invalidateQueries({ queryKey: ['campaigns'] });
      toast({ tone: 'success', title: submit ? 'Campaign submitted for review' : 'Draft saved', description: submit ? 'Flyover will review it shortly. You’ll be notified of the decision.' : 'You can submit it for review any time.' });
      router.replace(`/business/campaigns/${c.id}`);
    } catch (e) {
      setFormError(errorMessage(e));
      if (e instanceof ApiError) setErrors(e.fieldErrors);
      setSaving(null);
    }
  }

  const sampleSale = 50000;
  const v = parseAmount(d.commissionValue);
  const fee = parseAmount(d.fixedFeeAmount);
  const example = v.ok ? (d.commissionType === 'PERCENTAGE' ? (sampleSale * v.value) / 100 : v.value) : null;

  return (
    <>
      <PageHeader title="Create a campaign" back={{ href: '/business/campaigns', label: 'Campaigns' }} description="Campaigns are reviewed by Flyover before they appear in the marketplace." />
      <RequireApprovedBusiness profile={me.business!} what="create campaigns">
        <div className="mb-6">
          <Steps steps={STEPS} current={step} />
        </div>
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <Card>
            {step === 0 && (
              <div className="space-y-4">
                <Input label="Campaign name" required value={d.name} onChange={(e) => set('name', e.target.value)} error={errors.name} placeholder="e.g. Galaxy A55 launch — 8% per sale" maxLength={120} />
                <Textarea label="Campaign brief" required value={d.description} onChange={(e) => set('description', e.target.value)} error={errors.description} rows={4} placeholder="What are affiliates promoting, who is it for, and why will their audience care?" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Select label="Product" value={d.productId} onChange={(e) => set('productId', e.target.value)} placeholder={products.data?.length ? 'No specific product' : 'No products yet'} options={(products.data ?? []).map((p) => ({ value: p.id, label: p.name }))} hint={!products.data?.length ? 'Add products on the Products page.' : undefined} />
                  <Select label="Category" value={d.category} onChange={(e) => set('category', e.target.value)} placeholder="Select…" options={CATEGORIES.map((c) => ({ value: c, label: c }))} />
                </div>
                <Input
                  label="Landing page URL"
                  type="url"
                  required={!product?.destinationUrl}
                  value={d.destinationUrl}
                  onChange={(e) => set('destinationUrl', e.target.value)}
                  error={errors.destinationUrl}
                  placeholder={product?.destinationUrl ?? 'https://'}
                  hint={product?.destinationUrl ? 'Leave blank to use the product page.' : 'Referral links redirect customers here.'}
                />
                <div className="grid gap-4 sm:grid-cols-3">
                  <Select label="Target country" value={d.country} onChange={(e) => set('country', e.target.value)} options={COUNTRIES.map((c) => ({ value: c, label: c }))} />
                  <Input label="Starts" type="date" value={d.startsAt} onChange={(e) => set('startsAt', e.target.value)} hint="Optional" />
                  <Input label="Ends" type="date" value={d.endsAt} onChange={(e) => set('endsAt', e.target.value)} error={errors.endsAt} hint="Optional" />
                </div>
              </div>
            )}
            {step === 1 && (
              <div className="space-y-6">
                <ChoiceCards
                  label="How will you pay affiliates?"
                  value={d.compensationModel}
                  onChange={(v) => set('compensationModel', v)}
                  columns={3}
                  options={[
                    { value: 'PERFORMANCE', title: 'Performance', description: 'Commission on each verified conversion.', icon: <Target className="h-4 w-4" /> },
                    { value: 'FIXED_FEE', title: 'Fixed fee', description: 'A set fee for approved creator content.', icon: <Banknote className="h-4 w-4" /> },
                    { value: 'HYBRID', title: 'Hybrid', description: 'A fixed fee plus commission on results.', icon: <Percent className="h-4 w-4" /> },
                  ]}
                />
                {d.compensationModel !== 'FIXED_FEE' && (
                  <div className="space-y-6">
                <ChoiceCards
                  label="What do you pay for?"
                  value={d.action}
                  onChange={(v) => set('action', v)}
                  columns={4}
                  options={(['CPS', 'CPL', 'CPR', 'CPA'] as const).map((a) => ({
                    value: a,
                    title: campaignAction[a].label,
                    description: campaignAction[a].help,
                    icon: { CPS: <ShoppingCart className="h-4 w-4" />, CPL: <ClipboardList className="h-4 w-4" />, CPR: <UserPlus className="h-4 w-4" />, CPA: <Target className="h-4 w-4" /> }[a],
                  }))}
                />
                <ChoiceCards
                  label="How is commission calculated?"
                  value={d.commissionType}
                  onChange={(v) => set('commissionType', v)}
                  options={[
                    { value: 'PERCENTAGE', title: 'Percentage', description: 'A % of the verified sale value.', icon: <Percent className="h-4 w-4" /> },
                    { value: 'FIXED', title: 'Fixed amount', description: 'The same naira amount per conversion.', icon: <Banknote className="h-4 w-4" /> },
                  ]}
                />
                <Input
                  label={d.commissionType === 'PERCENTAGE' ? 'Commission rate' : 'Commission per conversion'}
                  required
                  inputMode="decimal"
                  value={d.commissionValue}
                  onChange={(e) => set('commissionValue', e.target.value)}
                  error={errors.commissionValue}
                  prefix={d.commissionType === 'FIXED' ? '₦' : undefined}
                  suffix={d.commissionType === 'PERCENTAGE' ? '%' : undefined}
                  placeholder={d.commissionType === 'PERCENTAGE' ? '10' : '2000'}
                />
                {example !== null && d.commissionType === 'PERCENTAGE' && (
                  <Callout tone="info">
                    Example: on a {formatMoney(sampleSale)} sale an affiliate earns {formatMoney(example.toFixed(2))}. Final amounts are always calculated by Flyover.
                  </Callout>
                )}
                  </div>
                )}
                {d.compensationModel !== 'PERFORMANCE' && (
                  <div className="space-y-4">
                    <Input label="Fixed fee" required inputMode="decimal" prefix="₦" value={d.fixedFeeAmount} onChange={(e) => set('fixedFeeAmount', e.target.value)} error={errors.fixedFeeAmount} hint="Paid to the creator once the deliverables are approved." />
                    <Input label="Deliverables required" required inputMode="numeric" value={d.requiredDeliverables} onChange={(e) => set('requiredDeliverables', e.target.value)} error={errors.requiredDeliverables} hint="How many approved pieces of content earn the fee." />
                    <Callout tone="neutral">Creators submit content links for your review. Flyover records the payment status; it does not move money for you.</Callout>
                  </div>
                )}
              </div>
            )}
            {step === 2 && (
              <div className="space-y-6">
                <ChoiceCards
                  label="Who can promote this campaign?"
                  value={d.access}
                  onChange={(v) => set('access', v)}
                  columns={4}
                  options={[
                    { value: 'OPEN', title: accessMode.OPEN.label, description: accessMode.OPEN.help, icon: <Unlock className="h-4 w-4" /> },
                    { value: 'APPROVAL', title: accessMode.APPROVAL.label, description: accessMode.APPROVAL.help, icon: <Lock className="h-4 w-4" /> },
                    { value: 'INVITATION', title: accessMode.INVITATION.label, description: 'Only affiliates you invite. Sending invites is coming soon.', icon: <Mail className="h-4 w-4" />, badge: 'Soon' },
                    { value: 'PRIVATE', title: accessMode.PRIVATE.label, description: accessMode.PRIVATE.help, icon: <ShieldCheck className="h-4 w-4" /> },
                  ]}
                />
                {d.access === 'PRIVATE' && (
                  <Select
                    label="Affiliate programme"
                    value={d.programId}
                    onChange={(e) => set('programId', e.target.value)}
                    placeholder={programs.isLoading ? 'Loading programmes…' : (programs.data ?? []).some((p) => p.status === 'ACTIVE') ? 'Choose a programme' : 'No active programmes yet'}
                    options={(programs.data ?? []).filter((p) => p.status === 'ACTIVE').map((p) => ({ value: p.id, label: p.name }))}
                    error={errors.programId}
                    hint="Only approved members of this programme can see and join the campaign."
                  />
                )}
                <ChoiceCards
                  label="Attribution model"
                  value={d.attributionModel}
                  onChange={(v) => set('attributionModel', v)}
                  options={(['LAST_CLICK', 'FIRST_CLICK'] as const).map((m) => ({ value: m, title: attributionModel[m].label, description: attributionModel[m].help }))}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="Attribution window" inputMode="numeric" suffix="days" value={d.attributionDays} onChange={(e) => set('attributionDays', e.target.value)} error={errors.attributionDays} hint="How long after a click a conversion still counts (1–90)." />
                  <Input label="Validation period" inputMode="numeric" suffix="days" value={d.validationDays} onChange={(e) => set('validationDays', e.target.value)} error={errors.validationDays} hint="Time to catch refunds before commission becomes withdrawable (0–180)." />
                </div>
                <Textarea label="Instructions for affiliates" value={d.instructions} onChange={(e) => set('instructions', e.target.value)} rows={4} placeholder="Do's and don'ts, key messages, brand guidelines, prohibited channels…" />
              </div>
            )}
            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-bold text-navy-800">{d.name}</h2>
                  <p className="mt-1 whitespace-pre-line text-sm text-slate">{d.description}</p>
                </div>
                <DescriptionList
                  items={[
                    { label: 'Product', value: product?.name ?? '—' },
                    { label: 'Category', value: d.category || '—' },
                    { label: 'Landing page', value: <span className="break-all">{d.destinationUrl || product?.destinationUrl}</span> },
                    { label: 'Payout', value: `${payoutLabel({ compensationModel: d.compensationModel, commissionType: d.commissionType, commissionValue: v.ok ? String(v.value) : null, fixedFeeAmount: fee.ok ? String(fee.value) : null })}${d.compensationModel === 'FIXED_FEE' ? '' : ' · ' + campaignAction[d.action].label}` },
                    { label: 'Access', value: accessMode[d.access].label },
                    { label: 'Attribution', value: `${attributionModel[d.attributionModel].label}, ${d.attributionDays} days` },
                    { label: 'Validation', value: `${d.validationDays} days` },
                    { label: 'Country', value: d.country },
                  ]}
                />
                {d.instructions && (
                  <div>
                    <p className="text-sm font-medium text-navy-700">Instructions</p>
                    <p className="mt-1 whitespace-pre-line text-sm text-slate">{d.instructions}</p>
                  </div>
                )}
                <Callout tone="warning">After you submit, the campaign is locked while Flyover reviews it. Only commission rate, brief, instructions, access and landing page can be edited later.</Callout>
                <FormError message={formError} />
              </div>
            )}

            <div className="mt-8 flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:justify-between">
              <Button variant="ghost" onClick={() => (step === 0 ? router.push('/business/campaigns') : setStep(step - 1))} disabled={!!saving}>
                {step === 0 ? 'Cancel' : 'Back'}
              </Button>
              {step < 3 ? (
                <Button onClick={() => validate(step) && setStep(step + 1)}>Continue</Button>
              ) : (
                <div className="flex flex-col-reverse gap-2 sm:flex-row">
                  <Button variant="secondary" loading={saving === 'draft'} disabled={!!saving} onClick={() => save(false)}>
                    Save as draft
                  </Button>
                  <Button loading={saving === 'submit'} disabled={!!saving} onClick={() => save(true)}>
                    Submit for review
                  </Button>
                </div>
              )}
            </div>
          </Card>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate">Marketplace preview</p>
            <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
              <p className="text-xs font-medium text-slate">{me.business!.name}</p>
              <h3 className="mt-1 font-semibold text-navy-800">{d.name || 'Your campaign name'}</h3>
              <p className="mt-1 line-clamp-3 text-sm text-slate">{d.description || 'Your campaign brief appears here.'}</p>
              <div className="mt-4">
                <CommissionHeadline c={{ compensationModel: d.compensationModel, fixedFeeAmount: fee.ok ? String(fee.value) : null, commissionType: d.commissionType, commissionValue: v.ok ? String(v.value) : '0', currency: 'NGN', action: d.action }} />
              </div>
            </div>
          </aside>
        </div>
      </RequireApprovedBusiness>
    </>
  );
}

export default function NewCampaignPage() {
  return (
    <Suspense>
      <Builder />
    </Suspense>
  );
}
