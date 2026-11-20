import type { CreatorPaymentStatus } from './types';

export const creatorPaymentStatus: Record<CreatorPaymentStatus, { label: string; tone: 'neutral' | 'brand' | 'warning' | 'success' | 'danger'; help: string }> = {
  PENDING: { label: 'Waiting for approvals', tone: 'neutral', help: 'Your fee is released once all required deliverables are approved.' },
  APPROVED: { label: 'Ready to be paid', tone: 'brand', help: 'All deliverables are approved. The business will pay you directly.' },
  PROCESSING: { label: 'Payment in progress', tone: 'warning', help: 'The business has started your payment.' },
  PAID: { label: 'Paid', tone: 'success', help: 'The business has marked this as paid.' },
  FAILED: { label: 'Payment failed', tone: 'danger', help: 'The payment did not go through. Check the note below.' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral', help: 'This payment was cancelled.' },
};
