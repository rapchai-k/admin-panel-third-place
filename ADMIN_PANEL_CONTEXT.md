# MyThirdPlace Admin Panel — Full Context for External Agents/Repos

## What Is This?
This is the **admin panel** for the **MyThirdPlace** platform — a community-driven events and discussions platform targeting metro-city users. The admin panel is a standalone React SPA that shares a **Supabase** database with a separate **consumer panel** (user-facing app). Admins use this panel to manage communities, events, users, payments, moderation, and analytics.

- **Repo name**: `place-command-center`
- **Live consumer URL**: `https://mythirdplace.rapchai.com`
- **Deployed via**: Vercel (static build from `dist/`)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite 5 |
| Styling | Tailwind CSS 3 + shadcn/ui (Radix primitives) |
| Routing | React Router DOM 6 (SPA, all routes under `/admin/*`) |
| State | React Query (TanStack Query v5) for server state |
| Backend | Supabase (Postgres DB + Auth + Storage + Edge Functions) |
| Forms | React Hook Form + Zod validation |
| Charts | Recharts |
| Payments | Cashfree (via Supabase Edge Functions) |
| Themes | next-themes (dark/light mode) |
| Icons | Lucide React |
| Currency | INR-only (hardcoded via CurrencyProvider) |

---

## Authentication & Authorization

- **Auth provider**: Supabase Auth (email/password sign-in for admins, Google OAuth for consumers)
- **Admin check**: After sign-in, the app calls the Supabase RPC `is_admin({ _user_id })` which checks the `user_roles` table for an active `admin` role.
- **Protected routes**: `ProtectedAdminRoute` component wraps the `AdminLayout`; unauthenticated or non-admin users are redirected to `/admin/login`.
- **Role hierarchy** (enum `app_role`): `admin` > `moderator` > `community_manager` > `event_organizer` > `user`
- **Legacy role column**: `users.role` (`user` | `admin`) — kept for backwards compat. The authoritative role system is `user_roles` table.

---

## Route Map

All routes are nested under `/admin`:

| Route | Page Component | Purpose |
|---|---|---|
| `/admin/dashboard` | `AdminDashboard` | KPI cards, recent activity, quick stats |
| `/admin/analytics` | `AnalyticsPage` | Charts, growth trends, engagement metrics |
| `/admin/communities` | `CommunitiesPage` | CRUD communities |
| `/admin/communities/:id` | `CommunityDetailsPage` | Single community deep-dive |
| `/admin/events` | `EventsPage` | CRUD events (including recurring) |
| `/admin/users` | `UsersPage` | User list, ban/unban, role management |
| `/admin/advanced-users` | `AdvancedUserManagementPage` | Roles, permissions, badges |
| `/admin/discussions` | `DiscussionsPage` | Manage community discussions |
| `/admin/discussions/:id` | `DiscussionDetailsPage` | Single discussion + comments |
| `/admin/registrations` | `RegistrationsPage` | Event registrations overview |
| `/admin/payments` | `PaymentsPage` | Payment sessions, logs, revenue |
| `/admin/moderation` | `ModerationPage` | Flagged content review |
| `/admin/email-templates` | `EmailTemplatesPage` | HTML email template CRUD |
| `/admin/settings` | `SystemSettingsPage` | System-wide settings |

---

## Database Schema (Supabase / Postgres)

### Core Tables

| Table | Key Columns | Purpose |
|---|---|---|
| `users` | id, name, role, is_banned, referral_code, whatsapp_number, photo_url | User profiles |
| `communities` | id, name, city, slug, description, image_url | Community entities |
| `community_members` | community_id, user_id, joined_at | Membership join table |
| `events` | id, title, venue, date_time, capacity, price, currency, community_id, host_id, is_cancelled, short_code, external_link, recurrence fields | Events (single + recurring) |
| `event_registrations` | id, event_id, user_id, status (`registered`/`unregistered`), payment_id, payment_session_id | Registration tracking |
| `discussions` | id, title, prompt, community_id, created_by, expires_at, is_visible, extended | Time-bound discussions |
| `discussion_comments` | id, discussion_id, user_id, text, flagged_count | Discussion comments |

