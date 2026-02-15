# Admin Panel — Recurring Events Feature Implementation Plan

> **Created:** 2026-02-14
> **Last Updated:** 2026-02-14
> **Status:** Planning
> **Related:** `docs/PAYMENT_ADMIN_ENHANCEMENT_PLAN.md`

---

## 1. Current Database Schema (Verified from Supabase)

### events Table

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | NO | gen_random_uuid() | PK |
| community_id | uuid | NO | - | FK → communities.id |
| title | text | NO | - | |
| description | text | YES | - | |
| date_time | timestamptz | YES | - | Nullable (TBD events) |
| venue | text | NO | - | |
| capacity | integer | NO | - | |
| host_id | uuid | YES | - | FK → users.id |
| is_cancelled | boolean | NO | false | |
| price | numeric | YES | 0.00 | |
| currency | text | YES | 'INR' | |
| image_url | text | YES | - | |
| external_link | text | YES | - | |
| seo_title | text | YES | - | |
| seo_description | text | YES | - | |
| seo_image_url | text | YES | - | |
| seo_keywords | text[] | YES | - | |
| created_at | timestamptz | NO | now() | |
| updated_at | timestamptz | NO | now() | |

### Tables with FK to events

| Table | Column | Relationship |
|-------|--------|-------------|
| event_registrations | event_id | FK → events.id |
| event_tags | event_id | FK → events.id |
| payment_sessions | event_id | FK → events.id |

### Current RLS Policies on events

| Policy | Command | Condition |
|--------|---------|-----------|
| Anyone can view events | SELECT | true |
| Admins can manage events | INSERT | get_user_role() = 'admin' |
| Admins can update events | UPDATE | get_user_role() = 'admin' |
| Admins can delete events | DELETE | get_user_role() = 'admin' |

---

## 2. Architecture Decision: Self-Referencing `parent_event_id`

### Why NOT a Separate `event_instances` Table

1. **Decoupled editing requirement** — Each instance must be independently editable (title, description, price, venue, capacity, date_time) without affecting siblings or the parent.
2. **Existing FK relationships** — `event_registrations`, `event_tags`, and `payment_sessions` all reference `events.id`. Using a separate instances table would require migrating all three FKs or creating a union view.
3. **Query simplicity** — All existing queries (`SELECT * FROM events`) continue to work unchanged. Recurring instances are just regular events with a `parent_event_id`.
4. **Consumer panel compatibility** — The consumer panel already queries events; no changes needed for basic display.

### Chosen Approach

- Add **recurrence configuration columns** to the `events` table for the **parent event** (template).
- When an admin creates a recurring event, the system **generates child events** as separate rows in `events`, each with `parent_event_id` pointing to the template.
- Each child event is a **fully independent event** — editable, cancellable, with its own registrations, payment sessions, and tags.
- The parent event acts as a **template only** and is not displayed to end-users (marked with `is_recurring_parent = true`).

---

## 3. Proposed Schema Changes

### New Columns on `events` Table

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| is_recurring_parent | boolean | NO | false | True for template events |
| parent_event_id | uuid | YES | null | FK → events.id (self-ref) |
| recurrence_pattern | text | YES | null | 'daily' / 'weekly' / 'monthly' / 'custom' |
| recurrence_frequency | integer | YES | 1 | e.g., every N weeks |
| recurrence_days_of_week | integer[] | YES | null | 0=Sun, 1=Mon, …, 6=Sat |
| recurrence_day_of_month | integer | YES | null | 1–31 for monthly |
| recurrence_end_type | text | YES | null | 'date' / 'count' / 'never' |
| recurrence_end_date | timestamptz | YES | null | End date (if end_type='date') |
| recurrence_count | integer | YES | null | Num occurrences (if end_type='count') |
| recurrence_metadata | jsonb | YES | null | Future extensibility |
| series_index | integer | YES | null | 1-based position in series |

### Migration SQL

