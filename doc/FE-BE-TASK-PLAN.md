# TROO AI — Frontend ↔ Backend Integration Task Plan

**Stack:** Next.js 16 (App Router) · Express.js · MongoDB · Socket.IO · BullMQ  
**Base URL (dev):** `http://localhost:5000/api`  
**Frontend port:** `3100`

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Fully wired — FE calls BE, response handled |
| 🔶 | Partially wired — call exists, response handling incomplete |
| ❌ | Not wired — UI exists but uses mock data or has no API call |
| 🚫 | BE endpoint does not exist yet |

---

## Module 1 — Authentication & User Management

| # | Task | FE File | BE Endpoint | Status | Notes |
|---|------|---------|-------------|--------|-------|
| 1.1 | Register | `app/actions/auth.ts` | `POST /auth/register` | ✅ | Returns success message; no auto-login after signup |
| 1.2 | Login | `app/actions/auth.ts` | `POST /auth/login` | ✅ | Creates Next.js session cookie |
| 1.3 | Logout | `app/actions/auth.ts` | `POST /auth/logout` | ✅ | Clears session + refresh token |
| 1.4 | Forgot password | `app/actions/auth.ts` | `POST /auth/forgot-password` | ✅ | Always returns success (no email enumeration) |
| 1.5 | Reset password page | ❌ page missing | `POST /auth/reset-password` | ❌ | BE route ready; need `/reset-password?token=` page |
| 1.6 | Email verify page | ❌ page missing | `GET /auth/verify-email?token=` | ❌ | BE route ready; need `/verify-email?token=` page |
| 1.7 | Google OAuth | `components/auth/LoginForm.tsx` (button only) | 🚫 `GET /auth/google` | 🚫 | Passport.js config in BE; routes not wired; FE button not linked |
| 1.8 | GitHub OAuth | `components/auth/SignupForm.tsx` (button only) | 🚫 `GET /auth/github` | 🚫 | Same as above |
| 1.9 | Load current user on mount | `components/dashboard/SidebarWrapper.tsx` | `GET /auth/me` | ❌ | Topbar shows hardcoded "U" / "John Doe"; call `authApi.getMe()` on mount and store in Redux |
| 1.10 | Token hydration on page reload | `lib/api/client.ts` (tokenStore reads localStorage) | `GET /auth/me` | 🔶 | Token is read from localStorage but user profile is not reloaded |

---

## Module 2 — Dashboard

| # | Task | FE File | BE Endpoint | Status | Notes |
|---|------|---------|-------------|--------|-------|
| 2.1 | Stats cards | `app/(dashboard)/dashboard/page.tsx` | `GET /dashboard/stats` | ✅ | `useDashboardStats` hook |
| 2.2 | Recent activity list | `app/(dashboard)/dashboard/page.tsx` | `GET /dashboard/recent-activity` | ✅ | `useRecentActivity` hook |
| 2.3 | Credit usage chart (analytics) | `app/(dashboard)/dashboard/analytics/page.tsx` | `GET /dashboard/credit-usage?period=` | ❌ | FE has custom bar chart with hardcoded data; replace with `useCreditUsage(period)` hook |
| 2.4 | Generation history table (analytics) | `app/(dashboard)/dashboard/analytics/page.tsx` | `GET /generations?page=&framework=` | ❌ | Currently hardcoded rows; wire `useGenerations({ framework })` |
| 2.5 | Download history | `app/(dashboard)/dashboard/analytics/page.tsx` | 🚫 `GET /generations?zipUrl[$exists]=true` | 🚫 | Filter by `zipUrl` existing; BE needs query param or separate endpoint |
| 2.6 | Credits in topbar | `components/dashboard/SidebarWrapper.tsx` | `GET /auth/me` | ❌ | Hardcoded `475`; read from user object after 1.9 is done |
| 2.7 | User avatar / initials in topbar | `components/dashboard/SidebarWrapper.tsx` | `GET /auth/me` | ❌ | Hardcoded `"U"`; derive initials from `user.name` |

---

## Module 3 — AI Workspace & Generation

