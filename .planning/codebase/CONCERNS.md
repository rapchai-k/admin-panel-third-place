# CONCERNS

## Scope
- Focus: technical debt, known issues, bugs, security, performance, and fragile areas.
- Snapshot date: 2026-03-03.
- Sources reviewed: React admin pages/components, Supabase client/types, migrations, and migration scripts.

## Severity Legend
- `P0`: High risk (security/data exposure/correctness impact)
- `P1`: Medium risk (frequent bugs, major maintenance drag)
- `P2`: Lower risk (quality debt, latent issues)

## P0 Concerns

### 1) Sensitive email RPCs are callable by any authenticated user
- Evidence:
  - `supabase/migrations/20250113120000_add_get_user_email_function.sql` grants execute on `get_user_email(UUID)` to `authenticated`.
  - `supabase/migrations/20260215120000_p0_p1_admin_panel_improvements.sql` grants execute on `get_user_emails(UUID[])` to `authenticated`.
  - `supabase/migrations/20260215120000_p0_p1_admin_panel_improvements.sql` defines `get_users_with_counts()` as `SECURITY DEFINER` and returns `auth.users.email`, then grants to `authenticated`.
- Why this matters:
  - Any logged-in non-admin can potentially enumerate emails and user metadata via RPC, bypassing intended admin-only boundaries.
- Risk type: Security and privacy exposure.

### 2) CSV export is vulnerable to spreadsheet formula injection
- Evidence:
  - `src/pages/admin/PaymentsPage.tsx` and `src/pages/admin/RegistrationsPage.tsx` escape quotes/newlines but do not neutralize cells starting with `=`, `+`, `-`, `@`.
- Why this matters:
  - Opening exported CSV in Excel/Sheets can execute attacker-controlled formulas embedded in user fields (name/email/event title).
- Risk type: Client-side data exfiltration/social engineering via exported artifacts.

## P1 Concerns

### 3) High-latency N+1 pattern still present in registrations flows
- Evidence:
  - `src/pages/admin/RegistrationsPage.tsx`: per-row `supabase.rpc('get_user_email', { _user_id })` inside `Promise.all` map.
  - `src/components/admin/EventRegistrationsModal.tsx`: same per-registration email RPC pattern.
- Why this matters:
  - Large events/registration tables will scale poorly and increase page load times and Supabase request volume.

### 4) Analytics page performs large unbounded client-side aggregation
- Evidence:
  - `src/pages/admin/AnalyticsPage.tsx` fetches full datasets for `users(created_at)`, `event_registrations(created_at)`, `payment_sessions(...)`, and then aggregates client-side.
  - No date bounds or pagination for key datasets before computing charts.
- Why this matters:
  - Memory/CPU load grows with production data volume; dashboard will degrade over time and can become unusable.

### 5) Query errors are not consistently handled in analytics
- Evidence:
  - `src/pages/admin/AnalyticsPage.tsx` does multiple Supabase calls but generally proceeds with `data || []` and does not check each `error`.
- Why this matters:
  - Silent partial-failure behavior can present misleading metrics without surfacing a hard failure.

### 6) Broken filter semantics in user table
- Evidence:
  - `src/pages/admin/UsersPage.tsx` defines status filter options `{ value: 'active'|'banned' }` while `DataTable` compares against `is_banned` boolean stringified (`"true"|"false"`).
- Why this matters:
  - Filter UI does not match actual row values; admins can make incorrect assumptions from filtered results.

### 7) Potential runtime crashes from unsafe name splitting
- Evidence:
  - `src/pages/admin/RegistrationsPage.tsx` uses `row.user.name.split(' ')` without null-safe fallback.
  - `src/components/admin/EventRegistrationsModal.tsx` uses `registration.user.name.split(' ')` similarly.
- Why this matters:
  - Null/empty or malformed names can crash row rendering in core admin workflows.

### 8) Invalid Select item value likely to break selection UX
- Evidence:
  - `src/components/admin/PermissionModal.tsx` uses `<SelectItem value="">All ...</SelectItem>`.
- Why this matters:
  - Radix Select patterns generally expect non-empty values; empty sentinel can create inconsistent behavior or runtime warnings.

### 9) Partial-write risk in event create/update flow (non-transactional)
- Evidence:
  - `src/components/admin/EventModal.tsx` executes multi-step writes (parent event, children, media sync, short-code update, optional series updates) as separate calls.
  - Some updates are not checked for returned errors (for example, short-code update and series propagation updates).
