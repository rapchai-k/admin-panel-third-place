# Codebase Structure

**Analysis Date:** 2026-03-03

## Directory Layout

```text
place-command-center/
├── src/                   # Application source (routes, components, integrations, utilities)
├── supabase/              # Supabase local config and SQL migrations
├── public/                # Static assets and hosting metadata
├── docs/                  # Implementation plans and project documents
├── scripts/               # Migration helper scripts
├── .planning/codebase/    # Generated codebase mapping docs
├── package.json           # Dependency + npm scripts manifest
├── vite.config.ts         # Build/dev server and path alias config
└── tailwind.config.ts     # Tailwind theme + token configuration
```

## Directory Purposes

**src/:**
- Purpose: Primary application code for the admin panel SPA.
- Contains: React pages/components, contexts, hooks, integrations, utilities, styles.
- Key files: `src/main.tsx`, `src/App.tsx`, `src/pages/admin/AdminDashboard.tsx`, `src/components/admin/AdminLayout.tsx`.

**src/pages/admin/:**
- Purpose: Route-level admin screens mapped in `src/App.tsx`.
- Contains: Page containers for dashboard, events, users, moderation, analytics, settings, etc.
- Key files: `src/pages/admin/UsersPage.tsx`, `src/pages/admin/EventsPage.tsx`, `src/pages/admin/SystemSettingsPage.tsx`.

**src/components/admin/:**
- Purpose: Admin-specific reusable UI/workflow modules.
- Contains: Route guards, layout shell, login/callback, data table, and CRUD/detail modals.
- Key files: `src/components/admin/AdminAuthProvider.tsx`, `src/components/admin/ProtectedAdminRoute.tsx`, `src/components/admin/DataTable.tsx`, `src/components/admin/EventModal.tsx`.

**src/components/ui/:**
- Purpose: Shared primitive component system (Shadcn/Radix wrappers).
- Contains: Buttons, dialogs, inputs, table primitives, toast system, upload widgets.
- Key files: `src/components/ui/button.tsx`, `src/components/ui/dialog.tsx`, `src/components/ui/file-upload.tsx`, `src/components/ui/multi-file-upload.tsx`.

**src/integrations/supabase/:**
- Purpose: Centralized Supabase integration boundary.
- Contains: Typed client bootstrap and generated DB type definitions.
- Key files: `src/integrations/supabase/client.ts`, `src/integrations/supabase/types.ts`.

**src/lib/:**
- Purpose: Domain and utility logic reused across pages/components.
- Contains: Audit helpers, recurrence generation, short URL/slug helpers, gallery media sync, formatting utilities.
- Key files: `src/lib/admin-audit.ts`, `src/lib/admin-events.ts`, `src/lib/recurrence.ts`, `src/lib/gallery-media.ts`.

**src/context/ and src/hooks/:**
- Purpose: Lightweight global state and shared hooks.
- Contains: Currency context and toast/mobile hooks.
- Key files: `src/context/CurrencyProvider.tsx`, `src/hooks/use-toast.ts`, `src/hooks/use-mobile.tsx`.

**supabase/migrations/:**
- Purpose: Database schema/policy/function evolution scripts.
- Contains: Timestamped SQL files for admin improvements, storage/audit policies, recurring events, settings.
- Key files: `supabase/migrations/20260215120000_p0_p1_admin_panel_improvements.sql`, `supabase/migrations/20260215130000_p2_storage_and_audit.sql`, `supabase/migrations/20260302110000_add_gallery_media_admin_policies.sql`.

**public/:**
- Purpose: Static assets served directly by Vite/hosting.
- Contains: Icons, manifest, robots, redirects, OG image, favicon variants.
- Key files: `public/manifest.json`, `public/robots.txt`, `public/favicon.ico`, `public/_redirects`.

## Key File Locations

**Entry Points:**
- `src/main.tsx`: React app mount.
- `src/App.tsx`: Provider composition and full route table.

**Configuration:**
- `package.json`: Scripts and dependency graph.
- `vite.config.ts`: Dev server + alias resolution (`@ -> ./src`).
- `tsconfig.json`: strict TypeScript baseline and project references.
- `tsconfig.app.json`: app compiler options and include scope.
- `eslint.config.js`: linting defaults and React/TS rules.
- `tailwind.config.ts`: theme tokens, content scan paths, plugin registration.
- `supabase/config.toml`: Supabase project linkage.

**Core Logic:**
- `src/components/admin/AdminAuthProvider.tsx`: auth/session/admin role logic.
- `src/components/admin/ProtectedAdminRoute.tsx`: access control gate.
- `src/pages/admin/*.tsx`: route-level data loading and actions.
- `src/lib/admin-audit.ts`: audit persistence helper.
- `src/lib/gallery-media.ts`: gallery storage + table sync.

**Testing:**
- Not detected: no `*.test.*`/`*.spec.*` files and no Vitest/Jest config files in the current tree.

## Naming Conventions

**Files:**
- React components/pages/providers use PascalCase filenames: `AdminLayout.tsx`, `UsersPage.tsx`, `CurrencyProvider.tsx`.
- Utility and helper modules use kebab-case filenames: `admin-audit.ts`, `gallery-media.ts`, `short-url.ts`.
- Integration type/client files follow lowercase generic naming: `client.ts`, `types.ts`.
- Migration files use timestamped snake_case: `20260216120000_add_event_short_code.sql`.

**Directories:**
- Feature groupings are lowercase by concern: `src/pages/admin`, `src/components/admin`, `src/integrations/supabase`, `src/lib`.
- Reusable primitives are consolidated under `src/components/ui`.

## Where to Add New Code

**New Feature:**
- Primary code: add route page in `src/pages/admin/` and register route in `src/App.tsx`.
- Supporting UI: add/extend feature components in `src/components/admin/`.
- Data access: use `supabase` from `src/integrations/supabase/client.ts`; add shared domain logic in `src/lib/`.

**New Component/Module:**
- Admin-specific component: `src/components/admin/`.
- App-wide primitive: `src/components/ui/` (match existing shadcn-style pattern).

**Utilities:**
- Shared helpers and domain logic: `src/lib/`.
- Global cross-page state/hook utilities: `src/context/` and `src/hooks/`.

## Special Directories

**.planning/codebase/:**
- Purpose: Generated architecture/stack/quality mapping documents for GSD workflows.
- Generated: Yes.
- Committed: Yes (intended for planning context sharing).

**supabase/migrations/:**
- Purpose: Source-of-truth SQL migration history for DB schema/policies/functions.
- Generated: No (authored migration files).
- Committed: Yes.

**dist/:**
- Purpose: Build output from `vite build`.
- Generated: Yes.
- Committed: Not applicable to source architecture; treat as ephemeral build artifact.

**supabase/.temp/:**
- Purpose: Supabase local development temporary runtime files.
- Generated: Yes.
- Committed: No (local environment state).

---

*Structure analysis: 2026-03-03*