### Payments
| Table | Purpose |
|---|---|
| `payment_sessions` | Cashfree order tracking (amount, currency, status, cashfree_order_id) |
| `payment_logs` | Webhook event log from Cashfree |

### Moderation & Roles
| Table | Purpose |
|---|---|
| `flags` | User-reported content (flagged_user_id, comment_id, reason, status: open/resolved/urgent) |
| `user_roles` | RBAC role assignments (admin, moderator, community_manager, event_organizer, user) |
| `user_permissions` | Fine-grained permission grants (permission_type, resource_type, resource_id) |
| `user_badges` | Achievement badges for users |

### Audit & Activity
| Table | Purpose |
|---|---|
| `admin_audit_log` | Every admin action logged (action, target_type, target_id, previous/new state) |
| `user_activity_log` | Consumer-side activity (user_created, event_created, registration_created, etc.) |

### Email & Webhooks
| Table | Purpose |
|---|---|
| `email_templates` | HTML templates with variable substitution (event_type, subject, html_content) |
| `email_logs` | Delivery tracking (recipient, status, provider, message_id) |
| `webhook_configurations` | Outbound webhook endpoints (url, events[], secret_key) |
| `webhook_deliveries` | Delivery attempts and responses |

### Other
| Table | Purpose |
|---|---|
| `referrals` | User referral tracking |
| `notification_preferences` | Per-user email/sms/whatsapp preferences |
| `user_requests` | User-submitted requests (host requests, feedback) |
| `bulk_operations` | Batch admin operations tracking |

### Key Enums
- `app_role`: admin, moderator, community_manager, event_organizer, user
- `user_role`: user, admin (legacy)
- `registration_status`: unregistered, registered
- `payment_status`: yet_to_pay, paid
- `flag_status`: open, resolved, urgent

### Key RPC Functions
- `is_admin(_user_id)` → boolean
- `is_admin_user(_user_id)` → boolean
- `has_role(_user_id, _role)` → boolean
- `has_permission(_user_id, _permission_type, _resource_type?, _resource_id?)` → boolean
- `get_user_email(_user_id)` → string
- `get_user_emails(_user_ids[])` → {user_id, email}[]
- `get_users_with_counts()` → users + community_count, event_count, badge_count
- `get_user_highest_role(_user_id)` → app_role
- `generate_referral_code()` → string
- `dispatch_webhook(event_type, event_data, actor_user_id?)` → void
- `is_community_member(_user_id, _community_id)` → boolean

---

## Recurring Events System

Events can be **one-off** or **recurring** (daily/weekly/monthly/custom). A recurring event has `is_recurring_parent = true` and spawns child events with `parent_event_id` referencing the parent. Each child has a `series_index`. Recurrence config is stored on the parent: `recurrence_pattern`, `recurrence_frequency`, `recurrence_days_of_week`, `recurrence_day_of_month`, `recurrence_end_type`, `recurrence_end_date`, `recurrence_count`.

The `src/lib/recurrence.ts` utility generates occurrence dates; `buildChildEvents()` creates insert payloads for child rows.

---

## Short URLs & Slugs

- **Events** get an 8-char alphanumeric `short_code` → consumer URL: `https://mythirdplace.rapchai.com/e/{code}`
- **Communities** get a `slug` derived from name → consumer URL: `https://mythirdplace.rapchai.com/c/{slug}`
- Utilities in `src/lib/short-url.ts`

---

## Audit Logging

Every admin mutation (create/update/ban/role-change/flag-resolve) is logged to `admin_audit_log` via `logAdminAction()` from `src/lib/admin-audit.ts`. Action constants are defined in `src/lib/admin-events.ts` (e.g., `user.ban`, `event.create`, `flag.resolve`).

---

## Key Architecture Patterns

1. **Supabase client** (`src/integrations/supabase/client.ts`): Single typed client instance used everywhere.
2. **React Query**: All data fetching via `useQuery`/`useMutation` hooks with 30s stale time.
3. **Modal-based CRUD**: Most entity management uses modal dialogs (e.g., `EventModal`, `CommunityModal`, `UserModal`).
4. **DataTable component**: Reusable table with sorting/filtering/pagination (`src/components/admin/DataTable.tsx`).
5. **Fire-and-forget audit**: Audit inserts never block the UI — errors are console-logged only.
6. **Currency**: Hardcoded to INR via `CurrencyProvider` context.
7. **Notifications**: Admin header polls `user_activity_log` every 60s for a notification bell.