- Why this matters:
  - Failures can leave inconsistent state (event created without short code, series partially updated, media out-of-sync).

### 10) Debug logging of raw registration data in production code
- Evidence:
  - `src/components/admin/EventRegistrationsModal.tsx` logs raw registration payloads and payment/session details.
- Why this matters:
  - PII and payment-adjacent metadata can leak into browser/dev tooling logs and monitoring captures.

## P2 Concerns (Debt/Fragility)

### 11) Very large, multi-responsibility UI modules
- Evidence:
  - `src/components/admin/EventModal.tsx` ~1016 lines.
  - `src/pages/admin/AnalyticsPage.tsx` ~867 lines.
  - Multiple other admin pages/components in the 300-600 line range.
- Why this matters:
  - High cognitive load, difficult review/testing, and elevated regression risk for routine changes.

### 12) Inconsistent role model across app and migrations
- Evidence:
  - App reads both legacy `users.role` and newer `user_roles`/`is_admin` model.
  - Migration comments and backfills indicate active role-unification work.
- Why this matters:
  - Authorization logic drift can create subtle privilege bugs and operational confusion.

### 13) Migration history remains intentionally unresolved
- Evidence:
  - `supabase/migrations/20260215150000_create_migration_registry.sql` seeds 11 admin migrations as `pending_review` and "local only, never applied".
  - Near-duplicate early role-system migrations exist (`20250807151652...` and `20250807151913...`).
- Why this matters:
  - Ongoing schema drift risk across environments; onboarding and incident response are harder.

### 14) Migration scripts build SQL using unescaped shell interpolation
- Evidence:
  - `scripts/migration-register.sh` interpolates `VERSION`, `NAME`, `DESCRIPTION`, `APPLIED_BY` directly into SQL text.
- Why this matters:
  - Operational tooling is fragile to quoting characters and can fail or be abused when inputs are not controlled.

### 15) Test coverage appears absent
- Evidence:
  - No `*.test.*`/`*.spec.*` files discovered in the repository.
- Why this matters:
  - High-risk admin/auth/payment code paths have no automated regression safety net.

### 16) Lint warnings indicate hook dependency and effect correctness debt
- Evidence:
  - `npm run lint` reports 31 warnings, many `react-hooks/exhaustive-deps` and refresh-boundary warnings.
- Why this matters:
  - Hook dependency drift can produce stale closures, subtle state bugs, and nondeterministic behavior.

### 17) System settings page is mostly stubbed, not persisted
- Evidence:
  - `src/pages/admin/SystemSettingsPage.tsx` uses local component state defaults and toast-only save/reset behavior (no backend persistence).
- Why this matters:
  - Creates false confidence that settings changes are durable or enforceable.

## Most Fragile Areas
- Admin auth and role gating chain:
  - `src/components/admin/AdminAuthProvider.tsx`
  - `src/components/admin/ProtectedAdminRoute.tsx`
  - Supabase role RPCs and policies in migrations.
- Payment/registration data aggregation and exports:
  - `src/pages/admin/PaymentsPage.tsx`
  - `src/pages/admin/RegistrationsPage.tsx`
  - `src/components/admin/EventRegistrationsModal.tsx`
- Recurring event creation/update + gallery sync:
  - `src/components/admin/EventModal.tsx`
  - `src/lib/gallery-media.ts`
- Migration coordination and schema trust boundary:
  - `supabase/migrations/20260215150000_create_migration_registry.sql`
  - `scripts/migration-verify.sh`, `scripts/migration-register.sh`, `scripts/migration-status.sh`

## Recommended Priority Order
1. Lock down email-related RPCs (`get_user_email`, `get_user_emails`, `get_users_with_counts`) to admin-only checks and grants.
2. Fix CSV formula injection hardening for all exports.
3. Replace remaining N+1 email fetches with batched RPC and add query bounds/pagination to analytics.
4. Add error checking/transaction-like server RPC for multi-step event writes.
5. Resolve broken filters/null-safety issues in registrations/users tables.
6. Reduce migration ambiguity by resolving `pending_review` entries and documenting canonical migration path.
7. Add baseline tests for auth gating, payments/registrations list behavior, and recurring event workflows.
