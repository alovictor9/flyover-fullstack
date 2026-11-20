import type { MembershipStatus, ProgramStatus } from './types';

export const programStatus: Record<ProgramStatus, { label: string; tone: 'neutral' | 'success' | 'warning' | 'danger' }> = {
  DRAFT: { label: 'Draft', tone: 'neutral' },
  ACTIVE: { label: 'Live', tone: 'success' },
  PAUSED: { label: 'Paused', tone: 'warning' },
  ARCHIVED: { label: 'Archived', tone: 'neutral' },
};
export const membershipStatus: Record<MembershipStatus, { label: string; tone: 'warning' | 'success' | 'danger' | 'neutral' }> = {
  PENDING: { label: 'Awaiting review', tone: 'warning' },
  APPROVED: { label: 'Approved', tone: 'success' },
  REJECTED: { label: 'Declined', tone: 'danger' },
  SUSPENDED: { label: 'Suspended', tone: 'neutral' },
};
/** Turn a label into a backend field key (a-z, 0-9, underscore). */
export const fieldKey = (label: string, i: number) => (label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 30) || 'field') + '_' + (i + 1);