| # | Task | FE File | BE Endpoint | Status | Notes |
|---|------|---------|-------------|--------|-------|
| 3.1 | List workspaces | `app/(dashboard)/dashboard/workspaces/page.tsx` | `GET /workspaces` | ✅ | `useWorkspaces()` hook |
| 3.2 | Create workspace + enqueue text generation | `app/(dashboard)/dashboard/workspaces/new/page.tsx` | `POST /workspaces` + `POST /generations` | ✅ | Creates workspace then enqueues |
| 3.3 | Figma URL generation | `app/(dashboard)/dashboard/workspaces/new/page.tsx` | `POST /generations { inputMode: 'figma' }` | 🔶 | FE submits correctly; BE `aiService.fetchFigmaDesign()` needs `FIGMA_API_TOKEN` in `.env` |
| 3.4 | Image upload → generation | `app/(dashboard)/dashboard/workspaces/new/page.tsx` | `POST /generations/upload-image` | ✅ | Frontend uploads files/images to backend, backend uploads to S3 or local uploads folder, then enqueues generation with imageKey |
| 3.5 | Load workspace chat history | `app/(dashboard)/dashboard/workspaces/(chat)/[id]/page.tsx` | `GET /generations?workspaceId=` | ❌ | Page uses `mockInitialMessages`; load real generation history on mount |
| 3.6 | Send chat prompt (refinement) | `app/(dashboard)/dashboard/workspaces/(chat)/[id]/page.tsx` | `POST /generations` | ❌ | FE calls `setTimeout` mock; replace with `generationsApi.generate()` |
| 3.7 | Poll generation status | `lib/api/hooks.ts` — `useGeneration(id)` | `GET /generations/:id` | 🔶 | Hook polls every 2s when pending/processing; chat page still uses mock |
| 3.8 | Socket.IO — real-time generation events | `lib/api/client.ts` | `socket.io /` | ❌ | BE emits `generation:status`; FE has no `socket.io-client` connection; replace polling with push |
| 3.9 | Export / Download ZIP | `app/(dashboard)/dashboard/workspaces/(chat)/[id]/page.tsx` | `GET /generations/:id/download` | ❌ | FE Export button does nothing; wire `generationsApi.getDownloadUrl(id)` then `window.open(url)` |
| 3.10 | Copy code to clipboard | `app/(dashboard)/dashboard/workspaces/(chat)/[id]/page.tsx` | — (client-side only) | 🔶 | `navigator.clipboard.writeText` exists but operates on mock code; works once 3.5–3.6 done |
| 3.11 | Rename workspace | `components/workspace/WorkspaceActionsMenu.tsx` | `PATCH /workspaces/:id` | ✅ | Calls `workspacesApi.update` |
| 3.12 | Archive / Unarchive workspace | `components/workspace/WorkspaceActionsMenu.tsx` | `PATCH /workspaces/:id` | ✅ | Calls `workspacesApi.update` |
| 3.13 | Delete workspace | `components/workspace/WorkspaceActionsMenu.tsx` | `DELETE /workspaces/:id` | ✅ | Calls `workspacesApi.remove` |
| 3.14 | Version history | `components/workspace/VersionHistory.tsx` | `GET /workspaces/:id/versions` | ✅ | `useWorkspaceVersions(id)` |
| 3.15 | Restore / download specific version | `components/workspace/VersionHistory.tsx` | `GET /generations/:id/download` | ❌ | Download button exists but not wired |

---

## Module 4 — Projects

| # | Task | FE File | BE Endpoint | Status | Notes |
|---|------|---------|-------------|--------|-------|
| 4.1 | Projects list | `app/(dashboard)/dashboard/projects/page.tsx` | `GET /workspaces` | 🔶 | Reuses workspace data; projects = workspaces in current model |
| 4.2 | Create project | `app/(dashboard)/dashboard/projects/new/page.tsx` | `POST /workspaces` | ❌ | Form submits but only redirects; wire `workspacesApi.create()` with name + framework |
| 4.3 | Project detail page | `app/(dashboard)/dashboard/projects/[id]/page.tsx` | `GET /workspaces/:id` + `GET /workspaces?userId=` | ❌ | Uses `mockProject`; load real workspace and its child generations |

