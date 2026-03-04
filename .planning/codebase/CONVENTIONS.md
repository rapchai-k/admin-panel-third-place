# Coding Conventions

**Analysis Date:** 2026-03-03

## Naming Patterns

**Files:**
- React page/component files use `PascalCase.tsx` (for example: `src/pages/admin/UsersPage.tsx`, `src/components/admin/UserModal.tsx`).
- Utility and hook files mostly use kebab-case (for example: `src/lib/admin-events.ts`, `src/hooks/use-mobile.tsx`).
- SQL migrations follow `timestamp_snake_case.sql` (for example: `supabase/migrations/20260215120000_p0_p1_admin_panel_improvements.sql`).

**Functions:**
- Functions and handlers use `camelCase` (`loadUsers`, `handleSave`, `onSubmit`).
- Event handlers favor `handle*` naming in UI files (`handleCreate`, `handleExport`, `handleCancel`).
- Async functions do not use a prefix like `fetch*`; they are named by behavior.

**Variables:**
- Local/state variables use `camelCase`.
- Constants use `UPPER_SNAKE_CASE` (`TOAST_LIMIT`, `DAY_LABELS`, `MAX_INSTANCES`).
- Boolean state commonly uses `is*`/`has*` prefixes (`isLoading`, `isRecurring`, `hasError`).

**Types:**
- Interfaces and type aliases use `PascalCase` without `I` prefix (`User`, `EventFormData`, `AuditEntry`).
- Supabase row helper types append semantic suffixes (`UserWithCountsRow`, `GalleryMediaRow`).
- Literal unions are preferred over enums for many domains (`type RecurrencePattern = 'daily' | ...`).

## Code Style

**Formatting:**
- No Prettier config is present; style appears editor/formatter-driven.
- 2-space indentation and semicolons are common.
- Quotes are mixed (`'` and `"`) across files; no enforced single quote style.
- Trailing commas are used in multiline objects/arrays in many files.

**Linting:**
- ESLint is configured in `eslint.config.js` with `@eslint/js` + `typescript-eslint` recommended presets.
- React Hooks and React Refresh plugins are enabled.
- `@typescript-eslint/no-unused-vars` is explicitly disabled.
- Standard command: `npm run lint`.

## Import Organization

**Order:**
1. External packages (`react`, `lucide-react`, `@supabase/supabase-js`).
2. Internal alias imports (`@/components/...`, `@/lib/...`).
3. Relative imports (`./EventCreatedModal`).

**Grouping:**
- Most files keep grouped imports with occasional blank lines between logical blocks.
- Sorting is not strict/alphabetical everywhere.

**Path Aliases:**
- `@/*` maps to `src/*` via `tsconfig.json`.

## Error Handling

**Patterns:**
- Async UI loaders/mutations use `try/catch/finally` with loading state toggles.
- Supabase errors are checked (`if (error) throw error`) then handled in `catch`.
- Recoverable UI failures usually produce destructive toast notifications.
- Some operations intentionally never throw (for example `logAdminAction` is fire-and-forget).

**Error Types:**
- Most catches treat error as `unknown` and log directly.
- Fail-fast startup validation is used for required env vars in `src/integrations/supabase/client.ts`.
- Hook misuse throws explicit runtime errors (`useAdminAuth must be used within...`).

## Logging

**Framework:**
- Logging uses browser console APIs only (`console.error`, `console.warn`).
- No centralized logger abstraction or log level routing found.

**Patterns:**
- Errors are logged near catch boundaries with context strings.
- Audit/business events are persisted via DB (`admin_audit_log`) rather than app logger.

## Comments

**When to Comment:**
- Comments are used for intent/constraints and migration rationale (not just mechanics).
- Utility files in `src/lib/` often contain detailed JSDoc-style block comments.
- JSX includes section comments for layout readability.

**JSDoc/TSDoc:**
- Present in selected utility modules (`src/lib/short-url.ts`, `src/lib/recurrence.ts`, `src/lib/admin-audit.ts`).
- Not consistently applied across page/component files.

**TODO Comments:**
- Formal `TODO(...)` tagging is uncommon.
- Placeholder behavior is often expressed through user-facing copy ("Feature coming soon!").

## Function Design

**Size:**
- Page components are often large and combine data loading, view config, and handlers in one file.
- Complex reusable logic is extracted in selected libs (`src/lib/recurrence.ts`, `src/lib/gallery-media.ts`).

**Parameters:**
- Form handlers and service helpers usually accept structured objects rather than long parameter lists.
- Local helper functions (`safeString`, `getInitials`) are repeated across multiple pages/components.

**Return Values:**
- Guard clauses and early returns are used in auth, modal, and utility flows.
- Async UI actions generally return `void` and communicate result through state/toast side effects.

## Module Design

**Exports:**
- Default exports are common for page components.
- Named exports are common for reusable components, hooks, and utilities.

**Barrel Files:**
- Broad barrel export pattern is not prominent in feature code.
- Modules are mostly imported directly from concrete file paths.

---

*Convention analysis: 2026-03-03*
*Update when patterns change*