---

## Project Structure

```
src/
├── App.tsx                    # Route definitions + provider tree
├── main.tsx                   # Entry point
├── components/
│   ├── admin/                 # All admin-specific components
│   │   ├── AdminAuthProvider  # Auth context + is_admin check
│   │   ├── AdminLayout        # Sidebar + header + notification bell
│   │   ├── AdminLoginPage     # Email/password login
│   │   ├── ProtectedAdminRoute# Auth guard
│   │   ├── DataTable          # Reusable data grid
│   │   ├── *Modal.tsx         # CRUD modals for each entity
│   │   └── ...
│   ├── common/                # Shared components (ErrorBoundary)
│   └── ui/                    # shadcn/ui primitives
├── context/
│   └── CurrencyProvider.tsx   # INR-only currency context
├── hooks/                     # use-toast, use-mobile
├── integrations/supabase/
│   ├── client.ts              # Supabase client init
│   └── types.ts               # Auto-generated DB types
├── lib/
│   ├── admin-audit.ts         # Audit log insertion
│   ├── admin-events.ts        # Action/target type constants
│   ├── currency.ts            # Formatting utilities
│   ├── recurrence.ts          # Recurring event date generation
│   ├── short-url.ts           # Short code & slug generation
│   └── utils.ts               # Tailwind cn() helper
├── pages/admin/               # Page-level components
│   ├── AdminDashboard.tsx
│   ├── CommunitiesPage.tsx
│   ├── EventsPage.tsx
│   ├── UsersPage.tsx
│   ├── PaymentsPage.tsx
│   ├── ModerationPage.tsx
│   └── ...
supabase/
├── config.toml                # Local Supabase config
└── migrations/                # SQL migration files
```

---

## Environment Variables Required

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project API URL (`https://<ref>.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public API key |
| `VITE_CONSUMER_URL` | Consumer panel base URL (for generating short links) |

---

## Hootsuite OAuth2 Integration (Social Posting)

The app uses Hootsuite's **OAuth2 Authorization Code** flow to post to social media on behalf of the admin.

### Flow
1. Admin clicks "Connect Hootsuite" on the Settings page → opens Hootsuite authorize URL
2. Admin logs in to Hootsuite and grants permission → Hootsuite redirects to our `hootsuite-oauth-callback` Edge Function with a `code` param
3. Edge Function exchanges `code` for `access_token` + `refresh_token` via `POST /oauth2/token`
4. Tokens are stored in the `hootsuite_tokens` table (single-row, upserted)
5. When posting, the shared helper reads tokens from DB, checks `expires_at`, and auto-refreshes if expired using `refresh_token`

### Secrets (Supabase Edge Function env)
| Secret | Purpose |
|---|---|
| `HOOTSUITE_CLIENT_ID` | OAuth2 client ID from Hootsuite Developer Portal |
| `HOOTSUITE_CLIENT_SECRET` | OAuth2 client secret from Hootsuite Developer Portal |
| `HOOTSUITE_REDIRECT_URI` | Callback URL pointing to the `hootsuite-oauth-callback` Edge Function |

### Frontend env vars
| Variable | Purpose |
|---|---|
| `VITE_HOOTSUITE_CLIENT_ID` | Used to build the authorize URL on the frontend |
| `VITE_HOOTSUITE_REDIRECT_URI` | Must match the redirect URI registered with Hootsuite |

---

## Relationship to Consumer Panel

- **Shared database**: Both panels read/write the same Supabase Postgres database.
- **Shared auth**: Same Supabase Auth project; admin panel checks `user_roles` for admin access.
- **Shared storage buckets**: `community-images`, `event-images`, `user-avatars`.
- **Consumer panel tech**: React 18 + Next.js 15 + Tailwind (separate repo).
- **Data flow**: Consumers generate activity → admin panel monitors/manages via the same tables.
- **Edge Functions** (in Supabase): `welcome-email-trigger`, `send-email` — triggered by consumer actions, visible in admin via `email_logs`.

