# Putting Flyover online

Three hosts: **Neon** (database), **Render** (backend), **Netlify** (frontend). All three have free plans; see "Free plan limits" at the end before you rely on them. Commands are for Windows PowerShell.

Tick each box as you go.

## 1. Put the code on GitHub
- [ ] Create a **private** repository on github.com (empty, no README).
- [ ] In the `flyover` folder:
```powershell
git init
git add .
git commit -m "Flyover"
git branch -M main
git remote add origin https://github.com/YOUR-NAME/YOUR-REPO.git
git push -u origin main
```
- [ ] Run `git status` before committing. No `.env` or `.env.local` file should be listed. The `.gitignore` here already excludes them.

## 2. Make your secrets
- [ ] Generate the integration key (64 characters) and save it somewhere private:
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
- [ ] Choose a long, strong password for the admin account.

## 3. Create the database (Neon)
- [ ] Sign up at neon.com and create a project.
- [ ] Copy the **connection string** (it starts with `postgresql://`).

## 4. Prepare the database from your computer (once)
```powershell
cd backend
npm install
$env:DATABASE_URL = "PASTE-THE-NEON-CONNECTION-STRING"
$env:ADMIN_EMAIL = "you@example.com"
$env:ADMIN_PASSWORD = "YOUR-STRONG-ADMIN-PASSWORD"
npx prisma migrate deploy
npm run db:seed
```
- [ ] `migrate deploy` finishes without errors. If it hangs, use Neon's direct (non-pooled) connection string.
- [ ] `db:seed` prints "Admin ready: you@example.com".
- [ ] Run `npx prisma migrate deploy` again from your computer any time the backend developer adds a migration.

## 5. Deploy the backend (Render)
- [ ] Sign up at render.com. Choose **New, Blueprint**, connect GitHub and pick your repository. Render reads `render.yaml`.
- [ ] When asked for values, enter:
  - `DATABASE_URL`: the Neon connection string
  - `INTEGRATION_ENCRYPTION_KEY`: the key from step 2
  - `API_PUBLIC_URL`, `APP_BASE_URL`, `CORS_ORIGINS`: type `https://placeholder.example` for now. You fix them in step 8.
- [ ] After the first deploy, copy your service address (like `https://flyover-api.onrender.com`).
- [ ] Open `https://YOUR-RENDER-ADDRESS/api/v1/health`. It should say `"status":"ok"` and `"database":"connected"`. On the free plan the first load can take about a minute.

## 6. Deploy the frontend (Netlify)
- [ ] Sign up at netlify.com. Choose **Add new site, Import an existing project**, connect GitHub and pick your repository. Netlify reads `netlify.toml`.
- [ ] Before deploying, add this environment variable (Site configuration, Environment variables):
  - `NEXT_PUBLIC_API_BASE_URL` = `https://YOUR-RENDER-ADDRESS/api/v1`
- [ ] Deploy, then copy your Netlify address (like `https://your-site.netlify.app`).

## 7. Tell the frontend and backend about each other
On Render, open your service, Environment, and set:
- [ ] `API_PUBLIC_URL` = your Render address (no trailing slash)
- [ ] `APP_BASE_URL` = your Netlify address
- [ ] `CORS_ORIGINS` = your Netlify address (if you add a custom domain later, add it too, separated by commas)
- [ ] Save. Render redeploys. Wait for it to finish.

## 8. Try it
- [ ] Open your Netlify address and sign in with the admin email and password from step 4.
- [ ] Register a business, then approve it as admin.
- [ ] Create a campaign, approve it, join it with an affiliate account, and click through a referral, a conversion, a commission and a withdrawal request.
- [ ] Do **not** run `e2e/contract_real_backend.py` against this live site. It creates test businesses and campaigns.

## Free plan limits
- **Render free backend** sleeps after 15 minutes idle and takes about a minute to wake. For a real launch, change `plan: free` to `plan: starter` in `render.yaml` (about $7/month).
- **Neon free database** is limited to 1 GB and sleeps after 5 minutes idle, so the first request after a quiet spell is slow. Back it up yourself.
- **Render's own free database expires**, which is why this guide uses Neon.
- **Vercel's free plan is not allowed for commercial use.** Netlify's free plan is.
- Check each provider's current limits before launch. They change.

## Known issues
- **Backend start script:** `backend/package.json` has `"start": "node dist/server.js"`, but the build writes the file to `dist/src/server.js`, so `npm start` fails. `render.yaml` uses the correct path. Ask the backend developer to fix the script. If they instead change the build output, update `startCommand` in `render.yaml` to match.
- **Password reset and email verification** do not exist in the backend yet. A user who forgets a password is locked out until they exist.
- **The app records payments, it does not send money.** Creator payments and withdrawals are marked paid by people.