---

## Module 5 — Subscription & Billing

| # | Task | FE File | BE Endpoint | Status | Notes |
|---|------|---------|-------------|--------|-------|
| 5.1 | Load live pricing plans | `app/(dashboard)/dashboard/billing/page.tsx` | `GET /admin/plans` | ❌ | Hardcoded Free/Pro/Agency; fetch from `adminApi.listPlans()` so admin price changes reflect live |
| 5.2 | Stripe checkout — Upgrade button | `app/(dashboard)/dashboard/billing/page.tsx` | `POST /billing/checkout` | ❌ | "Upgrade" button has no `onClick`; call `billingApi.createCheckout(priceId, billing)` and redirect to returned URL |
| 5.3 | Stripe billing portal | `app/(dashboard)/dashboard/billing/page.tsx` | `POST /billing/portal` | ❌ | No "Manage subscription" button exists yet; call `billingApi.openPortal()` |
| 5.4 | Invoice history | `app/(dashboard)/dashboard/billing/invoices/page.tsx` | 🚫 `GET /billing/invoices` | 🚫 | Static mock; BE needs to fetch invoices from Stripe API |
| 5.5 | Plan limit exceeded modal | `components/ui/LimitModal.tsx` | Triggered from FE on 402 response | ❌ | `LimitModal` component exists; show it when any API returns `402 Payment Required` with `{ required, remaining }` |
| 5.6 | Stripe webhook | `backend/src/routes/billing.ts` | `POST /billing/webhook` (raw body) | ✅ | BE ready; needs `STRIPE_WEBHOOK_SECRET` in `.env` and live Stripe config to test |

---

## Module 6 — Admin Panel

| # | Task | FE File | BE Endpoint | Status | Notes |
|---|------|---------|-------------|--------|-------|
| 6.1 | Admin KPI stats | `app/(admin)/admin/dashboard/page.tsx` | `GET /admin/stats` | ✅ | `useAdminStats()` |
| 6.2 | User list with search / plan filter | `app/(admin)/admin/users/page.tsx` | `GET /admin/users` | ✅ | Live search + plan filter |
| 6.3 | Suspend user | `app/(admin)/admin/users/page.tsx` | `PATCH /admin/users/:id/suspend` | ✅ | |
| 6.4 | Activate user | `app/(admin)/admin/users/page.tsx` | `PATCH /admin/users/:id/activate` | ✅ | |
| 6.5 | Reset credits | `app/(admin)/admin/users/page.tsx` | `PATCH /admin/users/:id/reset-credits` | ✅ | |
| 6.6 | Plans list | `app/(admin)/admin/plans/page.tsx` | `GET /admin/plans` | ❌ | FE still hardcoded; wire `useAdminPlans()` |
| 6.7 | Edit plan | `app/(admin)/admin/plans/page.tsx` | `PATCH /admin/plans/:id` | ❌ | "Edit" button exists; needs inline edit form + `adminApi.updatePlan()` |
| 6.8 | Audit logs with filter + pagination | `app/(admin)/admin/audit-logs/page.tsx` | `GET /admin/logs` | ✅ | `useAdminLogs()` with action filter + pagination |
| 6.9 | Payments table | `app/(admin)/admin/payments/page.tsx` | 🚫 `GET /admin/payments` | 🚫 | Static mock; BE needs Stripe `charges.list()` endpoint |
| 6.10 | AI model config — save changes | `app/(admin)/admin/ai-config/page.tsx` | 🚫 `GET/PATCH /admin/ai-config` | 🚫 | UI is static; BE needs to read/write Config collection |
| 6.11 | Content moderation — save patterns | `app/(admin)/admin/moderation/page.tsx` | 🚫 `GET/POST/DELETE /admin/moderation` | 🚫 | UI is static; BE needs CRUD for Config `moderation.blockedPatterns` |
| 6.12 | Admin settings — save | `app/(admin)/admin/settings/page.tsx` | 🚫 `GET/PATCH /admin/settings` | 🚫 | Static form; BE needs platform config endpoint |

