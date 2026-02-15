-- Migration: Add recurring events support to events table
-- Created: 2026-02-14
-- Description: Adds columns needed for recurring event templates and child instances.
--   Parent events (is_recurring_parent=true) act as templates and hold recurrence config.
--   Child events are fully independent rows with parent_event_id pointing back to the template.
-- NOTE: This migration is idempotent — safe to re-run if columns/indexes/constraints already exist.

-- 1. Add recurrence columns to events table (idempotent)
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS is_recurring_parent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS parent_event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recurrence_pattern text,
  ADD COLUMN IF NOT EXISTS recurrence_frequency integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS recurrence_days_of_week integer[],
  ADD COLUMN IF NOT EXISTS recurrence_day_of_month integer,
  ADD COLUMN IF NOT EXISTS recurrence_end_type text,
  ADD COLUMN IF NOT EXISTS recurrence_end_date timestamptz,
  ADD COLUMN IF NOT EXISTS recurrence_count integer,
  ADD COLUMN IF NOT EXISTS recurrence_metadata jsonb,
  ADD COLUMN IF NOT EXISTS series_index integer;

-- Add CHECK constraints only if they don't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conrelid = 'public.events'::regclass AND conname = 'events_recurrence_pattern_check'
  ) THEN
    ALTER TABLE public.events ADD CONSTRAINT events_recurrence_pattern_check
      CHECK (recurrence_pattern IN ('daily', 'weekly', 'monthly', 'custom'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conrelid = 'public.events'::regclass AND conname = 'events_recurrence_frequency_check'
  ) THEN
    ALTER TABLE public.events ADD CONSTRAINT events_recurrence_frequency_check
      CHECK (recurrence_frequency > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conrelid = 'public.events'::regclass AND conname = 'events_recurrence_days_of_week_check'
  ) THEN
    ALTER TABLE public.events ADD CONSTRAINT events_recurrence_days_of_week_check
      CHECK (recurrence_days_of_week <@ ARRAY[0,1,2,3,4,5,6]);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conrelid = 'public.events'::regclass AND conname = 'events_recurrence_day_of_month_check'
  ) THEN
    ALTER TABLE public.events ADD CONSTRAINT events_recurrence_day_of_month_check
      CHECK (recurrence_day_of_month BETWEEN 1 AND 31);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conrelid = 'public.events'::regclass AND conname = 'events_recurrence_end_type_check'
  ) THEN
    ALTER TABLE public.events ADD CONSTRAINT events_recurrence_end_type_check
      CHECK (recurrence_end_type IN ('date', 'count', 'never'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conrelid = 'public.events'::regclass AND conname = 'events_recurrence_count_check'
  ) THEN
    ALTER TABLE public.events ADD CONSTRAINT events_recurrence_count_check
      CHECK (recurrence_count > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conrelid = 'public.events'::regclass AND conname = 'events_series_index_check'
  ) THEN
    ALTER TABLE public.events ADD CONSTRAINT events_series_index_check
      CHECK (series_index > 0);
  END IF;
END $$;

-- 2. Index for fast child lookup by parent (idempotent)
CREATE INDEX IF NOT EXISTS idx_events_parent_event_id ON public.events(parent_event_id)
  WHERE parent_event_id IS NOT NULL;

-- 3. Index for filtering out template events in public queries (idempotent)
CREATE INDEX IF NOT EXISTS idx_events_is_recurring_parent ON public.events(is_recurring_parent)
  WHERE is_recurring_parent = true;

-- 4. Constraint: only parent events should have recurrence config populated (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conrelid = 'public.events'::regclass AND conname = 'chk_recurrence_config'
  ) THEN
    ALTER TABLE public.events
      ADD CONSTRAINT chk_recurrence_config CHECK (
        (is_recurring_parent = true AND recurrence_pattern IS NOT NULL)
        OR (is_recurring_parent = false)
      );
  END IF;
END $$;

-- 5. Existing RLS policies apply automatically to new columns (no changes needed)

