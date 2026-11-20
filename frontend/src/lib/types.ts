// Typed contracts mirroring the Flyover backend (prisma/schema.prisma + src/routes.ts).
// Prisma Decimal fields are serialised as strings in JSON, so money is typed as `Money`.

export type Money = string | number;
export type ISODate = string;

export type Role = 'AFFILIATE' | 'BUSINESS' | 'ADMIN';
export type BusinessStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
export type CampaignStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'ENDED';
export type CampaignAccess = 'OPEN' | 'APPROVAL' | 'INVITATION' | 'PRIVATE';
export type CampaignAction = 'CPS' | 'CPL' | 'CPR' | 'CPA';
export type CommissionType = 'PERCENTAGE' | 'FIXED';
export type AttributionModel = 'FIRST_CLICK' | 'LAST_CLICK';
export type ApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'INVITED';
export type ConversionStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVERSED' | 'DISPUTED';
export type CommissionStatus = 'PENDING' | 'AVAILABLE' | 'REVERSED';
export type LedgerType =
  | 'PENDING_CREDIT'
  | 'PENDING_DEBIT'
  | 'AVAILABLE_CREDIT'
  | 'AVAILABLE_DEBIT'
  | 'WITHDRAWAL_RESERVED'
  | 'WITHDRAWAL_RELEASED'
  | 'WITHDRAWN'
  | 'REVERSAL';
export type WithdrawalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSING' | 'PAID' | 'FAILED';
export type NotificationType =
  | 'GENERAL'
  | 'BUSINESS_VERIFICATION'
  | 'CAMPAIGN'
  | 'APPLICATION'
  | 'CONVERSION'
  | 'COMMISSION'
  | 'WITHDRAWAL';

// ---------- Envelope ----------
export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: PageMeta;
}
export interface ApiFailure {
  success: false;
  error: { code: string; message: string; details?: unknown };
}
export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// ---------- Entities ----------
export interface UserSummary {
  id: string;
  fullName: string;
  email: string;
  role: Role;
}

