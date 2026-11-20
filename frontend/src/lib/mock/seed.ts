import type * as T from '../types';

/** Demo dataset for mock mode. Accounts: affiliate@demo.ng / business@demo.ng / admin@demo.ng — password1234 */
export interface DB {
  users: { id: string; fullName: string; email: string; phone: string | null; password: string; role: T.Role; isActive: boolean; createdAt: string }[];
  affiliates: T.AffiliateProfile[];
  businesses: T.BusinessProfile[];
  products: T.Product[];
  campaigns: T.Campaign[];
  applications: T.CampaignApplication[];
  referrals: T.Referral[];
  clicks: { id: string; referralId: string; clickedAt: string; source: string | null }[];
  conversions: T.Conversion[];
  commissions: T.Commission[];
  walletEntries: T.WalletEntry[];
  withdrawals: T.Withdrawal[];
  notifications: T.Notification[];
  auditLogs: { id: string; actorId: string; action: string; entityType: string; entityId: string; createdAt: string }[];
}

const ago = (days: number) => new Date(Date.now() - days * 864e5).toISOString();
const ahead = (days: number) => new Date(Date.now() + days * 864e5).toISOString();
const PW = 'password1234';

export function seed(): DB {
  const users: DB['users'] = [
    { id: 'u_aff', fullName: 'Ada Okafor', email: 'affiliate@demo.ng', phone: '+2348012345678', password: PW, role: 'AFFILIATE', isActive: true, createdAt: ago(40) },
    { id: 'u_aff2', fullName: 'Tunde Bakare', email: 'tunde@demo.ng', phone: null, password: PW, role: 'AFFILIATE', isActive: true, createdAt: ago(30) },
    { id: 'u_aff3', fullName: 'Zainab Musa', email: 'zainab@demo.ng', phone: null, password: PW, role: 'AFFILIATE', isActive: true, createdAt: ago(12) },
    { id: 'u_biz', fullName: 'Kemi Adeyemi', email: 'business@demo.ng', phone: '+2348098765432', password: PW, role: 'BUSINESS', isActive: true, createdAt: ago(45) },
    { id: 'u_biz2', fullName: 'Chidi Eze', email: 'chidi@demo.ng', phone: null, password: PW, role: 'BUSINESS', isActive: true, createdAt: ago(3) },
    { id: 'u_biz3', fullName: 'Grace Bello', email: 'grace@demo.ng', phone: null, password: PW, role: 'BUSINESS', isActive: true, createdAt: ago(25) },
    { id: 'u_admin', fullName: 'Flyover Admin', email: 'admin@demo.ng', phone: null, password: PW, role: 'ADMIN', isActive: true, createdAt: ago(60) },
  ];
  const base = { createdAt: ago(30), updatedAt: ago(2) };
  const affiliates: T.AffiliateProfile[] = [
    { id: 'a1', userId: 'u_aff', bio: 'Lagos-based tech & lifestyle creator. 40k on Instagram, weekly YouTube reviews.', website: 'https://ada.example.com', socialLinks: { instagram: 'https://instagram.com/ada' }, promotionalChannels: ['Instagram', 'YouTube'], interests: ['Electronics', 'Fintech'], audienceSize: 40000, country: 'Nigeria', ...base },
    { id: 'a2', userId: 'u_aff2', bio: 'Finance newsletter for young professionals.', website: null, socialLinks: null, promotionalChannels: ['Email list', 'X (Twitter)'], interests: ['Fintech'], audienceSize: 12000, country: 'Nigeria', ...base },
    { id: 'a3', userId: 'u_aff3', bio: null, website: null, socialLinks: null, promotionalChannels: ['TikTok'], interests: ['Beauty', 'Fashion'], audienceSize: 85000, country: 'Nigeria', ...base },
  ];
  const businesses: T.BusinessProfile[] = [
    { id: 'b1', userId: 'u_biz', name: 'SmartTech Gadgets', description: 'Authentic phones, laptops and accessories delivered across Nigeria.', website: 'https://smarttech.example', country: 'Nigeria', registrationNumber: 'RC-1458820', verificationNotes: 'CAC certificate verified.', status: 'APPROVED', submittedAt: ago(40), reviewedAt: ago(38), reviewedById: 'u_admin', ...base },
    { id: 'b2', userId: 'u_biz2', name: 'Eze Foods', description: 'Healthy meal plans delivered in Lagos.', website: 'https://ezefoods.example', country: 'Nigeria', registrationNumber: 'BN-3320011', verificationNotes: 'Registered business name. Operating since 2022.', status: 'PENDING', submittedAt: ago(1), reviewedAt: null, reviewedById: null, ...base },
    { id: 'b3', userId: 'u_biz3', name: 'PayLite', description: 'Simple savings app for students.', website: 'https://paylite.example', country: 'Nigeria', registrationNumber: 'RC-2290017', verificationNotes: null, status: 'APPROVED', submittedAt: ago(24), reviewedAt: ago(22), reviewedById: 'u_admin', ...base },
  ];
  const products: T.Product[] = [
    { id: 'p1', businessId: 'b1', name: 'Galaxy A55 5G', description: '128GB, dual SIM, 1-year warranty.', price: '385000.00', currency: 'NGN', category: 'Electronics', imageUrl: null, destinationUrl: 'https://smarttech.example/a55', isActive: true, ...base },
    { id: 'p2', businessId: 'b1', name: 'Wireless Earbuds Pro', description: 'Noise cancelling, 30h battery.', price: '45000.00', currency: 'NGN', category: 'Electronics', imageUrl: null, destinationUrl: 'https://smarttech.example/earbuds', isActive: true, ...base },
    { id: 'p3', businessId: 'b3', name: 'PayLite Savings', description: 'Save from ₦500 a week.', price: null, currency: 'NGN', category: 'Fintech', imageUrl: null, destinationUrl: 'https://paylite.example/join', isActive: true, ...base },
  ];
  const camp = (c: Partial<T.Campaign> & Pick<T.Campaign, 'id' | 'businessId' | 'name' | 'description' | 'status'>): T.Campaign => ({
    productId: null, instructions: null, category: 'Electronics', country: 'Nigeria', action: 'CPS', commissionType: 'PERCENTAGE', commissionValue: '10.00', currency: 'NGN', access: 'OPEN',
    attributionModel: 'LAST_CLICK', attributionDays: 30, validationDays: 14, startsAt: null, endsAt: null, destinationUrl: 'https://smarttech.example', rejectionReason: null,
    approvedAt: c.status === 'APPROVED' ? ago(20) : null, createdAt: ago(25), updatedAt: ago(20), ...c,
  });
  const campaigns: T.Campaign[] = [
    camp({ id: 'k1', businessId: 'b1', productId: 'p1', name: 'Galaxy A55 launch — 8% per sale', description: 'Promote the new Galaxy A55 5G to your audience and earn 8% on every verified sale. Free delivery in Lagos and Abuja.', instructions: 'Show the phone in use. Mention free delivery. Do not promise discounts that are not on the site.', commissionValue: '8.00', status: 'APPROVED', destinationUrl: 'https://smarttech.example/a55' }),
    camp({ id: 'k2', businessId: 'b1', productId: 'p2', name: 'Earbuds Pro — ₦4,000 per sale', description: 'Fixed ₦4,000 for every verified earbuds sale. Great for tech reviewers and unboxing creators.', commissionType: 'FIXED', commissionValue: '4000.00', access: 'APPROVAL', status: 'APPROVED', destinationUrl: 'https://smarttech.example/earbuds' }),
    camp({ id: 'k3', businessId: 'b3', productId: 'p3', name: 'PayLite student sign-ups', description: 'Earn ₦700 for every student who registers and completes their first savings deposit.', category: 'Fintech', action: 'CPR', commissionType: 'FIXED', commissionValue: '700.00', status: 'APPROVED', validationDays: 7, destinationUrl: 'https://paylite.example/join' }),
    camp({ id: 'k4', businessId: 'b3', name: 'PayLite ambassadors (invite only)', description: 'Private programme for selected campus ambassadors with higher payouts.', category: 'Fintech', action: 'CPA', commissionType: 'FIXED', commissionValue: '1500.00', access: 'INVITATION', status: 'APPROVED', destinationUrl: 'https://paylite.example/ambassador' }),
    camp({ id: 'k5', businessId: 'b1', name: 'Back to school laptops', description: 'Laptops for students with 6% commission on every verified sale.', status: 'PENDING', commissionValue: '6.00', approvedAt: null }),
    camp({ id: 'k7', businessId: 'b1', name: 'Smartwatch unboxing: ₦50,000 creator fee', description: 'Create one unboxing video of our new smartwatch. A fixed fee is paid once it is approved.', status: 'APPROVED', access: 'APPROVAL', compensationModel: 'FIXED_FEE', commissionType: null, commissionValue: null, fixedFeeAmount: '50000.00', requiredDeliverables: 1 }),
    camp({ id: 'k8', businessId: 'b1', name: 'Earbuds creators: ₦20,000 plus 5%', description: 'Two pieces of content plus commission on every verified sale that follows.', status: 'APPROVED', access: 'APPROVAL', compensationModel: 'HYBRID', commissionValue: '5.00', fixedFeeAmount: '20000.00', requiredDeliverables: 2 }),
    camp({ id: 'k9', businessId: 'b1', name: 'SmartTech partners: exclusive laptop deal', description: 'Private campaign for approved members of the SmartTech Partners programme.', status: 'APPROVED', access: 'PRIVATE', programId: 'pg1', commissionValue: '7.00' }),
    camp({ id: 'k6', businessId: 'b1', name: 'Smartwatch bundle (draft)', description: 'Draft campaign for the smartwatch + strap bundle.', status: 'DRAFT', approvedAt: null }),
  ];
  const applications: T.CampaignApplication[] = [
    { id: 'ap1', campaignId: 'k1', affiliateId: 'a1', status: 'APPROVED', message: null, reviewedAt: ago(18), createdAt: ago(18) },
    { id: 'ap2', campaignId: 'k3', affiliateId: 'a1', status: 'APPROVED', message: null, reviewedAt: ago(15), createdAt: ago(15) },
    { id: 'ap3', campaignId: 'k2', affiliateId: 'a2', status: 'PENDING', message: 'I run a 12k-subscriber tech & money newsletter and would love to feature the earbuds.', reviewedAt: null, createdAt: ago(1) },
    { id: 'ap4', campaignId: 'k2', affiliateId: 'a3', status: 'PENDING', message: 'TikTok unboxing videos — 85k followers.', reviewedAt: null, createdAt: ago(2) },
    { id: 'ap5', campaignId: 'k1', affiliateId: 'a2', status: 'APPROVED', message: null, reviewedAt: ago(10), createdAt: ago(10) },
    { id: 'ap6', campaignId: 'k7', affiliateId: 'a1', status: 'APPROVED', message: null, reviewedAt: ago(3), createdAt: ago(3) },
    { id: 'ap7', campaignId: 'k8', affiliateId: 'a1', status: 'APPROVED', message: null, reviewedAt: ago(3), createdAt: ago(3) },
  ];
  const referrals: T.Referral[] = [
    { id: 'r1', code: 'ADA-A55-x7Q2pL', campaignId: 'k1', affiliateId: 'a1', createdAt: ago(18) },
    { id: 'r2', code: 'ADA-PAYL-m3Kz9', campaignId: 'k3', affiliateId: 'a1', createdAt: ago(15) },
    { id: 'r3', code: 'TUNDE-A55-p0Rt', campaignId: 'k1', affiliateId: 'a2', createdAt: ago(10) },
    { id: 'r4', code: 'ADA-WATCH-q8Zr', campaignId: 'k7', affiliateId: 'a1', createdAt: ago(3) },
    { id: 'r5', code: 'ADA-EARB-t2Lm', campaignId: 'k8', affiliateId: 'a1', createdAt: ago(3) },
  ];
  const clicks: DB['clicks'] = [];
  const addClicks = (rid: string, count: number, maxDays: number) => {
    for (let i = 0; i < count; i++) clicks.push({ id: `${rid}c${i}`, referralId: rid, clickedAt: ago((i * 7919) % maxDays), source: ['instagram', 'youtube', 'whatsapp', null][i % 4] ?? null });
  };
  addClicks('r1', 214, 18);
  addClicks('r2', 96, 15);
  addClicks('r3', 41, 10);

  const conv = (c: Partial<T.Conversion> & Pick<T.Conversion, 'id' | 'campaignId' | 'affiliateId' | 'referralId' | 'externalReference' | 'amount' | 'status'>): T.Conversion => ({
    customerReference: null, currency: 'NGN', submittedById: 'u_biz', reviewedById: c.status === 'PENDING' ? null : 'u_biz', rejectionReason: null, evidenceUrl: null,
    convertedAt: ago(5), reviewedAt: c.status === 'PENDING' ? null : ago(4), createdAt: ago(5), updatedAt: ago(4), ...c,
  });
  const conversions: T.Conversion[] = [
    conv({ id: 'v1', campaignId: 'k1', affiliateId: 'a1', referralId: 'r1', externalReference: 'ORD-10231', amount: '385000.00', status: 'APPROVED', convertedAt: ago(20), reviewedAt: ago(19), createdAt: ago(20) }),
    conv({ id: 'v2', campaignId: 'k1', affiliateId: 'a1', referralId: 'r1', externalReference: 'ORD-10288', amount: '385000.00', status: 'APPROVED', convertedAt: ago(6), reviewedAt: ago(5) }),
    conv({ id: 'v3', attributionSource: 'WEBHOOK', campaignId: 'k1', affiliateId: 'a1', referralId: 'r1', externalReference: 'ORD-10302', amount: '385000.00', status: 'PENDING', convertedAt: ago(1), createdAt: ago(1) }),
    conv({ id: 'v4', campaignId: 'k1', affiliateId: 'a1', referralId: 'r1', externalReference: 'ORD-10297', amount: '385000.00', status: 'REJECTED', rejectionReason: 'Order cancelled and refunded by customer.' }),
    conv({ id: 'v5', attributionSource: 'COUPON', campaignId: 'k1', affiliateId: 'a2', referralId: 'r3', externalReference: 'ORD-10310', amount: '385000.00', status: 'PENDING', convertedAt: ago(0.5), createdAt: ago(0.5), customerReference: 'cust-88124' }),
  ];
  const commissions: T.Commission[] = [
    { id: 'm1', conversionId: 'v1', campaignId: 'k1', affiliateId: 'a1', grossAmount: '385000.00', commissionAmount: '30800.00', currency: 'NGN', status: 'AVAILABLE', availableAt: ago(5), createdAt: ago(19), updatedAt: ago(5) },
    { id: 'm2', conversionId: 'v2', campaignId: 'k1', affiliateId: 'a1', grossAmount: '385000.00', commissionAmount: '30800.00', currency: 'NGN', status: 'PENDING', availableAt: ahead(9), createdAt: ago(5), updatedAt: ago(5) },
  ];
  const we = (e: Omit<T.WalletEntry, 'currency' | 'affiliateId'>): T.WalletEntry => ({ affiliateId: 'a1', currency: 'NGN', ...e });
  const walletEntries: T.WalletEntry[] = [
    we({ id: 'w6', type: 'AVAILABLE_DEBIT', amount: '10000.00', referenceType: 'WITHDRAWAL', referenceId: 'wd2', description: 'Withdrawal request deducted from available balance', createdAt: ago(1) }),
    we({ id: 'w5', type: 'PENDING_CREDIT', amount: '30800.00', referenceType: 'COMMISSION', referenceId: 'm2', description: 'Pending commission for conversion v2', createdAt: ago(5) }),
    we({ id: 'w7', type: 'WITHDRAWN', amount: '15000.00', referenceType: 'WITHDRAWAL', referenceId: 'wd1', description: 'Withdrawal marked paid by administrator', createdAt: ago(3) }),
    we({ id: 'w4', type: 'AVAILABLE_DEBIT', amount: '15000.00', referenceType: 'WITHDRAWAL', referenceId: 'wd1', description: 'Withdrawal request deducted from available balance', createdAt: ago(4) }),
    we({ id: 'w3', type: 'AVAILABLE_CREDIT', amount: '30800.00', referenceType: 'COMMISSION_RELEASE', referenceId: 'm1', description: 'Commission available for withdrawal', createdAt: ago(5) }),
    we({ id: 'w2', type: 'PENDING_DEBIT', amount: '30800.00', referenceType: 'COMMISSION_RELEASE', referenceId: 'm1', description: 'Pending commission released', createdAt: ago(5) }),
    we({ id: 'w1', type: 'PENDING_CREDIT', amount: '30800.00', referenceType: 'COMMISSION', referenceId: 'm1', description: 'Pending commission for conversion v1', createdAt: ago(19) }),
  ];
  const withdrawals: T.Withdrawal[] = [
    { id: 'wd2', affiliateId: 'a1', amount: '10000.00', currency: 'NGN', status: 'PENDING', bankName: 'GTBank', accountName: 'Ada Okafor', accountNumber: '0123456789', adminNote: null, paymentReference: null, reviewedById: null, processedAt: null, createdAt: ago(1), updatedAt: ago(1) },
    { id: 'wd1', affiliateId: 'a1', amount: '15000.00', currency: 'NGN', status: 'PAID', bankName: 'GTBank', accountName: 'Ada Okafor', accountNumber: '0123456789', adminNote: 'Paid manually', paymentReference: 'GTB-TRF-883120', reviewedById: 'u_admin', processedAt: ago(3), createdAt: ago(4), updatedAt: ago(3) },
  ];
  const nt = (userId: string, type: T.NotificationType, title: string, message: string, d: number, read = false): T.Notification => ({ id: `n${Math.random().toString(36).slice(2, 9)}`, userId, type, title, message, readAt: read ? ago(d) : null, createdAt: ago(d) });
  const notifications: T.Notification[] = [
    nt('u_aff', 'CONVERSION', 'New conversion submitted', 'A business submitted a conversion for review.', 1),
    nt('u_aff', 'CONVERSION', 'Conversion approved', 'Your conversion was approved.', 5),
    nt('u_aff', 'WITHDRAWAL', 'Withdrawal paid', 'Your withdrawal of ₦15,000.00 was paid. Ref GTB-TRF-883120.', 3, true),
    nt('u_biz', 'CAMPAIGN', 'Campaign approved', 'Galaxy A55 launch — 8% per sale is now live.', 20, true),
    nt('u_biz', 'APPLICATION', 'New affiliate applications', '2 affiliates applied to Earbuds Pro.', 1),
    nt('u_biz2', 'BUSINESS_VERIFICATION', 'Verification received', 'We are reviewing your business details.', 1),
  ];
  return { users, affiliates, businesses, products, campaigns, applications, referrals, clicks, conversions, commissions, walletEntries, withdrawals, notifications, auditLogs: [] };
}
