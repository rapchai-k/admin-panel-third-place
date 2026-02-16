# MyThirdPlace Admin Panel — Architectural Review: Filtered Action Plan

> **Date:** 2026-02-15
> **Scope:** Actions scoped exclusively to admin-panel-triggered operations.
> Consumer-triggered operations are listed separately and excluded from the implementation plan.

---

## 1. Admin Panel Write Operations (Confirmed)

Every write path in the admin panel was traced through the source code:

| Component | Table(s) Written | Operation |
|---|---|---|
| `EventModal.tsx` | `events` | Create / Update |
| `EventDetailsModal.tsx` | `events` | Cancel (`is_cancelled`) |
| `CommunityModal.tsx` | `communities` | Create / Update |
| `DiscussionModal.tsx` | `discussions` | Create / Update |
| `UserModal.tsx` | `users` | Update (name, photo_url, role, is_banned, referral_code) |
| `UserRoleModal.tsx` | `user_roles` | Create / Update |
| `PermissionModal.tsx` | `user_permissions` | Create / Update |
| `ModerationPage.tsx` | `flags` | Update (resolve / dismiss / mark urgent) |
| `BulkOperationModal.tsx` | `bulk_operations` | Create / Update |
| `CommunityModal.tsx` | `storage.objects` | Upload to `community-images` bucket |
| `EventModal.tsx` | `storage.objects` | Upload to `event-images` bucket |
| `UserModal.tsx` | `storage.objects` | Upload to `user-avatars` bucket (**⚠️ RLS bug — see §4**) |
| `SystemSettingsPage.tsx` | *(none — client-side state only)* | No DB writes |

---

## 2. Consumer-Triggered Operations (FILTERED OUT)

These operations are initiated by end-users through the consumer panel, **not by admins**.
They were part of the original review but fall outside admin-panel scope.

### 2A. Full Recommendations Moved to Consumer Backlog

| Original # | Recommendation | Why It's Consumer-Triggered |
|---|---|---|
| 11 | FK constraints on `payment_sessions` | `payment_sessions` are created by consumers via Edge Functions, not the admin panel. The FK protects a consumer write path. |
| 15 (partial) | Storage upload restrictions on `user-avatars` | Users upload their own avatars via the consumer panel. The RLS policy (`auth.uid() == folder`) is a consumer-side guard. |

### 2B. Sub-Items Extracted from Valid Recommendations

These were embedded inside otherwise valid admin recommendations but target consumer behaviour:

| Parent Rec | Sub-Item | Why It's Consumer-Triggered |
|---|---|---|
| 1.1 (RLS) | `notification_preferences` RLS write restriction | Consumers update their own notification preferences |
| 1.1 (RLS) | `referrals` self-referral prevention | Consumers create referrals; admins don't |
| 1.1 (RLS) | `email_logs` insert restriction (service role only) | Edge Functions (welcome-email-trigger, send-email) insert logs for consumer emails |
| 1.3 (Payment) | `payment_sessions` idempotency key | Consumers initiate payments via Edge Functions |
| 1.3 (Payment) | `payment_sessions` IP address tracking | Consumer request metadata, not admin |
| N/A | `community_members` insert validation | Consumers join communities; admins don't insert membership rows |

### 2C. Shared Infrastructure (Admin Configures, Consumer Consumes)

| Original # | Recommendation | Admin Part | Consumer Part |
|---|---|---|---|
| 13 | Event taxonomy (`lib/events.ts`) | Define taxonomy; track admin actions | Consumer panel emits consumer events using same taxonomy |
| 19 | Multi-channel communication architecture | Campaign UI, channel configuration, template management | Edge Functions dispatch messages; consumers receive via email/SMS/WhatsApp |

> **Action:** The admin-side configuration parts of #13 and #19 are included in the plan below.
> The consumer-side delivery infrastructure should be handled in the consumer panel roadmap.

---

## 3. Validated Admin-Panel Recommendations

The following recommendations are confirmed to be triggered exclusively (or primarily) from the admin panel.

### 🔴 P0 — Critical (This Week)

