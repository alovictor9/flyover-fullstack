import { api, sessionStore } from './api-client';
import type * as T from './types';

/** One function per backend endpoint (docs/API.md). Screens never call fetch directly. */

export const authApi = {
  register: (b: T.RegisterInput) => api.post<{ user: T.UserSummary }>('/auth/register', b, { auth: false }),
  login: async (email: string, password: string) => {
    const r = await api.post<T.LoginResult>('/auth/login', { email, password }, { auth: false });
    sessionStore.set({ accessToken: r.accessToken, refreshToken: r.refreshToken });
    return r;
  },
  logout: async () => {
    const s = sessionStore.get();
    try {
      if (s) await api.post('/auth/logout', { refreshToken: s.refreshToken });
    } finally {
      sessionStore.set(null);
    }
  },
  me: () => api.get<T.Me>('/auth/me'),
};

export const profileApi = {
  updateAffiliate: (b: T.AffiliateProfileInput) => api.patch<T.AffiliateProfile>('/affiliates/me', b),
  updateBusiness: (b: T.BusinessProfileInput) => api.patch<T.BusinessProfile>('/businesses/me', b),
  submitVerification: (b: T.VerificationInput) => api.post<T.BusinessProfile>('/businesses/verification', b),
};

export const productApi = {
  list: () => api.get<T.Product[]>('/products'),
  create: (b: T.ProductInput) => api.post<T.Product>('/products', b),
};

export const campaignApi = {
  mine: () => api.get<T.Campaign[]>('/campaigns/mine'),
  create: (b: T.CampaignInput) => api.post<T.Campaign>('/campaigns', b),
  update: (id: string, b: T.CampaignEditInput) => api.patch<T.Campaign>(`/campaigns/${id}`, b),
  submit: (id: string) => api.post<T.Campaign>(`/campaigns/${id}/submit`),
  marketplace: (q: T.MarketplaceQuery) =>
    api.getPage<T.Campaign[]>('/marketplace/campaigns', { query: q as Record<string, string | number | undefined> }),
  detail: (id: string) => api.get<T.Campaign>(`/campaigns/${id}`),
  apply: (id: string, message?: string) =>
    api.post<{ application: T.CampaignApplication; referral: T.Referral } | T.CampaignApplication>(
      `/campaigns/${id}/apply`,
      message ? { message } : {},
    ),
  applications: (campaignId: string) => api.get<T.CampaignApplication[]>(`/businesses/campaigns/${campaignId}/applications`),
  reviewApplication: (id: string, status: 'APPROVED' | 'REJECTED') =>
    api.patch<T.CampaignApplication>(`/businesses/applications/${id}`, { status }),
};

export const referralApi = {
  mine: () => api.get<T.Referral[]>('/affiliates/referrals'),
};

export const conversionApi = {
  submit: (b: T.ConversionInput) => api.post<T.Conversion>('/businesses/conversions', b),
  list: (status?: T.ConversionStatus) => api.get<T.Conversion[]>('/businesses/conversions', { query: { status } }),
  review: (id: string, b: T.ConversionReviewInput) => api.patch<T.Conversion>(`/businesses/conversions/${id}/review`, b),
};

export const walletApi = {
  get: () => api.get<T.Wallet>('/wallet'),
  withdrawals: () => api.get<T.Withdrawal[]>('/withdrawals'),
  requestWithdrawal: (b: T.WithdrawalInput) => api.post<T.Withdrawal>('/withdrawals', b),
};

