import type {
  ApplicationStatus,
  BusinessStatus,
  CampaignAccess,
  CampaignAction,
  CampaignStatus,
  CommissionStatus,
  ConversionStatus,
  LedgerType,
  WithdrawalStatus,
  AttributionModel,
} from './types';

/** Shared status vocabulary: one label + tone + plain-English explanation per backend status. */
export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'brand';
export interface StatusMeta {
  label: string;
  tone: Tone;
  help?: string;
}

export const businessStatus: Record<BusinessStatus, StatusMeta> = {
  PENDING: { label: 'Pending review', tone: 'warning', help: 'Your verification details are with the Flyover team.' },
  APPROVED: { label: 'Verified', tone: 'success', help: 'You can create products and publish campaigns.' },
  REJECTED: { label: 'Rejected', tone: 'danger', help: 'Update your details and submit again.' },
  SUSPENDED: { label: 'Suspended', tone: 'danger', help: 'Contact support to restore access.' },
};

export const campaignStatus: Record<CampaignStatus, StatusMeta> = {
  DRAFT: { label: 'Draft', tone: 'neutral', help: 'Only you can see this. Submit it for review when ready.' },
  PENDING: { label: 'In review', tone: 'warning', help: 'Flyover is reviewing this campaign. You cannot edit it right now.' },
  APPROVED: { label: 'Live', tone: 'success', help: 'Visible in the marketplace. Affiliates can join.' },
  REJECTED: { label: 'Rejected', tone: 'danger', help: 'Edit the campaign to address the reason, then resubmit.' },
  SUSPENDED: { label: 'Suspended', tone: 'danger', help: 'Hidden from the marketplace and links stop redirecting.' },
  ENDED: { label: 'Ended', tone: 'neutral', help: 'This campaign has finished.' },
};

export const applicationStatus: Record<ApplicationStatus, StatusMeta> = {
  PENDING: { label: 'Awaiting approval', tone: 'warning', help: 'The business is reviewing your application.' },
  APPROVED: { label: 'Joined', tone: 'success', help: 'You have a referral link for this campaign.' },
  REJECTED: { label: 'Declined', tone: 'danger', help: 'The business declined this application.' },
  INVITED: { label: 'Invited', tone: 'info', help: 'You have been invited to this campaign.' },
};

export const conversionStatus: Record<ConversionStatus, StatusMeta> = {
  PENDING: { label: 'Pending', tone: 'warning', help: 'The business has recorded this sale/lead and is verifying it.' },
  APPROVED: { label: 'Approved', tone: 'success', help: 'Verified. A commission was created and is in its validation period.' },
  REJECTED: { label: 'Rejected', tone: 'danger', help: 'The business did not accept this conversion. A reason is recorded.' },
  REVERSED: { label: 'Reversed', tone: 'danger', help: 'A previously approved conversion was reversed (e.g. a refund).' },
  DISPUTED: { label: 'Disputed', tone: 'info', help: 'This conversion is under dispute and is being investigated.' },
};

export const commissionStatus: Record<CommissionStatus, StatusMeta> = {
  PENDING: { label: 'Pending', tone: 'warning', help: 'In the validation period. Not yet withdrawable.' },
  AVAILABLE: { label: 'Available', tone: 'success', help: 'Released to your available balance.' },
  REVERSED: { label: 'Reversed', tone: 'danger' },
};

export const withdrawalStatus: Record<WithdrawalStatus, StatusMeta> = {
  PENDING: { label: 'Requested', tone: 'warning', help: 'Waiting for the Flyover finance team.' },
  APPROVED: { label: 'Approved', tone: 'info', help: 'Approved and queued for payment.' },
  PROCESSING: { label: 'Processing', tone: 'info', help: 'Payment is being made.' },
  PAID: { label: 'Paid', tone: 'success', help: 'Payment sent. See the payment reference.' },
  REJECTED: { label: 'Rejected', tone: 'danger', help: 'Not paid. The amount was returned to your available balance.' },
  FAILED: { label: 'Failed', tone: 'danger', help: 'Payment failed. The amount was returned to your available balance.' },
};

export const ledgerType: Record<LedgerType, { label: string; sign: 1 | -1 | 0; bucket: string }> = {
  PENDING_CREDIT: { label: 'Commission earned (pending)', sign: 1, bucket: 'Pending' },
  PENDING_DEBIT: { label: 'Moved out of pending', sign: -1, bucket: 'Pending' },
  AVAILABLE_CREDIT: { label: 'Commission released', sign: 1, bucket: 'Available' },
  AVAILABLE_DEBIT: { label: 'Withdrawal requested', sign: -1, bucket: 'Available' },
  WITHDRAWAL_RESERVED: { label: 'Withdrawal reserved', sign: -1, bucket: 'Available' },
  WITHDRAWAL_RELEASED: { label: 'Withdrawal returned', sign: 1, bucket: 'Available' },
  WITHDRAWN: { label: 'Paid out', sign: 0, bucket: 'Withdrawn' },
  REVERSAL: { label: 'Reversal', sign: -1, bucket: 'Reversed' },
};

export const accessMode: Record<CampaignAccess, { label: string; help: string }> = {
  OPEN: { label: 'Open', help: 'Any affiliate can join instantly and get a link.' },
  APPROVAL: { label: 'Application', help: 'Affiliates apply; you approve who can promote.' },
  INVITATION: { label: 'Invite only', help: 'Only affiliates you invite can join.' },
  PRIVATE: { label: 'Private programme', help: 'Only approved members of your affiliate programme can see and join.' },
};

export const campaignAction: Record<CampaignAction, { label: string; short: string; help: string }> = {
  CPS: { label: 'Cost per sale', short: 'Per sale', help: 'Pay when a referred customer buys.' },
  CPL: { label: 'Cost per lead', short: 'Per lead', help: 'Pay for a qualified lead (e.g. a sign-up form).' },
  CPR: { label: 'Cost per registration', short: 'Per sign-up', help: 'Pay when a referred user registers.' },
  CPA: { label: 'Cost per action', short: 'Per action', help: 'Pay for a specific action you define.' },
};

export const attributionModel: Record<AttributionModel, { label: string; help: string }> = {
  LAST_CLICK: { label: 'Last click', help: 'Credit goes to the last affiliate link clicked before conversion.' },
  FIRST_CLICK: { label: 'First click', help: 'Credit goes to the first affiliate link the customer clicked.' },
};

export const toneClasses: Record<Tone, string> = {
  neutral: 'bg-mist text-slate border-line',
  info: 'bg-info-50 text-info-600 border-info-600/20',
  success: 'bg-success-50 text-success-700 border-success-600/20',
  warning: 'bg-warning-50 text-warning-700 border-warning-600/25',
  danger: 'bg-brick-50 text-brick-600 border-brick-500/25',
  brand: 'bg-navy-50 text-navy-700 border-navy-200',
};

export const CATEGORIES = [
  'Fashion',
  'Beauty',
  'Electronics',
  'Fintech',
  'Education',
  'Food & Drink',
  'Health & Fitness',
  'Travel',
  'Real Estate',
  'Software & SaaS',
  'Entertainment',
  'Home & Living',
  'Other',
];

export const CHANNELS = ['Instagram', 'TikTok', 'X (Twitter)', 'YouTube', 'Facebook', 'WhatsApp', 'Blog / Website', 'Email list', 'Telegram', 'LinkedIn'];

export const COUNTRIES = ['Nigeria', 'Ghana', 'Kenya', 'South Africa', 'Egypt', 'United Kingdom', 'United States', 'Other'];
