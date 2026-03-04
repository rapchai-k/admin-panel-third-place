# External Integrations

**Analysis Date:** 2026-03-03

## APIs & External Services

**Backend Platform API (Primary):**
- Supabase - Used as BaaS for database access, RPC, auth session APIs, and storage operations.
  - SDK/Client: `@supabase/supabase-js` (`src/integrations/supabase/client.ts`).
  - Auth: `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` in environment configuration (`.env.example`, `src/integrations/supabase/client.ts`).
  - Endpoints/operations used: table CRUD (`supabase.from(...)`), RPC (`supabase.rpc(...)`), auth (`supabase.auth.*`), storage (`supabase.storage.from(...)`) across `src/pages/admin/**`, `src/components/admin/**`, `src/lib/**`.

**Identity/OAuth Provider:**
- Google OAuth (via Supabase Auth) - Admin sign-in option.
  - Integration method: `supabase.auth.signInWithOAuth({ provider: 'google' })` in `src/components/admin/AdminLoginPage.tsx`.
  - Callback/session exchange: `src/components/admin/AdminOAuthCallback.tsx`.
  - Credentials are configured in Supabase provider settings; client uses Supabase anon credentials.

**External Application Surface:**
- Consumer panel domain (`mythirdplace.rapchai.com`) - Admin panel constructs shareable consumer URLs for events/communities.
  - Integration method: URL composition in `src/lib/short-url.ts`.
  - Auth: none in this frontend; base URL sourced from `VITE_CONSUMER_URL`.

**Payments (Schema/UI-level integration):**
- Razorpay (field-level integration in data model/UI) - Payment identifiers and gateway metadata are surfaced in admin payment and registration views.
  - Evidence: `razorpay_payment_id`, `razorpay_payment_link_id`, `gateway` handling in `src/pages/admin/PaymentsPage.tsx`, `src/pages/admin/RegistrationsPage.tsx`, `src/components/admin/PaymentDetailsModal.tsx`.
  - Direct API client for Razorpay is not present in this repository; payment execution appears to occur outside this frontend codebase.

## Data Storage

**Databases:**
- PostgreSQL on Supabase - Primary relational datastore.
  - Connection: browser client initialized from `VITE_SUPABASE_URL` (`src/integrations/supabase/client.ts`).
  - Client: Supabase JS query builder/RPC client (`@supabase/supabase-js`).
  - Migrations: SQL migrations in `supabase/migrations/*.sql`; local dev instructions in `SUPABASE_LOCAL_DEV.md`.

**File Storage:**
- Supabase Storage - Media upload and public URL retrieval.
  - Client API usage: `supabase.storage.from(bucket).upload/getPublicUrl/remove` in `src/components/ui/file-upload.tsx`, `src/lib/gallery-media.ts`.
  - Buckets defined/policy-managed in migrations:
    - `user-avatars`, `community-images`, `event-images` (`supabase/migrations/20250807145109_e092c50d-220e-4356-bec4-7c50e3864bbb.sql`)
    - `galleries` (`supabase/migrations/20260302110000_add_gallery_media_admin_policies.sql`)

**Caching:**
- Client-side request caching via TanStack Query (in-process browser cache), not an external cache service (`src/App.tsx`, `src/pages/admin/AnalyticsPage.tsx`).
- External distributed cache (Redis/Memcached): Not detected.

## Authentication & Identity

**Auth Provider:**
- Supabase Auth - Email/password and OAuth sessions for admin access.
  - Implementation: centralized auth state and role checks in `src/components/admin/AdminAuthProvider.tsx`.
  - Token storage: `localStorage` configured explicitly in Supabase client options (`src/integrations/supabase/client.ts`).
  - Session management: `persistSession` and `autoRefreshToken` enabled (`src/integrations/supabase/client.ts`).

**Authorization model:**
- Role/permission logic implemented in Postgres functions and RLS (`public.is_admin`, `public.has_role`, `public.has_permission`) across migrations such as:
  - `supabase/migrations/20250807151913_ad0cb737-7c3e-40fe-b005-645fd701fc25.sql`
  - `supabase/migrations/20260215120000_p0_p1_admin_panel_improvements.sql`

## Monitoring & Observability

**Error Tracking:**
- Dedicated third-party error tracking service (Sentry/Bugsnag/etc.): Not detected.
- Current pattern: console logging + user-facing toasts (`src/components/admin/AdminAuthProvider.tsx`, `src/components/admin/AdminOAuthCallback.tsx`).

**Logs:**
- Application-level audit records in database table `public.admin_audit_log` (created in `supabase/migrations/20260215120000_p0_p1_admin_panel_improvements.sql`).
- Logging helper in UI: `src/lib/admin-audit.ts` inserts audit entries into Supabase.

## CI/CD & Deployment

**Hosting:**
- Vercel static hosting configuration (`vercel.json`).
  - Deployment artifact: `dist` directory from `vite build`.
  - SPA fallback routing configured via catch-all route in `vercel.json`.

**CI Pipeline:**
- CI workflow definitions (e.g., GitHub Actions, CircleCI): Not detected in repository (no `.github/workflows/*` present).

## Environment Configuration

**Required env vars:**
- `VITE_SUPABASE_URL` - Supabase project URL for client initialization.
- `VITE_SUPABASE_ANON_KEY` - Supabase public anon key for browser client.
- `VITE_CONSUMER_URL` - Base URL for generating consumer-facing links.
- Optional: `VITE_DEV_HOST`, `VITE_DEV_PORT` for local Vite server binding.
- Operational scripts: `SUPABASE_DB_URL`, optional `MIGRATION_REPO_NAME` for migration registry tooling (`scripts/migration-*.sh`).

**Secrets location:**
- Local development: `.env`/`.env.local` files (present in repo root; values must remain uncommitted/sensitive).
- Production: deployment platform env settings (implied by Vercel + Supabase usage; exact secret manager config not represented in repo files).

## Webhooks & Callbacks

**Incoming:**
- OAuth callback route handled in SPA: `/admin/callback` via `src/components/admin/AdminOAuthCallback.tsx`.
- Public webhook HTTP endpoints implemented inside this repository: Not detected (frontend-only codebase, no server route handlers).

**Outgoing:**
- Schema includes webhook infrastructure (`webhook_configurations`, `webhook_deliveries`) and `dispatch_webhook` DB function in generated types:
  - `src/integrations/supabase/types.ts`
  - RLS policy setup in `supabase/migrations/20260215120000_p0_p1_admin_panel_improvements.sql`
- Concrete webhook dispatcher implementation code is not present in this repository; likely executed via DB function/triggers or another service/repo.

---

*Integration audit: 2026-03-03*
