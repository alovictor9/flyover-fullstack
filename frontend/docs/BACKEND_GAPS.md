# Backend gaps found while building the frontend (Phases 1–10)

Every item below has a finished screen or a clearly marked **Coming soon** block in the UI, and shows which endpoint it is waiting for (`ComingSoon` component). Once an endpoint is added, wiring it up only touches `src/lib/endpoints.ts`, `src/lib/types.ts` and the screen listed.

Ordered by impact on the MVP definition of done.

## Required for MVP acceptance / launch

| # | Gap | Why it matters | Suggested endpoint | Frontend screen |
|---|-----|----------------|--------------------|-----------------|
| 1 | **Admin can't list commissions.** `POST /admin/commissions/:id/release` needs an ID, but no admin endpoint returns commission IDs. | Admins can't find matured commissions without DB access. | `GET /admin/commissions?status=PENDING&matured=true` (or a scheduled release job) | `/admin/commissions` (release-by-ID works today) |
| 2 | **Affiliate can't list their own applications.** | Affiliates can't see "awaiting approval" or "declined" across devices. The UI currently remembers pending applications in localStorage, on that device only. | `GET /affiliates/applications` | `/affiliate/links`, `/marketplace/[id]` |
| 3 | **Affiliate can't list their conversions.** Only counts are available (analytics, `_count` on referrals). | Roadmap phase 7: "affiliate conversion history and clear status explanations"; rejection reasons are invisible to affiliates. | `GET /affiliates/conversions` (incl. `rejectionReason`, `externalReference`, commission) | `/affiliate/conversions` |
| 4 | **Password reset and email verification.** | Phase 2 exit criteria. | `POST /auth/password/forgot`, `POST /auth/password/reset`, `POST /auth/verify-email` | `/forgot-password`, `/verify-email` (UI complete) |
| 5 | **Audit log read endpoint.** Records are written but can't be viewed. | "Financial records and administrative actions are auditable." | `GET /admin/audit-logs?entityType=&entityId=&actorId=` | `/admin/audit` |
| 6 | **Refresh token in JSON.** | XSS could steal a long-lived token. | Move to an HttpOnly, Secure, SameSite cookie; the frontend then drops `refreshToken` from `sessionStore` | `src/lib/api-client.ts` |

## Roadmap items with UI ready, waiting on API

| Gap | Suggested endpoint | Screen |
|-----|--------------------|--------|
| Invitation-only campaigns: send/accept/decline invites | `POST /campaigns/:id/invitations`, `GET /affiliates/invitations`, `POST /invitations/:id/accept` | business campaign detail, marketplace detail |
| Conversion reversal / disputes | `POST /businesses/conversions/:id/reverse`, dispute endpoints | business conversions drawer |
| Product edit / archive / image upload | `PATCH /products/:id`, `DELETE /products/:id`, upload | `/business/products` |
| Verification document upload | `POST /businesses/verification/documents` | `/business/verification` |
| Edit account (name, phone), change password | `PATCH /auth/me`, `POST /auth/password/change` | `/settings` |
| Per-campaign clicks for businesses | add `_count.clicks` to `GET /campaigns/mine` | business campaign detail |
| Time-series analytics and per-source breakdown | `GET /analytics/*?from=&to=&groupBy=day\|source` | both analytics pages |
| Marketplace filters for access mode and commission type | add `access`, `commissionType` query params | `/marketplace` (filtered client-side on the current page for now) |
| Admin fraud alerts / financial summary | `GET /admin/fraud-alerts`, `GET /admin/finance/summary` | `/admin` |
| Notification preferences | `GET/PATCH /notifications/preferences` | `/notifications` |
| Mark all notifications read | `PATCH /notifications/read-all` (UI loops over items for now) | `/notifications` |

## Behaviour notes (confirm with backend)

- **Campaign edits.** `PATCH /campaigns/:id` only accepts name, description, instructions, commissionValue, access and destinationUrl. The edit modal matches this; other terms can't change after creation.
- **New businesses start as `PENDING`** with `submittedAt = null`. The UI treats "PENDING + no submittedAt" as *not yet submitted*, and the admin queue only shows submitted ones. A separate `NOT_SUBMITTED` status would be clearer.
- **Decimals arrive as strings** (`"6000"`). The UI formats them without arithmetic. Wallet balances come back as JS numbers; that's fine for display, but the server should keep using Decimal internally.
- **Minimum withdrawal** is hard-coded to NGN 5,000 on the server. The UI reads `NEXT_PUBLIC_MIN_WITHDRAWAL`; keep the two in sync, or expose it from `/wallet`.
- **Referral links** point to `GET /api/v1/r/:code` on the API host. For production, put that behind a short public domain and set `NEXT_PUBLIC_REFERRAL_BASE_URL`.
