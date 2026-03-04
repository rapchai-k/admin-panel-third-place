# Architecture

**Analysis Date:** 2026-03-03

## Pattern Overview

**Overall:** Feature-oriented React SPA with route-driven admin modules and direct Supabase data access.

**Key Characteristics:**
- Client-rendered application bootstrapped by Vite and mounted in `src/main.tsx`.
- Route-centric composition in `src/App.tsx` with nested protected admin routes.
- Data fetching and mutations live in pages/modals via `supabase-js`, with no dedicated service/repository layer.

## Layers

**Application Bootstrap Layer:**
- Purpose: Initialize rendering, global providers, and route tree.
- Location: `src/main.tsx`, `src/App.tsx`
- Contains: React root mount, provider composition, router definitions.
- Depends on: React, React Router, React Query, theme/auth/context providers.
- Used by: All UI modules.

**Routing and Access Control Layer:**
- Purpose: Enforce admin-only access and route orchestration.
- Location: `src/App.tsx`, `src/components/admin/ProtectedAdminRoute.tsx`, `src/components/admin/AdminAuthProvider.tsx`, `src/components/admin/AdminOAuthCallback.tsx`
- Contains: Route guards, auth session tracking, admin role checks (`rpc('is_admin')`), OAuth callback handling.
- Depends on: Supabase auth APIs, React Router navigation.
- Used by: All `/admin/*` pages and login/callback flows.

**Feature Presentation Layer (Admin Domain):**
- Purpose: Render domain pages and execute admin workflows.
- Location: `src/pages/admin/*.tsx`, `src/components/admin/*.tsx`
- Contains: Dashboard, users/events/communities/payments/discussions/moderation/system settings pages, modal-based CRUD flows, table views.
- Depends on: Shared UI primitives, Supabase client, context/hooks, lib utilities.
- Used by: Admin operators through `/admin/*` routes.

**Shared UI and Interaction Layer:**
- Purpose: Provide reusable visual and form primitives.
- Location: `src/components/ui/*.tsx`, `src/components/common/ErrorBoundary.tsx`
- Contains: Shadcn/Radix wrappers, toasts, dialog primitives, upload components, error boundary.
- Depends on: Radix, Tailwind, utility helpers.
- Used by: All admin pages/components.

**Domain Utilities and Support Layer:**
- Purpose: Encapsulate reusable domain logic and helpers.
- Location: `src/lib/*.ts`, `src/context/CurrencyProvider.tsx`, `src/hooks/*.ts*`
- Contains: Audit taxonomy (`admin-events.ts`), audit emitter (`admin-audit.ts`), recurrence/date logic (`recurrence.ts`), short URLs/slugs (`short-url.ts`), gallery sync (`gallery-media.ts`), currency formatting, toast/mobile helpers.
- Depends on: Supabase client (for audit/gallery), browser APIs, utility packages.
- Used by: Feature pages/modals and providers.

