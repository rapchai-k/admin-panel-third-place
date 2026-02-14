# Admin Panel — Payment Feature Enhancement Plan

> **Created:** 2026-02-11
> **Last Updated:** 2026-02-12
> **Status:** In Progress — Phases 0, 1, 2, 3, 4 complete
> **Payment Gateway:** Razorpay
> **Commits:** `a58b40b` (main, Phases 0–2), `dec0b29` (feat/phase-3-payments-page, Phase 3), `feat/phase-4-payment-analytics` (Phase 4)

---

## 1. Current Database Schema (Verified from Supabase)

### payment_sessions Table

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid | gen_random_uuid() | PK |
| user_id | uuid | - | FK to users |
| event_id | uuid | - | FK to events |
| amount | numeric | - | Payment amount |
| currency | text | 'INR' | Always INR |
| status | text | 'pending' | Session status |
| payment_status | enum | 'yet_to_pay' | See enum values below |
| payment_url | text | null | Razorpay payment link |
| razorpay_payment_link_id | text | null | Razorpay link ID |
| razorpay_payment_id | text | null | Razorpay payment ID |
| gateway | text | 'razorpay' | Payment gateway |
| expires_at | timestamptz | now() + 1 hour | Session expiry |
| created_at | timestamptz | now() | - |
| updated_at | timestamptz | now() | - |

### payment_logs Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| payment_session_id | uuid | FK to payment_sessions |
| event_type | text | Webhook event type |
| event_data | jsonb | Full webhook payload |
| created_at | timestamptz | - |

### event_registrations Table (Payment columns)

| Column | Type | Notes |
|--------|------|-------|
| payment_session_id | uuid | FK to payment_sessions |
| payment_id | text | Legacy payment ID |

### events Table (Payment columns)

| Column | Type | Default |
|--------|------|---------|
| price | numeric | 0.00 |
| currency | text | 'INR' |

### payment_status Enum Values

- `yet_to_pay` — Payment pending
- `paid` — Payment completed
- `failed` — Payment failed
- `expired` — Session expired
- `cancelled` — Payment cancelled
- `refunded` — Payment refunded

---

## 2. Current Admin Panel Features

### What Exists

| Feature | Location | Status |
|---------|----------|--------|
| Payment status badges | RegistrationsPage, RegistrationDetailsModal | ✅ Working |
| Payment ID display | RegistrationDetailsModal | ✅ Fixed (was cashfree_*) |
| Monthly revenue chart | AnalyticsPage Revenue tab | ✅ Working |
| Total Revenue metric | AnalyticsPage | ✅ Working |
| Dashboard payment metrics | AdminDashboard | ✅ Added (Phase 1) |
| Payment status filter | RegistrationsPage | ✅ Added (Phase 2) |
| CSV export | RegistrationsPage | ✅ Added (Phase 2) |
| Payment summary stats | RegistrationsPage | ✅ Added (Phase 2) |
| Copy-to-clipboard for IDs | RegistrationDetailsModal | ✅ Added (Phase 2) |
| Gateway & timestamp display | RegistrationDetailsModal | ✅ Added (Phase 2) |
| Dedicated payments page | PaymentsPage (/admin/payments) | ✅ Added (Phase 3) |
| Payment logs viewer | PaymentDetailsModal (timeline) | ✅ Added (Phase 3) |
| Revenue by event chart | AnalyticsPage Payments tab | ✅ Added (Phase 4) |
| Revenue by community chart | AnalyticsPage Payments tab | ✅ Added (Phase 4) |
| Payment status distribution | AnalyticsPage Payments tab (donut) | ✅ Added (Phase 4) |
| Payment conversion funnel | AnalyticsPage Payments tab | ✅ Added (Phase 4) |

### What is Still Missing

| Gap | Current State | Priority |
|-----|---------------|----------|
| Refund processing | Shows "coming soon!" toast | Medium |
| Cancel registration | Shows "coming soon!" toast | Medium |

---

## 3. Implementation Roadmap

### Phase 0: Bug Fix — Razorpay Field Names ✅ COMPLETED

**Files:** RegistrationsPage.tsx, RegistrationDetailsModal.tsx, EventRegistrationsModal.tsx
**Change:** cashfree_order_id → razorpay_payment_link_id, cashfree_payment_id → razorpay_payment_id
**Effort:** 30 minutes

- [x] Fix field names in RegistrationsPage.tsx
- [x] Fix field names in RegistrationDetailsModal.tsx
- [x] Fix field names in EventRegistrationsModal.tsx (discovered during fix)

---

### Phase 1: Payment Dashboard Metrics ✅ COMPLETED

**File:** AdminDashboard.tsx
**Effort:** 2-3 days

- [x] Add totalRevenue, paidCount, pendingPaymentsCount, expiredPaymentsCount, recentRevenue to DashboardStats
- [x] Query payment_sessions in loadDashboardData()
- [x] Add Total Revenue StatCard (with 30-day revenue subtitle)
- [x] Add Payments StatCard (with pending·expired subtitle)

---

### Phase 2: Enhanced Registrations and Export ✅ COMPLETED

**Files:** RegistrationsPage.tsx, RegistrationDetailsModal.tsx
**Effort:** 3-4 days

- [x] Add payment status filter dropdown (paid/yet_to_pay/expired/free/pending)
- [x] Implement CSV export with proper escaping (12 columns incl. registration status, payment status, gateway)
- [x] Add payment summary stats bar (4-card grid: paid, yet to pay, expired, free — with amounts)
- [x] Add copy-to-clipboard for Razorpay IDs (with fallback for older browsers)
- [x] Add missing payment details to modal:
  - [x] Payment timestamp (`updated_at` displayed as "Paid At")
  - [x] Payment gateway display (`gateway` field, capitalized)

---

### Phase 3: Dedicated Payments Page ✅ COMPLETED

**New files:** PaymentsPage.tsx, PaymentDetailsModal.tsx
**Effort:** 4-5 days

- [x] Create PaymentsPage with DataTable (filters, CSV export, summary stats, parallel batch-fetch)
- [x] Create PaymentDetailsModal with logs timeline (copy-to-clipboard, expandable JSON payloads)
- [x] Add navigation in AdminLayout.tsx (CreditCard icon in Management group)
- [x] Add route in App.tsx (/admin/payments)

---

### Phase 4: Payment Analytics ✅ COMPLETED

**File:** AnalyticsPage.tsx
**Effort:** 3-4 days

- [x] Add revenue by event chart (horizontal bar, top 10 events by paid revenue)
- [x] Add revenue by community chart (horizontal bar, total paid revenue per community)
- [x] Add payment status distribution donut chart (paid, yet_to_pay, expired, failed, cancelled, refunded)
- [x] Add payment conversion funnel (Sessions Created → Awaiting Payment → Payment Completed with percentages)

---

### Phase 5: Refund Operations

**Effort:** 5-7 days (Requires Razorpay API integration)

- [ ] Create RefundModal component
- [ ] Implement handleRefund() with Razorpay API
- [ ] Implement handleCancelRegistration()
- [ ] Add refund tracking columns if needed

---

## 4. Priority Matrix

| Phase | Value | Complexity | Effort |
|-------|-------|------------|--------|
| Phase 0 | Critical | Low | 30 min |
| Phase 1 | High | Low | 2-3 days |
| Phase 2 | High | Low | 3-4 days |
| Phase 3 | Medium | Medium | 4-5 days |
| Phase 4 | Medium | Medium | 3-4 days |
| Phase 5 | Medium | High | 5-7 days |

**Recommended next:** Phase 5 (Refund Operations).