| # | Action | Area | Effort | Code Path |
|---|---|---|---|---|
| 1 | **Unify role systems** (`users.role` → `user_roles`) | Security | Medium | `UserModal.tsx` writes `users.role`; `UserRoleModal.tsx` writes `user_roles` — these can desync |
| 2 | **Fix N+1 queries on UsersPage** — create `get_users_with_counts()` RPC | Performance | Low | `UsersPage.tsx:209-227` fires 4 queries × N users |
| 3 | **Batch email RPC** — create `get_user_emails(uuid[])` | Performance | Low | `PaymentsPage.tsx:201` fires N individual `get_user_email` calls |
| 4 | **Configure QueryClient defaults** (`staleTime: 30s`, `refetchOnWindowFocus: false`) | Performance | Trivial | `App.tsx` — `new QueryClient()` with no config |
| 5 | **Add missing indexes** for admin query patterns | Performance | Low | See §5 for full index list |



### 🟡 P1 — High Priority (Next 2 Weeks)

| # | Action | Area | Effort | Code Path |
|---|---|---|---|---|
| 6 | **Add RLS policies** for `email_templates` and `webhook_configurations` | Security | Low | Admin-managed tables with no visible write policies |
| 7 | **Replace `FOR ALL` on `user_roles`** with granular INSERT/UPDATE/DELETE policies | Security | Low | `UserRoleModal.tsx` — prevents privilege escalation |
| 8 | **Create `admin_audit_log` table** — log every admin write operation | Security | Medium | All modals above (§1) should emit audit entries |
| 9 | **Create `get_dashboard_stats()` RPC** — single call for AdminDashboard | Performance | Low | `AdminDashboard.tsx` currently fires 8+ count queries |
| 10 | **Standardize all admin pages on React Query** hooks pattern | Performance | Medium | UsersPage, PaymentsPage, ModerationPage, RegistrationsPage still use raw `useEffect` |

### 🟢 P2 — Medium Priority (Next Month)

| # | Action | Area | Effort | Code Path |
|---|---|---|---|---|
| 12 | **Build Email Template Editor** admin page | MarTech | High | `email_templates` table exists but has no admin UI |
| 13 | **Define event taxonomy** (`lib/events.ts`) — admin-side tracking | MarTech | Medium | No structured event types; `user_activity_log.action_type` is free-form |
| 14 | **Build admin event emitter** with batching | MarTech | Medium | Admin actions (role changes, bans, flag resolutions) aren't logged to `user_activity_log` |
| 15a | **Storage upload restrictions for `community-images` and `event-images`** (file type/size) | Security | Low | `CommunityModal.tsx`, `EventModal.tsx` — no server-side file validation |
| 16 | **Enable TypeScript strict mode** incrementally | Security | Medium | `tsconfig.app.json` has `strict: false`, `noImplicitAny: false` |

### 🔵 P3 — Strategic (Next Quarter)

| # | Action | Area | Effort | Code Path |
|---|---|---|---|---|
| 17 | **Build user segmentation system** (tagger) | MarTech | High | New `user_segments` table + admin UI |
| 18 | **Build campaign system** (template → segment mapper) | MarTech | High | New `email_campaigns` table + multi-step wizard UI |
| 19a | **Multi-channel admin configuration** (channel toggles, provider settings) | MarTech | High | `SystemSettingsPage.tsx` currently has no DB persistence |
| 20 | **Admin session tracking & anomaly detection** | Security | Medium | No `admin_sessions` table exists |

---

## 4. Bug: Admin Cannot Upload User Avatars (RLS Mismatch)

**Problem:** `UserModal.tsx` (line 151) uses `FileUpload` to upload to the `user-avatars` bucket with `path={user.id}`. However, the storage RLS policy requires:

```sql
bucket_id = 'user-avatars' AND auth.uid()::text = (storage.foldername(name))[1]
```

When an admin (uid = `admin-123`) uploads an avatar for user `user-456`, the folder name is `user-456` but `auth.uid()` is `admin-123`. **The upload silently fails.**

**Fix:** Add an admin bypass to the storage RLS policy:

```sql
CREATE POLICY "Admins can upload user avatars"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'user-avatars' AND public.is_admin());
```

Admins are confirmed to need this capability — `UserModal.tsx` intentionally allows avatar uploads for any user.

---

## 5. Implementation Details for P0 Items

### 5.1 Unify Role Systems (P0 #1)

**Current state:** Two parallel role systems that can desync:
- `users.role` column (written by `UserModal.tsx`)
- `user_roles` table (written by `UserRoleModal.tsx`)
- `is_admin_user()` checks `users.role`; `is_admin()` checks `user_roles`