**Data Integration and Schema Layer:**
- Purpose: Centralize Supabase client creation and typed DB contracts.
- Location: `src/integrations/supabase/client.ts`, `src/integrations/supabase/types.ts`, `supabase/migrations/*.sql`
- Contains: Env validation, typed client initialization, generated table/RPC typings, SQL schema evolution and policy/RPC definitions.
- Depends on: Vite env (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`), Supabase platform.
- Used by: All data access paths in frontend features.

## Data Flow

**Admin Authentication and Route Gating:**

1. App boots providers in `src/App.tsx`, including `AdminAuthProvider`.
2. `AdminAuthProvider` subscribes to `supabase.auth.onAuthStateChange` and loads existing session.
3. On signed-in session, provider checks role with `supabase.rpc('is_admin', { _user_id })`.
4. `ProtectedAdminRoute` reads `useAdminAuth()` and either renders protected children or redirects to `/admin/login`.
5. OAuth path `/admin/callback` exchanges code/hash token for session in `src/components/admin/AdminOAuthCallback.tsx` and navigates to dashboard.

**Admin CRUD Page Load + Modal Mutation:**

1. Admin page mounts (example `src/pages/admin/UsersPage.tsx`) and triggers `load*` via `useEffect`.
2. Page reads from tables/RPCs using `supabase.from(...).select(...)` or `supabase.rpc(...)`.
3. Data is mapped into local typed view models and rendered via `DataTable` or cards/modals.
4. Mutation modal (example `src/components/admin/UserModal.tsx`) validates with Zod + React Hook Form.
5. Submit performs `insert/update/delete` calls, then triggers toast feedback and parent refresh callback.

**Media + Audit Side Effects:**

1. File input components upload to Supabase Storage (`src/components/ui/file-upload.tsx`, `src/lib/gallery-media.ts`).
2. URL/path output is persisted in relational tables (`users`, `gallery_media`, etc.).
3. Admin actions emit audit inserts with `logAdminAction` from `src/lib/admin-audit.ts`.
4. Audit failures log to console and do not block UI flow.

**State Management:**
- Server interactions are mostly component-local (`useEffect` + `useState`) with imperative Supabase calls.
- React Query is configured in `src/App.tsx` (`QueryClientProvider`) for global query defaults, but primary fetching patterns currently use direct Supabase calls.
- Cross-page app state is thin and context-based (`AdminAuthProvider`, `CurrencyProvider`).

## Key Abstractions

**Route Shell + Provider Composition:**
- Purpose: Keep global concerns centralized before feature rendering.
- Examples: `src/App.tsx`, `src/main.tsx`
- Pattern: Composition root with nested providers and nested routes.

**Admin Auth Context:**
- Purpose: Single source of truth for session/admin entitlement and sign-in/out actions.
- Examples: `src/components/admin/AdminAuthProvider.tsx`, `src/components/admin/ProtectedAdminRoute.tsx`
- Pattern: React Context + hook + route guard.

**Generic Table Abstraction:**
- Purpose: Reuse listing mechanics across domain pages.
- Examples: `src/components/admin/DataTable.tsx`, usage in `src/pages/admin/UsersPage.tsx`, `src/pages/admin/EventsPage.tsx`
- Pattern: Generic typed component (`DataTable<T>`) with column config/render callbacks.

**Form Modal Abstraction:**
- Purpose: Standardize create/edit interactions in dialogs.
- Examples: `src/components/admin/UserModal.tsx`, `src/components/admin/EventModal.tsx`, `src/components/admin/CommunityModal.tsx`
- Pattern: React Hook Form + Zod schema + dialog container + async submit.

**Audit Event Taxonomy:**
- Purpose: Enforce consistent action/target labels and fire-and-forget audit persistence.
- Examples: `src/lib/admin-events.ts`, `src/lib/admin-audit.ts`
- Pattern: Constant enums + typed payload contract + non-blocking persistence helper.

## Entry Points

**Browser App Mount:**
- Location: `src/main.tsx`
- Triggers: Browser loading `index.html`.
- Responsibilities: Create React root, attach `App`, import global CSS.

**Route and Provider Root:**
- Location: `src/App.tsx`
- Triggers: React root render.
- Responsibilities: Build provider stack, define public/admin/catch-all routes, enforce protected route boundaries.

**Auth Callback Handler:**
- Location: `src/components/admin/AdminOAuthCallback.tsx`
- Triggers: OAuth redirect to `/admin/callback`.
- Responsibilities: Exchange auth code/hash to session, sanitize URL, redirect to login/dashboard.

**Supabase Client Initialization:**
- Location: `src/integrations/supabase/client.ts`
- Triggers: First module import by any feature using Supabase.
- Responsibilities: Validate env vars/URL format, create typed client with persistent auth config.

**Database Evolution:**
- Location: `supabase/migrations/*.sql`
- Triggers: Supabase migration apply workflow.
- Responsibilities: Define schema, policies, RPCs, and admin-related capabilities consumed by frontend.

## Error Handling

**Strategy:** Localized `try/catch` with user-facing toast notifications and non-blocking diagnostics.

**Patterns:**
- Feature-level async handlers catch failures, log details (`console.error`), and show destructive toast (`useToast`).
- Global render faults are captured by `ErrorBoundary` in `src/components/common/ErrorBoundary.tsx`.
- Supabase env misconfiguration fails fast at startup in `src/integrations/supabase/client.ts`.

## Cross-Cutting Concerns

**Logging:** Console logging for runtime failures plus persisted audit events in `admin_audit_log` via `src/lib/admin-audit.ts`.
**Validation:** Zod schemas + React Hook Form in modal workflows (for example `src/components/admin/UserModal.tsx`, `src/components/admin/EventModal.tsx`).
**Authentication:** Supabase Auth sessions + role check RPC (`is_admin`) + route-level guard (`ProtectedAdminRoute`).

---

*Architecture analysis: 2026-03-03*
