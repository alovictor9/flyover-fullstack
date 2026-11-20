import type { IntegrationKind, IntegrationProvider, IntegrationStatus, WebhookEventStatus } from './types';

export const integrationKind: Record<IntegrationKind, { label: string; help: string }> = {
  PAYMENT: { label: 'Payment confirmation', help: 'Your payment provider confirms sales automatically.' },
  ECOMMERCE: { label: 'Online store', help: 'Your store reports completed orders.' },
  TRACKING: { label: 'Website tracking', help: 'A small script on your site records visits from referral links.' },
  CONVERSION_REPORTING: { label: 'Conversion reporting', help: 'Your own system reports conversions through the API.' },
};
export const integrationProvider: Record<IntegrationProvider, string> = { GENERIC_HMAC: 'Signed webhook', SHOPIFY: 'Shopify', WOOCOMMERCE: 'WooCommerce' };
export const integrationStatus: Record<IntegrationStatus, { label: string; tone: 'success' | 'warning' | 'danger' }> = {
  ACTIVE: { label: 'Active', tone: 'success' },
  PAUSED: { label: 'Paused', tone: 'warning' },
  REVOKED: { label: 'Revoked', tone: 'danger' },
};
export const eventStatus: Record<WebhookEventStatus, { label: string; tone: 'neutral' | 'brand' | 'warning' | 'success' | 'danger' }> = {
  RECEIVED: { label: 'Received', tone: 'brand' },
  PROCESSING: { label: 'Processing', tone: 'warning' },
  PROCESSED: { label: 'Processed', tone: 'success' },
  FAILED: { label: 'Failed', tone: 'danger' },
  IGNORED: { label: 'Ignored', tone: 'neutral' },
};
