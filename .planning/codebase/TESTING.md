# Testing Patterns

**Analysis Date:** 2026-03-03

## Test Framework

**Runner:**
- No automated unit/integration/E2E test runner is configured in `package.json`.
- No `vitest.config.*`, `jest.config.*`, Playwright, or Cypress config files are present.

**Assertion Library:**
- No assertion library is configured because automated test files are not part of the current codebase.

**Run Commands:**
```bash
npm run lint         # Static quality check via ESLint
npm run build        # Type + bundling validation via Vite
npm run dev          # Manual local verification in browser
```

## Test File Organization

**Location:**
- No `*.test.*` / `*.spec.*` test source files were found in `src/` or a dedicated `tests/` tree.
- `public/favicon-test.html` exists but is not part of an automated test framework.

**Naming:**
- No standardized automated test filename convention is currently in use.

**Structure:**
```text
No automated test directory structure exists yet.
Quality checks are currently:
- lint/build commands
- manual UI verification
- SQL migration verification scripts under scripts/
```

## Test Structure

**Suite Organization:**
- No `describe/it/test` suite patterns currently exist in the repository.

**Patterns:**
- Verification is mostly manual and scenario-driven in admin UI flows.
- Supabase migration checks are scripted with shell + SQL queries (`scripts/migration-verify.sh`).

## Mocking

**Framework:**
- No mocking framework is currently configured.

**Patterns:**
- There are no mock modules/spies/stubs in the current codebase.
- Data validation today relies on live Supabase interactions in development.

**What to Mock (when adding tests):**
- Supabase client calls (`from`, `rpc`, `auth`) in page-level loaders/mutations.
- Browser side-effects (`localStorage`, `matchMedia`) used by auth and hooks.

**What NOT to Mock (when adding tests):**
- Pure utility logic in `src/lib/` (for example recurrence and slug/short-code helpers).
- Simple presentational rendering logic that can be asserted directly.

## Fixtures and Factories

**Test Data:**
- No shared fixture/factory library currently exists.
- Existing typed shapes in `src/integrations/supabase/types.ts` can seed future fixtures.

**Location:**
- No current fixture directory (`tests/fixtures` or similar) is present.

## Coverage

**Requirements:**
- No line/branch/function coverage target is defined.
- No CI coverage gate exists in this repository.

**Configuration:**
- No coverage tooling is configured.

**View Coverage:**
```bash
No coverage command is currently available.
```

## Test Types

**Unit Tests:**
- Not implemented yet.
- Best initial candidates: `src/lib/recurrence.ts`, `src/lib/short-url.ts`, `src/lib/currency.ts`.

**Integration Tests:**
- Not implemented yet.
- Existing migration scripts provide a DB-integrity validation layer for schema drift.

**E2E Tests:**
- Not implemented yet.
- Manual end-to-end verification is implied through `npm run dev` + local Supabase workflow in `SUPABASE_LOCAL_DEV.md`.

## Common Patterns

**Current Quality Patterns (non-automated):**
- Strict TypeScript settings (`strict`, `noImplicitAny`, `noUnusedLocals`, `noUnusedParameters`) act as compile-time checks.
- ESLint catches hook/rules and TypeScript issues.
- Migration quality is checked via:
  - `scripts/migration-register.sh`
  - `scripts/migration-status.sh`
  - `scripts/migration-verify.sh`

**Async/Error Verification Style (manual):**
- Most async paths use `try/catch/finally`, console logging, and toast feedback.
- Manual QA should validate both success and destructive-toast failure paths in admin pages.

**Snapshot Testing:**
- Not used.

---

*Testing analysis: 2026-03-03*
*Update when test patterns change*
