# Hootsuite Social Posting — Agent Handoff

> **Branch:** `enhancement/hootsuite-automation`
> **Last commit:** `030413b` — pushed to origin
> **Tests:** 17/17 passing (`npx vitest run`)

---

## ✅ Completed

### Phase 1 — Database Schema
- **1.1 Migration created** — `supabase/migrations/20260305120000_social_posting_tables.sql` with 4 tables: `social_targets`, `post_jobs`, `media_assets`, `hootsuite_tokens`. Includes RLS (admin-only), indexes, `updated_at` trigger, idempotency constraint. Does NOT touch existing `gallery_media` / `galleries` bucket.
- **1.2 TypeScript types updated** — All 4 table types added to `src/integrations/supabase/types.ts`.
- ⚠️ **1.3 Migration NOT applied** — Requires `supabase db push` with remote DB password. Migration file is ready.

### Phase 2A — Hootsuite OAuth2 Connection
- **2A.1** `supabase/functions/hootsuite-oauth-callback/index.ts` — Exchanges auth code → stores tokens in DB, redirects admin back to Settings page.
- **2A.2** `src/lib/hootsuite-oauth.ts` — `buildHootsuiteAuthUrl()` constructs the authorize URL from env vars.
- **2A.3** SystemSettingsPage — "Social Media Integration" section with Connect/Disconnect buttons and connection status badge.
- **2A.4** OAuth redirect handling — Reads `hootsuite_connected` / `hootsuite_error` query params on mount, shows toast.
- **2A.5** `HootsuiteToken` type added to types file.

### Phase 2 — Edge Functions (Backend)
All 6 functions implemented in `supabase/functions/`:

| Function | Purpose |
|---|---|
| `social-post-publish` | Step 1: Registers media with Hootsuite, gets upload URLs, chains to upload |
| `social-media-upload` | Step 2: Streams bytes from Supabase storage → Hootsuite S3 URL |
| `social-post-schedule` | Step 3: Calls `POST /v1/messages` with text + media IDs |
| `social-post-retry` | Resets failed assets, resumes from correct step (max 3 attempts) |
| `hootsuite-profiles` | Proxies `GET /v1/socialProfiles` for admin channel discovery |
| `hootsuite-oauth-callback` | OAuth2 token exchange |

Shared helper: `supabase/functions/_shared/hootsuite.ts` — token read/refresh, Supabase admin client.

### Phase 3 — Admin Audit Constants
- `SOCIAL_POST_SCHEDULED`, `SOCIAL_POST_FAILED`, `SOCIAL_POST_RETRIED` added to `src/lib/admin-events.ts`.

### Phase 4 — Frontend Service Layer
- `src/lib/social-posting.types.ts` — `SocialTarget`, `PostJob`, `MediaAsset` interfaces.
- `src/lib/social-posting.ts` — `generatePostText`, `computeImmediateScheduleTime`, `computeIdempotencyKey`, `createPostJob`, `retryPostJob`, `fetchSocialTargets`, `fetchPostJobsForEvent`.

### Phase 5 — Event Modal UI
- `src/components/admin/EventModal.tsx` — "Publish to Social Channels" section with channel checkboxes, Immediately/Custom schedule radio, fire-and-forget `createPostJob` on submit.

### Phase 6 — Events List & Details
- `src/pages/admin/EventsPage.tsx` — Social Status column with clickable badges (`—`/`Pending`/`Scheduled`/`Failed`), `summarizeSocialStatus()` helper (exported for testing).
- `src/components/admin/PostJobDetailsModal.tsx` — Lists all post jobs for an event with status, error, retry button.
- `src/components/admin/EventDetailsModal.tsx` — "Social Posts" button opens `PostJobDetailsModal`.

### Phase 8 — Testing (partial)
- Vitest + jsdom installed and configured in `vite.config.ts`.
- `src/lib/social-posting.test.ts` — 17 unit tests covering `generatePostText`, `computeImmediateScheduleTime`, `computeIdempotencyKey`, `summarizeSocialStatus`.

---

## 🔲 Pending — Blocked on Hootsuite Developer Account (up to 5 days for approval)

### 1.3 — Apply Migration
- Run `supabase db push` to apply `20260305120000_social_posting_tables.sql`.
- May need to run `supabase migration repair --status applied <existing_ids>` first to sync local registry.
- **Requires:** Remote DB password.

### 2.8 — Set Supabase Secrets
```bash
supabase secrets set \
  HOOTSUITE_CLIENT_ID=<from_hootsuite_dev_portal> \
  HOOTSUITE_CLIENT_SECRET=<from_hootsuite_dev_portal> \
  HOOTSUITE_REDIRECT_URI=https://<project-ref>.supabase.co/functions/v1/hootsuite-oauth-callback
```
- **Requires:** Hootsuite Developer App credentials.

### 2.9 — Deploy Edge Functions
```bash
supabase functions deploy hootsuite-oauth-callback
supabase functions deploy social-post-publish
supabase functions deploy social-media-upload
supabase functions deploy social-post-schedule
supabase functions deploy social-post-retry
supabase functions deploy hootsuite-profiles
```
- **Requires:** Task 2.8 done first.

### Phase 7 — Seed Social Targets
- Insert rows into `social_targets` table with actual Hootsuite Social Profile IDs.
- Use the `hootsuite-profiles` Edge Function to discover available profile IDs.
- **Requires:** Hootsuite connected + profiles endpoint working.

### Phase 8 — E2E Testing (remaining)
- **8.1 Happy path** — Create event → verify post_jobs → Edge Function chain → post appears in Hootsuite.
- **8.2 Failure & retry** — Invalid token → Failed status → Retry button → resumes correctly.
- **8.3 Edge cases** — No-image post, duplicate prevention, large uploads, timeout recovery.
- **Requires:** Hootsuite sandbox/test account.

---

## Frontend Env Vars Needed
```
VITE_HOOTSUITE_CLIENT_ID=<client_id>
VITE_HOOTSUITE_REDIRECT_URI=https://<ref>.supabase.co/functions/v1/hootsuite-oauth-callback
```

## Key Files
| File | Role |
|---|---|
| `src/lib/social-posting.ts` | Service layer (post text, scheduling, DB ops) |
| `src/lib/social-posting.types.ts` | TypeScript interfaces |
| `src/lib/hootsuite-oauth.ts` | OAuth URL builder |
| `src/components/admin/EventModal.tsx` | Social posting UI in event creation |
| `src/components/admin/PostJobDetailsModal.tsx` | Job details & retry |
| `src/pages/admin/EventsPage.tsx` | Social status column |
| `src/pages/admin/SystemSettingsPage.tsx` | Hootsuite connect/disconnect |
| `supabase/functions/_shared/hootsuite.ts` | Shared token management |
| `src/lib/social-posting.test.ts` | Unit tests (17 passing) |

