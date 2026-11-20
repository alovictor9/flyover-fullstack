import type { AttributionSource } from './types';

export const attributionLabel = (s?: AttributionSource) =>
  ({
    REFERRAL: 'Referral link',
    COUPON: 'Coupon code',
    REFERRAL_AND_COUPON: 'Referral link and coupon',
    ATTRIBUTION_WINDOW: 'Earlier click (attribution window)',
    TRACKING_API: 'Website tracking',
    WEBHOOK: 'Automatic, from an integration',
  })[s ?? 'REFERRAL'];

export const isAutomaticSource = (s?: AttributionSource) => s === 'WEBHOOK' || s === 'TRACKING_API';