export const adminApi = {
  businesses: (status?: T.BusinessStatus) => api.get<T.AdminBusiness[]>('/admin/businesses', { query: { status } }),
  reviewBusiness: (id: string, decision: 'APPROVED' | 'REJECTED', notes?: string) =>
    api.patch<T.BusinessProfile>(`/admin/businesses/${id}/review`, { decision, notes }),
  campaigns: (status?: T.CampaignStatus) => api.get<T.Campaign[]>('/admin/campaigns', { query: { status } }),
  reviewCampaign: (id: string, decision: 'APPROVED' | 'REJECTED' | 'SUSPENDED', reason?: string) =>
    api.patch<T.Campaign>(`/admin/campaigns/${id}/review`, { decision, reason }),
  users: () => api.get<T.AdminUser[]>('/admin/users'),
  setUserActive: (id: string, isActive: boolean) => api.patch<T.AdminUser>(`/admin/users/${id}/status`, { isActive }),
  withdrawals: (status?: T.WithdrawalStatus) => api.get<T.Withdrawal[]>('/admin/withdrawals', { query: { status } }),
  reviewWithdrawal: (id: string, b: T.WithdrawalReviewInput) => api.patch<T.Withdrawal>(`/admin/withdrawals/${id}/review`, b),
  releaseCommission: (id: string) => api.post<T.Commission>(`/admin/commissions/${id}/release`),
};

export const notificationApi = {
  list: () => api.get<T.Notification[]>('/notifications'),
  markRead: (id: string) => api.patch<{ updated: boolean }>(`/notifications/${id}/read`),
  preferences: () => api.get<T.NotificationPreferences>('/notifications/preferences'),
  updatePreferences: (b: T.NotificationPreferencesInput) => api.patch<T.NotificationPreferences>('/notifications/preferences', b),
};

export const couponApi = {
  mine: () => api.get<T.Coupon[]>('/affiliates/coupons'),
  forCampaign: (campaignId: string) => api.get<T.Coupon[]>(`/campaigns/${campaignId}/coupons`),
  create: (campaignId: string, b: T.CouponInput) => api.post<T.Coupon>(`/campaigns/${campaignId}/coupons`, b),
  update: (id: string, b: T.CouponUpdateInput) => api.patch<T.Coupon>(`/coupons/${id}`, b),
};

export const analyticsApi = {
  affiliate: () => api.get<T.AffiliateAnalytics>('/analytics/affiliate'),
  business: () => api.get<T.BusinessAnalytics>('/analytics/business'),
};

export const creatorApi = {
  me: () => api.get<T.CreatorProfile | null>('/creators/me'),
  save: (b: T.CreatorProfileInput) => api.put<T.CreatorProfile>('/creators/me', b),
  discover: (q: T.CreatorFilters) => api.getPage<T.CreatorProfile[]>('/creators', { query: q as Record<string, string | number | undefined> }),
};

export const programApi = {
  list: () => api.get<T.AffiliateProgram[]>('/businesses/programs'),
  create: (b: T.ProgramInput) => api.post<T.AffiliateProgram>('/businesses/programs', b),
  update: (id: string, b: Partial<Pick<T.AffiliateProgram, 'status' | 'requiresApproval' | 'name' | 'description'>>) => api.patch<T.AffiliateProgram>(`/businesses/programs/${id}`, b),
  members: (id: string) => api.get<T.ProgramMembership[]>(`/businesses/programs/${id}/members`),
  reviewMember: (id: string, decision: 'APPROVED' | 'REJECTED' | 'SUSPENDED') => api.patch<T.ProgramMembership>(`/businesses/program-memberships/${id}`, { decision }),
  // public / affiliate
  publicPage: (slug: string) => api.get<T.PublicProgram>(`/programs/${slug}`, { auth: false }),
  register: (slug: string, b: T.ProgramRegisterInput) => api.post<{ user: T.UserSummary; membershipStatus: T.MembershipStatus }>(`/programs/${slug}/register`, b, { auth: false }),
  apply: (slug: string, answers: T.ProgramAnswers) => api.post<T.ProgramMembership>(`/programs/${slug}/apply`, { answers }),
  campaigns: (slug: string) => api.get<T.Campaign[]>(`/programs/${slug}/campaigns`),
};

