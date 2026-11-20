'use client';
import { useState } from 'react';
import { z } from 'zod';
import { walletApi } from '@/lib/endpoints';
import { useApiMutation } from '@/lib/hooks';
import { formatMoney, parseAmount, toKobo } from '@/lib/format';
import { MIN_WITHDRAWAL } from '@/lib/config';
import { ApiError } from '@/lib/api-client';
import { Input, Select, FormError } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { DescriptionList } from '@/components/ui/layout';
import { Callout } from '@/components/ui/feedback';

const BANKS = ['Access Bank', 'Ecobank', 'Fidelity Bank', 'First Bank', 'FCMB', 'GTBank', 'Kuda', 'Moniepoint', 'OPay', 'PalmPay', 'Polaris Bank', 'Stanbic IBTC', 'Sterling Bank', 'UBA', 'Union Bank', 'Wema Bank', 'Zenith Bank', 'Other'];

const schema = z.object({
  amount: z.string(),
  bankName: z.string().min(2, 'Choose your bank'),
  otherBank: z.string().optional(),
  accountName: z.string().trim().min(2, 'Enter the name on the account'),
  accountNumber: z.string().trim().regex(/^\d{10}$/, 'Nigerian account numbers (NUBAN) are 10 digits'),
});

export function WithdrawForm({ available, onDone }: { available: number; onDone: () => void }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [bank, setBank] = useState('');
  const [review, setReview] = useState<null | { amount: number; bankName: string; accountName: string; accountNumber: string }>(null);
  const m = useApiMutation(walletApi.requestWithdrawal, {
    success: 'Withdrawal requested',
    successDescription: 'The amount is held from your available balance while Flyover processes it.',
    invalidate: [['wallet'], ['withdrawals'], ['analytics']],
    onSuccess: onDone,
  });

  if (review)
    return (
      <div className="space-y-5">
        <DescriptionList
          items={[
            { label: 'Amount', value: <span className="text-lg">{formatMoney(review.amount.toFixed(2))}</span> },
            { label: 'Bank', value: review.bankName },
            { label: 'Account name', value: review.accountName },
            { label: 'Account number', value: review.accountNumber },
          ]}
        />
        <Callout tone="warning">Double-check your account details. Payments sent to a wrong account may not be recoverable.</Callout>
        <FormError message={m.error ? (m.error as Error).message : null} />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => setReview(null)} disabled={m.isPending}>
            Edit details
          </Button>
          <Button loading={m.isPending} onClick={() => m.mutate(review)}>
            Confirm withdrawal
          </Button>
        </div>
      </div>
    );

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const parsed = schema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
        const errs: Record<string, string> = {};
        if (!parsed.success) parsed.error.issues.forEach((i) => (errs[i.path[0] as string] = i.message));
        const amt = parseAmount(String(new FormData(e.currentTarget).get('amount') ?? ''));
        if (!amt.ok) errs.amount = amt.message;
        else if (toKobo(amt.value) < toKobo(MIN_WITHDRAWAL)) errs.amount = `The minimum withdrawal is ${formatMoney(MIN_WITHDRAWAL)}.`;
        else if (toKobo(amt.value) > toKobo(available)) errs.amount = `You can withdraw up to ${formatMoney(available)}.`;
        const bankName = parsed.success ? (parsed.data.bankName === 'Other' ? parsed.data.otherBank?.trim() ?? '' : parsed.data.bankName) : '';
        if (parsed.success && bankName.length < 2) errs.otherBank = 'Enter your bank name';
        setErrors(errs);
        if (Object.keys(errs).length || !parsed.success || !amt.ok) return;
        setReview({ amount: amt.value, bankName, accountName: parsed.data.accountName, accountNumber: parsed.data.accountNumber });
      }}
    >
      <div className="rounded-xl bg-mist p-4 text-sm">
        <p className="text-slate">Available to withdraw</p>
        <p className="text-2xl font-bold tabular-nums text-navy-800">{formatMoney(available)}</p>
      </div>
      <Input
        label="Amount"
        name="amount"
        required
        inputMode="decimal"
        prefix="₦"
        placeholder="0.00"
        error={errors.amount}
        hint={`Minimum ${formatMoney(MIN_WITHDRAWAL)}. Pending commissions can't be withdrawn yet.`}
      />
      <Select label="Bank" name="bankName" required value={bank} onChange={(e) => setBank(e.target.value)} placeholder="Select your bank" options={BANKS.map((b) => ({ value: b, label: b }))} error={errors.bankName} />
      {bank === 'Other' && <Input label="Bank name" name="otherBank" required error={errors.otherBank} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Account number" name="accountNumber" required inputMode="numeric" maxLength={10} autoComplete="off" error={errors.accountNumber} />
        <Input label="Account name" name="accountName" required autoComplete="name" error={errors.accountName} />
      </div>
      <p className="text-xs text-slate">Automatic account-name verification is coming soon. Payouts are currently made manually by the Flyover finance team.</p>
      <FormError message={m.error && !(m.error instanceof ApiError && Object.keys(m.error.fieldErrors).length) ? (m.error as Error).message : null} />
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit">Review withdrawal</Button>
      </div>
    </form>
  );
}