export interface AffiliateProfile {
  id: string;
  userId: string;
  bio: string | null;
  website: string | null;
  socialLinks: Record<string, string> | null;
  promotionalChannels: string[];
  interests: string[];
  audienceSize: number | null;
  country: string;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface BusinessProfile {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  website: string | null;
  country: string;
  registrationNumber: string | null;
  verificationNotes: string | null;
  status: BusinessStatus;
  submittedAt: ISODate | null;
  reviewedAt: ISODate | null;
  reviewedById: string | null;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface Me {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: Role;
  isActive: boolean;
  createdAt: ISODate;
  affiliate: AffiliateProfile | null;
  business: BusinessProfile | null;
}

export interface Product {
  id: string;
  businessId: string;
  name: string;
  description: string | null;
  price: Money | null;
  currency: string;
  category: string | null;
  imageUrl: string | null;
  destinationUrl: string | null;
  isActive: boolean;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export type CompensationModel = 'PERFORMANCE' | 'FIXED_FEE' | 'HYBRID';

export interface Campaign {
  compensationModel?: CompensationModel;
  id: string;
  businessId: string;
  productId: string | null;
  name: string;
  description: string;
  instructions: string | null;
  category: string | null;
  country: string;
  action: CampaignAction;
  commissionType: CommissionType | null;
  commissionValue: Money | null;
  fixedFeeAmount?: Money | null;
  requiredDeliverables?: number;
  programId?: string | null;
  currency: string;
  access: CampaignAccess;
  attributionModel: AttributionModel;
  attributionDays: number;
  validationDays: number;
  startsAt: ISODate | null;
  endsAt: ISODate | null;
  destinationUrl: string | null;
  status: CampaignStatus;
  rejectionReason: string | null;
  approvedAt: ISODate | null;
  createdAt: ISODate;
  updatedAt: ISODate;
  product?: Product | null;
  business?: { name: string; country?: string; description?: string | null };
  _count?: { applications: number; referrals: number };
}

export interface CampaignApplication {
  id: string;
  campaignId: string;
  affiliateId: string;
  status: ApplicationStatus;
  message: string | null;
  reviewedAt: ISODate | null;
  createdAt: ISODate;
  affiliate?: AffiliateProfile & { user: { id: string; fullName: string; email: string } };
}

export interface Referral {
  id: string;
  code: string;
  campaignId: string;
  affiliateId: string;
  createdAt: ISODate;
  campaign?: { id: string; name: string; destinationUrl: string | null; status: CampaignStatus };
  _count?: { clicks: number; conversions: number };
}

export interface Commission {
  id: string;
  conversionId: string;
  campaignId: string;
  affiliateId: string;
  grossAmount: Money;
  commissionAmount: Money;
  currency: string;
  status: CommissionStatus;
  availableAt: ISODate;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export type AttributionSource = 'REFERRAL' | 'COUPON' | 'REFERRAL_AND_COUPON' | 'ATTRIBUTION_WINDOW' | 'TRACKING_API' | 'WEBHOOK';

export interface Conversion {
  id: string;
  campaignId: string;
  affiliateId: string;
  referralId: string | null;
  couponId?: string | null;
  integrationId?: string | null;
  attributionSource?: AttributionSource;
  externalReference: string;
  customerReference: string | null;
  amount: Money;
  currency: string;
  status: ConversionStatus;
  submittedById: string;
  reviewedById: string | null;
  rejectionReason: string | null;
  evidenceUrl: string | null;
  convertedAt: ISODate;
  reviewedAt: ISODate | null;
  createdAt: ISODate;
  updatedAt: ISODate;
  campaign?: Campaign;
  affiliate?: AffiliateProfile & { user: { fullName: string; email: string } };
  commission?: Commission | null;
}

export interface WalletEntry {
  id: string;
  affiliateId: string;
  type: LedgerType;
  amount: Money;
  currency: string;
  referenceType: string;
  referenceId: string;
  description: string;
  createdAt: ISODate;
}

export interface WalletBalances {
  pending: number;
  available: number;
  withdrawn: number;
  reversed: number;
}

export interface Wallet {
  balances: WalletBalances;
  transactions: WalletEntry[];
}

export interface Withdrawal {
  id: string;
  affiliateId: string;
  amount: Money;
  currency: string;
  status: WithdrawalStatus;
  bankName: string;
  accountName: string;
  accountNumber: string;
  adminNote: string | null;
  paymentReference: string | null;
  reviewedById: string | null;
  processedAt: ISODate | null;
  createdAt: ISODate;
  updatedAt: ISODate;
  affiliate?: AffiliateProfile & { user: { fullName: string; email: string } };
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  readAt: ISODate | null;
  createdAt: ISODate;
}

export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: ISODate;
}

export interface AdminBusiness extends BusinessProfile {
  user: { fullName: string; email: string };
}

export interface AffiliateAnalytics {
  totalClicks: number;
  referralLinks: number;
  conversionsByStatus: { status: ConversionStatus; _count: { _all: number } }[];
  totalCommission: number;
  wallet: WalletBalances;
}

export interface BusinessAnalytics {
  campaigns: number;
  clicks: number;
  conversions: number;
  approvedConversionValue: number;
}

// ---------- Request payloads ----------
export interface RegisterInput {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  role: 'AFFILIATE' | 'BUSINESS';
}
export interface LoginResult {
  user: UserSummary;
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
}
export interface AffiliateProfileInput {
  bio?: string;
  website?: string;
  socialLinks?: Record<string, string>;
  promotionalChannels?: string[];
  interests?: string[];
  audienceSize?: number;
  country?: string;
}
export interface BusinessProfileInput {
  name?: string;
  description?: string;
  website?: string;
  country?: string;
  registrationNumber?: string;
}
export interface VerificationInput {
  registrationNumber: string;
  verificationNotes?: string;
}
export interface ProductInput {
  name: string;
  description?: string;
  price?: number;
  currency?: string;
  category?: string;
  imageUrl?: string;
  destinationUrl?: string;
}
export interface CampaignInput {
  productId?: string;
  name: string;
  description: string;
  instructions?: string;
  category?: string;
  country?: string;
  action: CampaignAction;
  compensationModel?: CompensationModel;
  fixedFeeAmount?: number;
  requiredDeliverables?: number;
  programId?: string;
  commissionType?: CommissionType;
  commissionValue?: number;
  currency?: string;
  access: CampaignAccess;
  attributionModel: AttributionModel;
  attributionDays: number;
  validationDays: number;
  startsAt?: string;
  endsAt?: string;
  destinationUrl?: string;
}
/** PATCH /campaigns/:id only accepts these fields (draft/rejected campaigns only). */
export type CampaignEditInput = Partial<
  Pick<CampaignInput, 'name' | 'description' | 'instructions' | 'commissionValue' | 'access' | 'destinationUrl'>
>;
export interface MarketplaceQuery {
  search?: string;
  category?: string;
  country?: string;
  action?: CampaignAction;
  page?: number;
  limit?: number;
}
export interface ConversionInput {
  referralCode: string;
  externalReference: string;
  amount: number;
  currency?: string;
  customerReference?: string;
  evidenceUrl?: string;
  convertedAt?: string;
}
export interface ConversionReviewInput {
  decision: 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
}
export interface WithdrawalInput {
  amount: number;
  bankName: string;
  accountName: string;
  accountNumber: string;
}
export interface WithdrawalReviewInput {
  decision: 'APPROVED' | 'REJECTED' | 'PROCESSING' | 'PAID' | 'FAILED';
  adminNote?: string;
  paymentReference?: string;
}

// ---------- Phase 11: coupons & notification preferences ----------
export type CouponDiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';

export interface Coupon {
  id: string;
  campaignId: string;
  affiliateId: string;
  code: string;
  discountType: CouponDiscountType;
  discountValue: Money;
  maxRedemptions: number | null;
  startsAt: ISODate | null;
  expiresAt: ISODate | null;
  isActive: boolean;
  createdAt: ISODate;
  /** Included by GET /affiliates/coupons */
  campaign?: { id: string; name: string; currency: string; status: CampaignStatus; business?: { name: string } };
  /** Included by GET /campaigns/:id/coupons */
  affiliate?: { id: string; user?: { id: string; fullName: string; email: string } };
}

export interface CouponInput {
  affiliateId: string;
  code: string;
  discountType: CouponDiscountType;
  discountValue: number;
  maxRedemptions?: number;
  startsAt?: ISODate;
  expiresAt?: ISODate;
}
export type CouponUpdateInput = { isActive?: boolean; maxRedemptions?: number | null; startsAt?: ISODate | null; expiresAt?: ISODate | null };

export interface NotificationPreferences {
  id: string;
  userId: string;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  mutedTypes: NotificationType[];
}
export type NotificationPreferencesInput = Partial<Pick<NotificationPreferences, 'inAppEnabled' | 'emailEnabled' | 'mutedTypes'>>;

// ---------- Phase 11: creators ----------
export type CreatorStatus = 'ACTIVE' | 'PAUSED';
export interface CreatorProfile {
  id: string;
  affiliateId: string;
  displayName: string;
  bio: string | null;
  niches: string[];
  country: string;
  city: string | null;
  languages: string[];
  portfolioUrl: string | null;
  mediaKitUrl: string | null;
  socialProfiles: Record<string, string> | null;
  audienceSize: number | null;
  engagementRate: Money | null;
  status: CreatorStatus;
  updatedAt: ISODate;
  /** Included by discovery and public profile endpoints */
  affiliate?: { id: string; user: { id: string; fullName: string } };
}
export interface CreatorProfileInput {
  displayName: string;
  bio?: string;
  niches: string[];
  country: string;
  city?: string;
  languages: string[];
  portfolioUrl?: string;
  mediaKitUrl?: string;
  audienceSize?: number;
  engagementRate?: number;
  status: CreatorStatus;
}
export interface CreatorFilters { niche?: string; country?: string; city?: string; minAudience?: number; maxAudience?: number; minEngagement?: number; page?: number; limit?: number }

// ---------- Phase 12: programmes (list only for now; management screens come later) ----------
export interface AffiliateProgramSummary { id: string; name: string; slug: string; status: string }

// ---------- Phase 11: creator deliverables & payments ----------
export type DeliverableStatus = 'SUBMITTED' | 'IN_REVIEW' | 'REVISION_REQUESTED' | 'APPROVED' | 'REJECTED';
export type DeliverableDecision = 'IN_REVIEW' | 'APPROVED' | 'REVISION_REQUESTED' | 'REJECTED';
export interface CreatorDeliverable {
  id: string;
  campaignId: string;
  affiliateId: string;
  title: string;
  description: string | null;
  assetUrl: string;
  contentType: string | null;
  status: DeliverableStatus;
  version: number;
  reviewNotes: string | null;
  submittedAt: ISODate;
  reviewedAt: ISODate | null;
  /** Included for the business view */
  affiliate?: { id: string; user: { id: string; fullName: string; email: string } };
}
export interface DeliverableInput { title: string; description?: string; assetUrl: string; contentType?: string }

export type CreatorPaymentStatus = 'PENDING' | 'APPROVED' | 'PROCESSING' | 'PAID' | 'FAILED' | 'CANCELLED';
export type CreatorPaymentDecision = 'PROCESSING' | 'PAID' | 'FAILED';
export interface CreatorPayment {
  id: string;
  campaignId: string;
  affiliateId: string;
  amount: Money;
  currency: string;
  status: CreatorPaymentStatus;
  paymentReference: string | null;
  paymentProvider: string | null;
  adminNote: string | null;
  paidAt: ISODate | null;
  createdAt: ISODate;
  campaign?: { id: string; name: string; business?: { name: string } };
  affiliate?: { user: { fullName: string; email: string } };
}
export interface CreatorPaymentUpdate { decision: CreatorPaymentDecision; paymentReference?: string; paymentProvider?: string; adminNote?: string }

// ---------- Phase 12: private affiliate programmes ----------
export type ProgramStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
export type ProgramFieldType = 'TEXT' | 'URL' | 'NUMBER';
export interface ProgramField { key: string; label: string; required: boolean; type: ProgramFieldType }
export interface AffiliateProgram {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: ProgramStatus;
  requiresApproval: boolean;
  landingPageTitle: string | null;
  landingPageDescription: string | null;
  brandColor: string | null;
  customFields: ProgramField[] | null;
  createdAt: ISODate;
  _count?: { memberships: number; campaigns: number };
}
export interface ProgramInput {
  name: string;
  slug: string;
  description?: string;
  requiresApproval: boolean;
  landingPageTitle?: string;
  landingPageDescription?: string;
  brandColor?: string;
  customFields: ProgramField[];
}
export interface PublicProgram {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  requiresApproval: boolean;
  landingPageTitle: string | null;
  landingPageDescription: string | null;
  brandColor: string | null;
  customFields: ProgramField[] | null;
  business: { name: string; country: string; website: string | null };
}
export type MembershipStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
export interface ProgramMembership {
  id: string;
  programId: string;
  affiliateId: string;
  status: MembershipStatus;
  source: string;
  answers: Record<string, string | number> | null;
  appliedAt: ISODate;
  reviewedAt: ISODate | null;
  affiliate?: { id: string; user: { id: string; fullName: string; email: string } };
}
export type ProgramAnswers = Record<string, string | number>;
export interface ProgramRegisterInput { fullName: string; email: string; phone?: string; password: string; answers: ProgramAnswers }

// ---------- Phase 12: integrations ----------
export type IntegrationKind = 'PAYMENT' | 'ECOMMERCE' | 'TRACKING' | 'CONVERSION_REPORTING';
export type IntegrationProvider = 'GENERIC_HMAC' | 'SHOPIFY' | 'WOOCOMMERCE';
export type IntegrationStatus = 'ACTIVE' | 'PAUSED' | 'REVOKED';
export interface Integration {
  id: string;
  name: string;
  kind: IntegrationKind;
  provider: IntegrationProvider;
  status: IntegrationStatus;
  publicKey: string;
  campaignId: string | null;
  allowedDomains: string[];
  lastEventAt: ISODate | null;
  createdAt: ISODate;
  _count?: { webhookEvents: number; apiKeys: number };
}
export interface IntegrationInput {
  name: string;
  kind: IntegrationKind;
  provider: IntegrationProvider;
  campaignId?: string;
  webhookSecret?: string;
  allowedDomains: string[];
}
export interface IntegrationCreated {
  id: string;
  name: string;
  kind: IntegrationKind;
  provider: IntegrationProvider;
  status: IntegrationStatus;
  publicKey: string;
  webhookUrl: string;
  trackingEndpoint: string;
  trackingSnippet?: string;
}
export interface IntegrationApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  expiresAt: ISODate | null;
  lastUsedAt: ISODate | null;
  revokedAt: ISODate | null;
  createdAt: ISODate;
}
export interface IntegrationApiKeyCreated { id: string; name: string; key: string; keyPrefix: string; scopes: string[]; expiresAt: ISODate | null }
export type WebhookEventStatus = 'RECEIVED' | 'PROCESSING' | 'PROCESSED' | 'FAILED' | 'IGNORED';
export interface IntegrationEvent {
  id: string;
  externalEventId: string;
  eventType: string;
  authMethod: string;
  signatureVerified: boolean;
  status: WebhookEventStatus;
  attempts: number;
  lastError: string | null;
  processedAt: ISODate | null;
  createdAt: ISODate;
}

// ---------- Phase 12: team, CRM and advanced analytics ----------
export type TeamRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'ANALYST';
export interface TeamMember {
  id: string | null;
  role: TeamRole;
  isActive: boolean;
  isOwner: boolean;
  user: { id: string; fullName: string; email: string; isActive: boolean };
}
export type CrmStage = 'DISCOVERED' | 'CONTACTED' | 'NEGOTIATING' | 'PARTNER' | 'INACTIVE';
export interface CrmRecord {
  id: string;
  affiliateId: string;
  stage: CrmStage;
  tags: string[];
  notes: string | null;
  lastContactAt: ISODate | null;
  updatedAt: ISODate;
  affiliate: { id: string; user: { id: string; fullName: string; email: string }; creatorProfile?: CreatorProfile | null };
}
export interface CrmInput { stage: CrmStage; tags: string[]; notes?: string; lastContactAt?: ISODate }
export interface CampaignPerformance {
  id: string;
  name: string;
  status: CampaignStatus;
  compensationModel?: CompensationModel;
  referrals: number;
  applications: number;
  conversions: number;
  approvedConversions: number;
  couponAttributedConversions: number;
  automaticallyVerifiedConversions: number;
  conversionValue: number;
  commissionCost: number;
}
export interface AffiliatePerformance {
  affiliateId: string;
  affiliate: { id: string; fullName: string; email: string };
  campaignCount: number;
  conversions: number;
  approvedConversionValue: number;
  approvedConversionValueByCurrency: Record<string, number>;
}