export const creatorWorkApi = {
  // affiliate
  deliverables: (campaignId: string) => api.get<T.CreatorDeliverable[]>(`/creator-campaigns/${campaignId}/deliverables`),
  submit: (campaignId: string, b: T.DeliverableInput) => api.post<T.CreatorDeliverable>(`/creator-campaigns/${campaignId}/deliverables`, b),
  resubmit: (campaignId: string, id: string, b: Partial<T.DeliverableInput>) => api.patch<T.CreatorDeliverable>(`/creator-campaigns/${campaignId}/deliverables/${id}`, b),
  myPayments: () => api.get<T.CreatorPayment[]>('/affiliates/creator-payments'),
  // business
  forCampaign: (campaignId: string) => api.get<T.CreatorDeliverable[]>(`/businesses/campaigns/${campaignId}/deliverables`),
  review: (id: string, b: { decision: T.DeliverableDecision; reviewNotes?: string }) => api.patch<T.CreatorDeliverable>(`/businesses/deliverables/${id}/review`, b),
  paymentsForCampaign: (campaignId: string) => api.get<T.CreatorPayment[]>(`/businesses/campaigns/${campaignId}/creator-payments`),
  updatePayment: (id: string, b: T.CreatorPaymentUpdate) => api.patch<T.CreatorPayment>(`/businesses/creator-payments/${id}`, b),
};

export const integrationApi = {
  list: () => api.get<T.Integration[]>('/businesses/integrations'),
  create: (b: T.IntegrationInput) => api.post<T.IntegrationCreated>('/businesses/integrations', b),
  setStatus: (id: string, status: T.IntegrationStatus) => api.patch<{ id: string; status: T.IntegrationStatus }>(`/businesses/integrations/${id}/status`, { status }),
  rotateSecret: (id: string, webhookSecret: string) => api.patch<{ id: string; credentialsUpdated: boolean }>(`/businesses/integrations/${id}/credentials`, { webhookSecret }),
  keys: (id: string) => api.get<T.IntegrationApiKey[]>(`/businesses/integrations/${id}/api-keys`),
  createKey: (id: string, b: { name: string; expiresAt?: string }) => api.post<T.IntegrationApiKeyCreated>(`/businesses/integrations/${id}/api-keys`, { ...b, scopes: ['conversions:write'] }),
  revokeKey: (id: string, keyId: string) => api.del<{ id: string; revokedAt: string }>(`/businesses/integrations/${id}/api-keys/${keyId}`),
  events: (id: string) => api.get<T.IntegrationEvent[]>(`/businesses/integrations/${id}/events`),
  retryEvent: (id: string, eventId: string) => api.post<{ conversionId?: string; duplicate?: boolean }>(`/businesses/integrations/${id}/events/${eventId}/retry`),
};

export const teamApi = {
  list: () => api.get<T.TeamMember[]>('/businesses/members'),
  add: (b: { email: string; role: Exclude<T.TeamRole, 'OWNER'> }) => api.post<{ id: string }>('/businesses/members', b),
  update: (id: string, b: { role?: Exclude<T.TeamRole, 'OWNER'>; isActive?: boolean }) => api.patch<{ id: string }>(`/businesses/members/${id}`, b),
};

export const crmApi = {
  list: (q: { stage?: T.CrmStage; search?: string; page?: number; limit?: number }) => api.getPage<T.CrmRecord[]>('/businesses/crm/affiliates', { query: q as Record<string, string | number | undefined> }),
  save: (affiliateId: string, b: T.CrmInput) => api.put<{ id: string }>(`/businesses/crm/affiliates/${affiliateId}`, b),
};

export const businessInsightsApi = {
  campaigns: (range: { from?: string; to?: string }) => api.get<T.CampaignPerformance[]>('/analytics/business/campaigns', { query: range }),
  affiliates: () => api.get<T.AffiliatePerformance[]>('/analytics/business/affiliates'),
};