```sql
-- Migration: Add recurring events support to events table
-- File: supabase/migrations/YYYYMMDDHHMMSS_add_recurring_events.sql

-- 1. Add recurrence columns to events table
ALTER TABLE public.events
  ADD COLUMN is_recurring_parent boolean NOT NULL DEFAULT false,
  ADD COLUMN parent_event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  ADD COLUMN recurrence_pattern text CHECK (
    recurrence_pattern IN ('daily', 'weekly', 'monthly', 'custom')
  ),
  ADD COLUMN recurrence_frequency integer DEFAULT 1 CHECK (recurrence_frequency > 0),
  ADD COLUMN recurrence_days_of_week integer[] CHECK (
    recurrence_days_of_week <@ ARRAY[0,1,2,3,4,5,6]
  ),
  ADD COLUMN recurrence_day_of_month integer CHECK (
    recurrence_day_of_month BETWEEN 1 AND 31
  ),
  ADD COLUMN recurrence_end_type text CHECK (
    recurrence_end_type IN ('date', 'count', 'never')
  ),
  ADD COLUMN recurrence_end_date timestamptz,
  ADD COLUMN recurrence_count integer CHECK (recurrence_count > 0),
  ADD COLUMN recurrence_metadata jsonb,
  ADD COLUMN series_index integer CHECK (series_index > 0);

-- 2. Index for fast child lookup
CREATE INDEX idx_events_parent_event_id ON public.events(parent_event_id)
  WHERE parent_event_id IS NOT NULL;

-- 3. Index for filtering out template events in public queries
CREATE INDEX idx_events_is_recurring_parent ON public.events(is_recurring_parent)
  WHERE is_recurring_parent = true;

-- 4. Constraint: only parent events should have recurrence config
ALTER TABLE public.events
  ADD CONSTRAINT chk_recurrence_config CHECK (
    (is_recurring_parent = true AND recurrence_pattern IS NOT NULL)
    OR (is_recurring_parent = false)
  );

-- 5. Existing RLS policies apply automatically (no changes needed)
```

### Data Model Diagram

```
┌─────────────────────────────────────────────────┐
│                  events (parent)                 │
│  is_recurring_parent = true                     │
│  recurrence_pattern = 'weekly'                  │
│  recurrence_frequency = 1                       │
│  recurrence_days_of_week = [2, 4]  (Tue, Thu)  │
│  recurrence_end_type = 'count'                  │
│  recurrence_count = 10                          │
│  parent_event_id = NULL                         │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │ Child #1 │  │ Child #2 │  │ Child #3 │ ... │
│  │ series=1 │  │ series=2 │  │ series=3 │     │
│  │ Tue 2/18 │  │ Thu 2/20 │  │ Tue 2/25 │     │
│  │ parent=↑ │  │ parent=↑ │  │ parent=↑ │     │
│  └──────────┘  └──────────┘  └──────────┘     │
│        │              │              │          │
│   registrations  registrations  registrations  │
│   payment_sess   payment_sess   payment_sess   │
│   event_tags     event_tags     event_tags     │
└─────────────────────────────────────────────────┘
```

---

## 4. Affected Files

### Admin Pages (Direct Changes Required)

| File | Change | Priority |
|------|--------|----------|
| `src/pages/admin/EventsPage.tsx` | Filter out `is_recurring_parent=true` from listing (or show with indicator); add "Recurring" badge; add series column; add bulk actions | High |
| `src/pages/admin/AdminDashboard.tsx` | Exclude parent templates from event count | Medium |
| `src/pages/admin/RegistrationsPage.tsx` | No change (registrations link to child events, which are regular events) | None |
| `src/pages/admin/PaymentsPage.tsx` | No change (payment_sessions link to child events) | None |
| `src/pages/admin/AnalyticsPage.tsx` | Exclude parent templates from event analytics | Medium |

### Admin Components (Direct Changes Required)

| File | Change | Priority |
|------|--------|----------|
| `src/components/admin/EventModal.tsx` | Add recurring event toggle + recurrence configuration form fields; handle instance generation on create | High |
| `src/components/admin/EventDetailsModal.tsx` | Show series membership badge; link to parent/siblings; add "Edit All Future" / "Cancel All Future" options | High |
| `src/components/admin/EventRegistrationsModal.tsx` | No change (works per-event, child events are regular events) | None |
| `src/components/admin/RegistrationDetailsModal.tsx` | No change | None |
| `src/components/admin/PaymentDetailsModal.tsx` | No change | None |

### Other Files

| File | Change | Priority |
|------|--------|----------|
| `src/App.tsx` | No change (no new routes needed) | None |
| `src/components/admin/AdminLayout.tsx` | No change | None |
| `supabase/migrations/` | New migration file for schema changes | High |

---

## 5. Implementation Roadmap

### Phase 1: Database Schema Migration

**Effort:** 1 day
**Files:** New migration file

- [ ] Create migration file with all new columns, indexes, and constraints
- [ ] Run migration on Supabase project
- [ ] Verify columns appear correctly in database
- [ ] Verify existing events are unaffected (all new columns default to false/null)

---

### Phase 2: Recurrence Configuration UI in EventModal

**Effort:** 3–4 days
**Files:** `EventModal.tsx`

