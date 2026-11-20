const trim = (s: string) => s.replace(/\/+$/, '');

export const API_BASE_URL = trim(process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1');
export const REFERRAL_BASE_URL = trim(process.env.NEXT_PUBLIC_REFERRAL_BASE_URL || `${API_BASE_URL}/r`);
export const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === 'true';
/** Must match the backend constant in POST /withdrawals (currently NGN 5,000). */
export const MIN_WITHDRAWAL = Number(process.env.NEXT_PUBLIC_MIN_WITHDRAWAL || 5000);

export const referralUrl = (code: string, source?: string) =>
  `${REFERRAL_BASE_URL}/${encodeURIComponent(code)}${source ? `?source=${encodeURIComponent(source)}` : ''}`;
