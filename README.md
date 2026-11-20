# Flyover: The Affiliate Growth Network

One folder with both halves of the product.

```
flyover/
├── backend/    Express + Prisma + PostgreSQL API (the backend developer's work, unchanged)
└── frontend/   Next.js web app (all roadmap phases 1 to 12)
```

## Run it

You need a current Node.js LTS and Docker (for PostgreSQL).

**1. Backend** (port 4000)
```bash
cd backend
docker compose up -d                 # PostgreSQL
cp .env.example .env                 # then fill in the secrets (see comments in the file)
npm install
npx prisma migrate deploy
npm run db:seed                      # creates the admin account from .env
npm run dev
```

**2. Frontend** (port 3000)
```bash
cd frontend
cp .env.example .env.local           # defaults already point at http://localhost:4000/api/v1
npm install
npm run dev
```
Open http://localhost:3000. To try the whole UI without a backend, set `NEXT_PUBLIC_USE_MOCKS=true` in `.env.local`. Demo logins for mock mode are in `frontend/README.md`.

## Put it online

See `DEPLOY.md` for a step-by-step checklist (Neon database, Render backend, Netlify frontend). `render.yaml` and `netlify.toml` hold the host settings.

## Checks

| What | Command | Needs |
| --- | --- | --- |
| Backend tests | `cd backend && npm test` | see `backend/README.md` |
| Frontend type check and build | `cd frontend && npx tsc --noEmit && npm run build` | nothing |
| API contract test (Phase 11 to 12 screens vs the real backend) | `cd frontend/e2e && API=http://localhost:4000/api/v1 ADMIN_PASSWORD=... python3 contract_real_backend.py` | running backend |
| Browser smoke test, every page in mock mode | `python3 frontend/e2e/smoke_mock_all_pages.py` | Playwright + Chrome |
| Browser acceptance test against the real backend | `python3 frontend/e2e/acceptance_real_backend.py` | running backend, Playwright + Chrome |

## What is and is not connected

The frontend uses 81 of the backend's 88 endpoints. Of the other 7, six are meant for outside systems and are not called by the app itself (the customer-facing referral redirect, the health check, the tracking script and tracking events, webhooks, and API-key conversion reporting). The seventh, a single creator's public profile, has no screen yet.

These screens show "Coming soon" because the backend has no endpoints for them yet: password reset, email verification, the audit log, affiliate applications and conversions lists, the admin commissions list, and invitations. See `frontend/docs/BACKEND_GAPS.md`.