**Steps:**
1. Migration: backfill every `users.role = 'admin'` user into `user_roles` table
2. Replace `is_admin_user()` to delegate to `is_admin()`
3. Update `UserModal.tsx` to stop writing `users.role` directly (write to `user_roles` instead)
4. Deprecate `users.role` column (keep as read-only for backward compat)

### 5.2 Fix N+1 on UsersPage (P0 #2)

**Current:** `UsersPage.tsx:209-227` — for each user: 4 queries (community_members, event_registrations, user_badges, get_user_email). 100 users = **400 queries**.

**Fix:** Create `get_users_with_counts()` RPC with LEFT JOINs and aggregated sub-selects. **1 query total.**

### 5.3 Batch Email RPC (P0 #3)

**Current:** `PaymentsPage.tsx:201` — `userIds.map(uid => supabase.rpc('get_user_email', {...}))`. 50 users = **50 calls**.

**Fix:** Create `get_user_emails(uuid[])` — accepts array, returns all emails in one round-trip.

### 5.4 QueryClient Defaults (P0 #4)

**Current:** `App.tsx` — `new QueryClient()` with zero configuration.

**Fix:** `staleTime: 30_000`, `retry: 1`, `refetchOnWindowFocus: false`, `gcTime: 300_000`.

### 5.5 Missing Indexes (P0 #5)

Indexes serving admin page query patterns:

| Index | Serves |
|---|---|
| `idx_users_created_at DESC` | AdminDashboard, AnalyticsPage user growth |
| `idx_events_created_at DESC` | AdminDashboard, AnalyticsPage |
| `idx_communities_created_at DESC` | AdminDashboard |
| `idx_payment_sessions_status_created` | PaymentsPage filtering |
| `idx_payment_sessions_event_id` | PaymentsPage joins |
| `idx_payment_sessions_user_id` | PaymentsPage joins |
| `idx_payment_logs_session_id` | PaymentsPage details |
| `idx_user_activity_timestamp DESC` | AdminLayout notification polling (60s interval) |
| `idx_event_registrations_event_id` | RegistrationsPage, EventRegistrationsModal |
| `idx_community_members_community_id` | CommunityDetailsPage member list |
| `idx_email_logs_template_id` | Future Email Template admin page |
| `idx_discussions_community_id` | DiscussionsPage listing |

---

## 6. Consumer Panel Backlog (For Separate Tracking)

The following items should be addressed in the **consumer panel** roadmap, not the admin panel:

| Item | Table/Feature | Action Needed |
|---|---|---|
| FK constraints on `payment_sessions` | `payment_sessions` | Add `user_id → auth.users(id)` and `event_id → events(id)` FKs |
| User-avatar upload file type/size validation | `storage.objects` (user-avatars) | Add `LOWER(storage.extension(name)) IN (...)` check to RLS policy |
| `notification_preferences` write restriction | `notification_preferences` | Add `user_id = auth.uid()` write policy |
| Referral self-referral prevention | `referrals` | Add `referrer_id != referred_user_id` check policy |
| `email_logs` insert restriction | `email_logs` | Restrict inserts to service role (Edge Functions only) |
| Payment idempotency key | `payment_sessions` | Add `idempotency_key TEXT UNIQUE` column |
| Payment IP address tracking | `payment_sessions` | Add `ip_address INET` column |
| `community_members` insert validation | `community_members` | Validate membership constraints at insert |
| Consumer-side event emitter | `user_activity_log` | Implement structured event tracking using shared taxonomy from #13 |
| Multi-channel delivery infrastructure | Edge Functions | Build `dispatch-message` Edge Function for email/SMS/WhatsApp routing |

---

## 7. Summary Scorecard

| Category | Admin Actions | Consumer Actions | Shared |
|---|---|---|---|
| Security | 5 items (#1, #6, #7, #8, #20) | 5 sub-items (notif prefs, referrals, email_logs, payment idempotency, payment IP) | — |
| Performance | 5 items (#2, #3, #4, #5, #9, #10) | 1 item (#11 FK constraints) | — |
| MarTech | 5 items (#12, #14, #15a, #17, #18) | 1 item (consumer event emitter) | 2 items (#13 taxonomy, #19 multi-channel) |
| Code Quality | 1 item (#16 strict mode) | — | — |
| **Bug Fix** | 1 item (§4 avatar RLS mismatch) | — | — |
| **Total** | **17 actions** | **10 actions** | **2 shared** |