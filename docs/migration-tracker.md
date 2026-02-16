# Migration Tracker — Cross-Repo Coordination

## Problem

Two repos (`admin-panel` and `consumer-panel`) share a single Supabase database.
Each repo has its own `supabase/migrations/` directory with different files, leading to:

- Migration version conflicts
- Unknown which repo applied what
- No way to detect file edits after application (drift)
- 11 orphaned admin-panel migration files that were never applied to remote

## Solution: `migration_tools.migration_registry`

A shared table in the database itself that both repos read/write to coordinate.

### Table Location

```
Schema: migration_tools
Table:  migration_registry
```

> Lives in its own schema to avoid cluttering `public` and Supabase auto-generated types.
> No RLS — accessed only via `service_role` key in CLI scripts. Never from app code.

### Columns

| Column | Type | Description |
|---|---|---|
| `version` | `TEXT PK` | Timestamp prefix, e.g. `20260215120000` |
| `name` | `TEXT` | Migration description (filename after version) |
| `source_repo` | `TEXT` | `'admin-panel'` or `'consumer-panel'` |
| `checksum` | `TEXT` | SHA-256 of the `.sql` file |
| `applied` | `BOOLEAN` | Whether it's been applied to the remote DB |
| `applied_at` | `TIMESTAMPTZ` | When it was applied |
| `applied_by` | `TEXT` | Who ran it |
| `review_status` | `TEXT` | `NULL`, `pending_review`, `reviewed`, `deprecated`, `superseded` |
| `description` | `TEXT` | Optional human note |
| `created_at` | `TIMESTAMPTZ` | When registered |

---

## Scripts

All scripts live in `scripts/` and require `SUPABASE_DB_URL` (set in `.env` or exported).

### 1. `migration-register.sh` — Register a migration

```bash
./scripts/migration-register.sh supabase/migrations/20260215120000_my_migration.sql "optional description"
```

- Computes SHA-256 checksum of the file
- Upserts into the registry (updates checksum if already exists)
- Defaults to `applied: false` — update to `true` after you apply it

### 2. `migration-verify.sh` — Check for sync issues

```bash
./scripts/migration-verify.sh
```

Reports:
1. **Local files not in registry** — forgot to register
2. **Registry entries missing locally** — applied by the other repo, you don't have the file
3. **Checksum drift** — file was modified after registration
4. **Pending reviews** — migrations needing human verification

### 3. `migration-status.sh` — View the full registry

```bash
./scripts/migration-status.sh            # all migrations
./scripts/migration-status.sh --pending  # unapplied / pending review
./scripts/migration-status.sh --applied  # applied only
```

---

## Workflow: Creating a New Migration

```
1. Write your .sql file in supabase/migrations/
2. Run:  ./scripts/migration-register.sh supabase/migrations/<file>.sql "description"
3. Apply to remote (Supabase SQL Editor, supabase db push, or psql)
4. Mark as applied:
     psql $SUPABASE_DB_URL -c \
       "UPDATE migration_tools.migration_registry SET applied=true, applied_at=now() WHERE version='<version>'"
5. Run:  ./scripts/migration-verify.sh   (confirm everything is clean)
6. Commit the .sql file and push to your repo
```

---

## How Consumer Panel Should Adopt This

### Step 1: Copy the scripts

Copy these three files into your consumer-panel repo:

```
scripts/migration-register.sh
scripts/migration-verify.sh
scripts/migration-status.sh
```

### Step 2: Set the repo name

In your `.env` or before running scripts:

```bash
export MIGRATION_REPO_NAME=consumer-panel
```

The scripts default to `admin-panel` — consumer-panel MUST override this.

### Step 3: Run verify to check current state

```bash
./scripts/migration-verify.sh
```

This will show which of your 27 migrations are already in the registry (all of them —
the admin-panel seeded them during setup) and flag any checksum drift.

### Step 4: Use the workflow above for all new migrations

Both repos follow the same register → apply → verify cycle. The registry is the
single source of truth for "what has been applied to this database."

---

## Orphaned Admin-Panel Migrations (Pending Review)

These 11 migrations exist in the admin-panel repo but were **never applied to remote**.
They are registered with `review_status = 'pending_review'`.

**Action required from consumer-panel team:** Check if these changes already exist
in your migrations or were applied via the Supabase dashboard.

| Version | Name | Notes |
|---|---|---|
| `20250113120000` | `add_get_user_email_function` | Creates `get_user_email()` RPC — may already exist |
| `20250807145109` | (uuid-named) | Early admin-panel migration |
| `20250807151652` | (uuid-named) | Early admin-panel migration |
| `20250807151913` | (uuid-named) | Early admin-panel migration |
| `20250807184945` | (uuid-named) | Early admin-panel migration |
| `20250822120000` | `block_cancelled_event_edits` | Trigger to block edits on cancelled events |
| `20250823104845` | (uuid-named) | Early admin-panel migration |
| `20250826120000` | `create_system_settings` | May overlap with `app_settings` |
| `20250829100000` | `inr_only_currency_standardization` | Standardizes currency to INR |
| `20251104120000` | `allow_null_event_datetime` | Makes `event.date_time` nullable |
| `20260114120000` | `add_external_link_to_events` | Adds `external_link` column to events |

### Resolution options per file

- **Already applied via another migration** → Mark as `superseded`:
  ```sql
  UPDATE migration_tools.migration_registry
  SET review_status = 'superseded', description = 'Covered by consumer-panel migration XXXXX'
  WHERE version = '<version>';
  ```
- **No longer needed** → Mark as `deprecated`:
  ```sql
  UPDATE migration_tools.migration_registry
  SET review_status = 'deprecated', description = 'Feature removed / not needed'
  WHERE version = '<version>';
  ```
- **Still needed** → Apply it, then mark as applied:
  ```sql
  UPDATE migration_tools.migration_registry
  SET applied = true, applied_at = now(), review_status = 'reviewed'
  WHERE version = '<version>';
  ```