- [ ] Add `is_recurring` toggle (Switch component) to event form
- [ ] When toggled ON, show recurrence configuration panel:
  - [ ] Recurrence pattern dropdown (Daily, Weekly, Monthly, Custom)
  - [ ] Frequency input (every N days/weeks/months)
  - [ ] Days of week multi-select (for weekly: Mon–Sun checkboxes)
  - [ ] Day of month select (for monthly: 1–31 dropdown)
  - [ ] End condition radio group (End date / After N occurrences / Never)
  - [ ] End date picker (conditional)
  - [ ] Occurrence count input (conditional)
- [ ] Update Zod schema with recurrence validation rules:
  - Weekly pattern requires at least one day selected
  - Monthly pattern requires day of month
  - End type 'date' requires end_date
  - End type 'count' requires count > 0
- [ ] Preview: Show calculated instance dates before creation
- [ ] On submit (create): Generate parent + child events in a single transaction
- [ ] On submit (edit): Only edit the individual instance (no backflow)
- [ ] Disable recurrence fields when editing an existing child instance

**Form Layout (Wireframe):**

```
┌─────────────────────────────────────────────┐
│  Create New Event                           │
├─────────────────────────────────────────────┤
│  Title: [___________________________]       │
│  Description: [______________________]      │
│  Community: [▼ Select]  Host: [▼ Select]   │
│  Date & Time: [📅 Pick date]               │
│  Image: [Upload]                            │
│  External Link: [_______________]           │
│  Venue: [________________________]          │
│  Capacity: [50]  Price: [0.00]             │
│                                             │
│  ─── Recurring Event ──────────────────── │
│  [🔘 Enable Recurring Event]               │
│                                             │
│  Pattern: [▼ Weekly          ]             │
│  Every: [1] week(s)                        │
│  On: ☐Mon ☑Tue ☐Wed ☑Thu ☐Fri ☐Sat ☐Sun  │
│                                             │
│  Ends: ◉ After [10] occurrences            │
│        ○ On date [📅]                       │
│        ○ Never                              │
│                                             │
│  📋 Preview: 10 events will be created     │
│     1. Tue, Feb 18, 2026 at 18:00          │
│     2. Thu, Feb 20, 2026 at 18:00          │
│     3. Tue, Feb 25, 2026 at 18:00          │
│     ... (show first 5 + "and 7 more")      │
│                                             │
│          [Cancel]  [Create 10 Events]       │
└─────────────────────────────────────────────┘
```

---

### Phase 3: Instance Generation Logic

**Effort:** 2–3 days
**Files:** `EventModal.tsx` (or new utility file `src/lib/recurrence.ts`)

- [ ] Create `generateRecurrenceDates(config)` utility function:
  - Input: start date, pattern, frequency, days of week, day of month, end type, end date/count
  - Output: array of `Date` objects for each instance
  - Handle edge cases: month overflow (e.g., Feb 30 → Feb 28), leap years
  - Cap maximum instances at 52 (1 year of weekly) or 365 (1 year of daily) for safety
- [ ] Create `generateChildEvents(parentData, dates)` function:
  - Copies all parent fields (title, description, venue, capacity, price, community_id, host_id, image_url, external_link)
  - Sets unique `date_time` for each instance
  - Sets `parent_event_id` = parent.id
  - Sets `series_index` = 1, 2, 3, …
  - Does NOT set `is_recurring_parent` (defaults to false)
- [ ] Implement batch insert via Supabase:
  - Insert parent event first (with `is_recurring_parent = true`)
  - Insert all child events in a single `.insert([...])` call
- [ ] Add error handling and rollback logic (delete parent if children fail)

---

### Phase 4: Events Page — Display & Filtering

**Effort:** 2–3 days
**Files:** `EventsPage.tsx`, `EventDetailsModal.tsx`

- [ ] Modify `loadEvents()` query to exclude `is_recurring_parent = true`:
  ```ts
  .eq('is_recurring_parent', false)
  ```
- [ ] Add "Part of series" badge/indicator for events where `parent_event_id IS NOT NULL`
- [ ] Add `series_index` display (e.g., "Instance 3 of 10")
- [ ] Add series filter option to see all events in a series
- [ ] In `EventDetailsModal`:
  - [ ] Show series info section when `parent_event_id` is set
  - [ ] "View All in Series" button → filters DataTable by parent_event_id
  - [ ] Show series_index / total count

---

### Phase 5: Bulk Operations on Series

**Effort:** 3–4 days
**Files:** `EventDetailsModal.tsx`, `EventsPage.tsx`

- [ ] **Cancel All Future Instances:**
  - From any child event, cancel all sibling events with `date_time > now()` that share the same `parent_event_id`
  - Confirmation dialog with count of affected events
  - Uses batch update: `supabase.from('events').update({ is_cancelled: true }).eq('parent_event_id', parentId).gt('date_time', now)`