---

## Module 7 — User Settings

| # | Task | FE File | BE Endpoint | Status | Notes |
|---|------|---------|-------------|--------|-------|
| 7.1 | Load profile | `app/(dashboard)/dashboard/settings/page.tsx` | `GET /auth/me` | ❌ | Form has hardcoded `"John Doe"` / `"john@example.com"` |
| 7.2 | Save profile (name, email) | `app/(dashboard)/dashboard/settings/page.tsx` | 🚫 `PATCH /users/me` | 🚫 | BE needs user self-update endpoint |
| 7.3 | Change password | `app/(dashboard)/dashboard/settings/page.tsx` | 🚫 `PATCH /users/me/password` | 🚫 | BE needs authenticated password change endpoint |
| 7.4 | Delete account | `app/(dashboard)/dashboard/settings/page.tsx` | 🚫 `DELETE /users/me` | 🚫 | BE needs soft-delete / GDPR erasure endpoint |

---

## Priority Order for Development

### Sprint 1 — Core flow completeness
| Ref | Task |
|-----|------|
| 1.9 | Load `/auth/me` on mount → populate topbar user name, initials, credits |
| 3.5 | Load real chat history from `GET /generations?workspaceId=` |
| 3.6 | Wire chat prompt submission to `POST /generations` |
| 3.7 | Connect `useGeneration` polling to chat status UI |
| 3.9 | Wire Export ZIP button |
| 4.2 | Wire project create form |

### Sprint 2 — Billing & plans
| Ref | Task |
|-----|------|
| 5.1 | Load live plans from BE |
| 5.2 | Wire Upgrade button → Stripe checkout |
| 5.3 | Wire billing portal button |
| 5.5 | Show LimitModal on 402 responses |
| 6.6 | Admin plans list live |
| 6.7 | Admin edit plan form |

### Sprint 3 — Remaining API wiring
| Ref | Task |
|-----|------|
| 2.3 | Analytics credit usage chart from real data |
| 2.4 | Analytics generation history from real data |
| 7.1–7.3 | Settings profile + password forms |
| 1.5–1.6 | Reset password + email verify pages |
| 3.8 | Socket.IO real-time generation updates |

### Sprint 4 — New BE endpoints required
| Ref | Task |
|-----|------|
| 3.4 | Image upload multipart endpoint + S3 |
| 1.7–1.8 | Google / GitHub OAuth routes |
| 5.4 | Stripe invoice list endpoint |
| 6.9 | Admin payments from Stripe |
| 6.10–6.12 | AI config / moderation / platform settings CRUD |
| 7.2–7.4 | User self-update, password change, delete account |
| 2.5 | Download history filter endpoint |

---

## Environment Variables Checklist

### Frontend — `.env.local`
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
SESSION_SECRET=<min 32 chars>
```

### Backend — `.env`
```
PORT=5000
CLIENT_URL=http://localhost:3100
MONGODB_URI=mongodb://localhost:27017/troo-ai
JWT_ACCESS_SECRET=<min 32 chars>
JWT_REFRESH_SECRET=<min 32 chars>
OPENAI_API_KEY=sk-...          # Required for generation
FIGMA_API_TOKEN=...            # Required for Figma conversion
AWS_ACCESS_KEY_ID=...          # Required for ZIP storage
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET_NAME=troo-ai-themes
STRIPE_SECRET_KEY=sk_test_...  # Required for billing
STRIPE_WEBHOOK_SECRET=whsec_...
REDIS_URL=redis://localhost:6379  # Required for BullMQ queue
```

---

## Quick Start (Dev)

```bash
# 1. MongoDB + Redis (Docker)
docker run -d -p 27017:27017 mongo:7
docker run -d -p 6379:6379 redis:7-alpine

# 2. Backend
cd backend
cp .env.example .env          # fill in secrets
npm run migrate:up            # creates plans + admin user
npm run seed:dev              # test accounts (password: Test1234!)
npm run dev                   # http://localhost:5000

# 3. Frontend
cd frontend
# .env.local already exists
npm run dev                   # http://localhost:3100
```
