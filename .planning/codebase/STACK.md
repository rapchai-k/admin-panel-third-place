# Technology Stack

**Analysis Date:** 2026-03-03

## Languages

**Primary:**
- TypeScript 5.8.3 - All application code and app configuration in `src/**`, `vite.config.ts`, `tailwind.config.ts`, `tsconfig*.json` (`package.json`, `src/main.tsx`, `src/App.tsx`).
- SQL (PostgreSQL dialect) - Database schema, policies, functions, and migration history in `supabase/migrations/*.sql`.

**Secondary:**
- JavaScript (ESM + CJS) - Tooling/config scripts in `eslint.config.js`, `postcss.config.js`, `scripts/generate-favicon.cjs`.
- Shell (bash) - Operational scripts for migration registry workflows in `scripts/migration-register.sh`, `scripts/migration-status.sh`, `scripts/migration-verify.sh`.
- CSS (Tailwind + custom tokens) - Design system and theming in `src/index.css`.

## Runtime

**Environment:**
- Node.js 18+ for local development and build tooling (`README.md` prerequisites, Vite/Tailwind/ESLint/TypeScript toolchain).
- Browser runtime (SPA) for the delivered admin panel (`index.html` loads `src/main.tsx`).

**Package Manager:**
- npm (lockfile workflow) via `npm run ...` scripts in `package.json`.
- Lockfile: `package-lock.json` present.

## Frameworks

**Core:**
- React 18.3.1 - UI framework for admin application (`package.json`, `src/App.tsx`).
- React Router DOM 6.30.1 - Route graph and protected admin routes (`src/App.tsx`).
- Supabase JS 2.53.1 - Backend access (DB, Auth, Storage, RPC) from client-side code (`src/integrations/supabase/client.ts` and many `src/pages/admin/*.tsx`).
- Tailwind CSS 3.4.17 + shadcn/ui conventions - Styling system and component baseline (`tailwind.config.ts`, `components.json`, `src/components/ui/**`).

**Testing:**
- Not detected. No `vitest`, `jest`, `playwright`, or test files (`rg --files` over repository and `package.json` scripts).

**Build/Dev:**
- Vite 5.4.19 - Dev server and production bundling (`package.json`, `vite.config.ts`).
- `@vitejs/plugin-react-swc` 3.11.0 - React transform pipeline (`vite.config.ts`, `package.json`).
- TypeScript compiler 5.8.3 - Type-checking configuration via `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`.
- ESLint 9.32.0 + typescript-eslint 8.38.0 - Static linting (`eslint.config.js`, `package.json`).

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` 2.53.1 - Primary integration surface for auth, data CRUD, RPC, and object storage (`src/integrations/supabase/client.ts`, `src/lib/gallery-media.ts`).
- `@tanstack/react-query` 5.83.0 - Async data orchestration and caching in UI workflows (`src/App.tsx`, `src/pages/admin/AnalyticsPage.tsx`).
- `react-router-dom` 6.30.1 - Navigation and route protection for admin experience (`src/App.tsx`, `src/components/admin/ProtectedAdminRoute.tsx`).
- `react-hook-form` 7.61.1 + `zod` 3.25.76 - Form handling and validation patterns in admin modals/forms (`package.json`, form-heavy components in `src/components/admin/**`).
- `recharts` 3.1.2 - Analytics visualization in admin dashboard (`src/pages/admin/AnalyticsPage.tsx`).

**Infrastructure:**
- Tailwind/PostCSS toolchain (`tailwindcss`, `autoprefixer`, `postcss`) for CSS generation (`tailwind.config.ts`, `postcss.config.js`).
- Radix UI primitives (`@radix-ui/*`) as component behavior foundation under `src/components/ui/**`.
- Vercel static build target for deployment (`vercel.json` routes/build config).

## Configuration

**Environment:**
- Environment-driven runtime config through `.env*` files (`.env.example` present; `.env` present).
- Required client vars for app startup: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (`src/integrations/supabase/client.ts`, `.env.example`).
- Optional dev server overrides: `VITE_DEV_HOST`, `VITE_DEV_PORT` (`vite.config.ts`, `.env.example`).
- Cross-app URL generation uses `VITE_CONSUMER_URL` (`src/lib/short-url.ts`, `.env.example`).
- Migration utility scripts require `SUPABASE_DB_URL` and optionally `MIGRATION_REPO_NAME` (`scripts/migration-*.sh`).

**Build:**
- Build and dev commands: `dev`, `build`, `build:dev`, `preview`, `lint` in `package.json`.
- Primary config files: `vite.config.ts`, `tsconfig*.json`, `tailwind.config.ts`, `postcss.config.js`, `eslint.config.js`, `vercel.json`, `components.json`.

## Platform Requirements

**Development:**
- Any OS that supports Node.js + npm (README indicates Node.js 18+).
- Supabase CLI workflow is expected for local DB/Auth/Storage emulation (`SUPABASE_LOCAL_DEV.md`).
- Local Supabase stack implies Docker-backed services (`supabase start` process in `SUPABASE_LOCAL_DEV.md`).

**Production:**
- Static frontend artifact (`dist/`) deployed via Vercel static build (`vercel.json`).
- Runtime dependencies are browser + Supabase hosted backend services referenced by environment variables.

---

*Stack analysis: 2026-03-03*