- [ ] **Edit All Future Instances:**
  - Allow updating common fields (venue, capacity, price, host) for all future sibling events
  - Show a dialog: "Apply to this event only" vs "Apply to all future events in this series"
  - Fields that can be bulk-updated: venue, capacity, price, host_id, description
  - Fields that remain per-instance: date_time, title (can be overridden), is_cancelled

- [ ] **Delete Series:**
  - Delete parent + all child events (only if no registrations exist on any child)
  - If registrations exist, offer "Cancel All" instead

---

### Phase 6: Dashboard & Analytics Adjustments

**Effort:** 1–2 days
**Files:** `AdminDashboard.tsx`, `AnalyticsPage.tsx`

- [ ] `AdminDashboard.tsx` — Exclude parent templates from total event count:
  ```ts
  supabase.from('events').select('id, created_at', { count: 'exact' })
    .eq('is_recurring_parent', false)
  ```
- [ ] `AnalyticsPage.tsx` — Exclude parent templates from:
  - Total events count
  - Revenue by event chart (parent events never have payment_sessions)
- [ ] Optionally: Add "Recurring Series" count as a new metric

---

### Phase 7: Consumer Panel Considerations (Future)

**Effort:** 2–3 days (out of scope for admin panel, noted for planning)

- [ ] Consumer event listing queries should add `.eq('is_recurring_parent', false)` filter
- [ ] Event detail page should show "Part of a recurring series" indicator
- [ ] Allow users to browse other instances in the series
- [ ] Each instance has independent registration and payment flows (already works — no changes needed)

---

## 6. Priority Matrix

| Phase | Value | Complexity | Effort | Dependencies |
|-------|-------|------------|--------|-------------|
| Phase 1: Schema Migration | Critical | Low | 1 day | None |
| Phase 2: Recurrence UI | Critical | Medium | 3–4 days | Phase 1 |
| Phase 3: Instance Generation | Critical | Medium | 2–3 days | Phase 1, 2 |
| Phase 4: Display & Filtering | High | Low | 2–3 days | Phase 1, 3 |
| Phase 5: Bulk Operations | Medium | Medium | 3–4 days | Phase 4 |
| Phase 6: Dashboard Adjustments | Medium | Low | 1–2 days | Phase 1 |
| Phase 7: Consumer Panel | Low | Low | 2–3 days | Phase 1 |

**Total Estimated Effort:** 14–20 days

**Recommended Order:** Phase 1 → Phase 2 + 3 (parallel) → Phase 4 → Phase 6 → Phase 5 → Phase 7

---


## 7. Technical Considerations

### Instance Independence (Core Requirement)

**Rule:** Once a child event is created, it is a fully independent event.

- Editing a child event does NOT affect siblings or the parent template.
- Editing the parent template does NOT retroactively change existing children.
- Cancelling one instance does NOT cancel others.
- Bulk operations (Phase 5) are explicit opt-in actions, not automatic propagation.

### Maximum Instance Limits

| Pattern | Max Instances | Rationale |
|---------|--------------|-----------|
| Daily | 365 | 1 year |
| Weekly | 52 | 1 year |
| Monthly | 24 | 2 years |
| Custom | 52 | Conservative default |

### Edge Cases

1. **Month overflow:** Monthly on the 31st → clamp to last day of month (e.g., Feb 28/29)
2. **Leap years:** Feb 29 events → skip in non-leap years or clamp to Feb 28
3. **Timezone handling:** All dates stored as UTC (`timestamptz`); display in user's timezone
4. **TBD parent events:** Recurring events REQUIRE a `date_time` (cannot create recurring TBD events)
5. **External link events:** Recurring events with external links → each child gets the same link (editable individually)
6. **Free vs paid:** Each child inherits price from parent; can be individually overridden
7. **Cancelled parent:** If parent is cancelled, children are NOT automatically cancelled (they're independent)

### Backward Compatibility

- All existing events have `is_recurring_parent = false` and `parent_event_id = null` by default
- No existing queries break (new columns have safe defaults)
- No existing RLS policies need changes
- No existing FK relationships change
- Consumer panel continues to work without any changes (parent templates are hidden by default)

---

## 8. Completion Tracking

| Phase | Status | Started | Completed | Commit |
|-------|--------|---------|-----------|--------|
| Phase 1: Schema Migration | ⬜ Not Started | - | - | - |
| Phase 2: Recurrence UI | ⬜ Not Started | - | - | - |
| Phase 3: Instance Generation | ⬜ Not Started | - | - | - |
| Phase 4: Display & Filtering | ⬜ Not Started | - | - | - |
| Phase 5: Bulk Operations | ⬜ Not Started | - | - | - |
| Phase 6: Dashboard Adjustments | ⬜ Not Started | - | - | - |
| Phase 7: Consumer Panel | ⬜ Not Started | - | - | - |