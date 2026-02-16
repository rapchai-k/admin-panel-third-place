-- Migration: Add short_code column to events table for URL shortening
-- Created: 2026-02-16
-- Description: Adds a unique short_code column so events can be shared via
--   clean short URLs (e.g. mythirdplace.com/e/Xk9mP2qR) instead of long UUID links.
-- NOTE: Idempotent — safe to re-run.

-- 1. Add the column
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS short_code TEXT;

-- 2. Unique index (partial — only non-null values must be unique)
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_short_code
  ON public.events (short_code)
  WHERE short_code IS NOT NULL;

-- 3. Back-fill existing events with a random 8-char alphanumeric code
--    Uses a DO block so it only runs once (skips rows that already have a code).
DO $$
DECLARE
  _alphabet TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  _code TEXT;
  _row RECORD;
BEGIN
  FOR _row IN
    SELECT id FROM public.events WHERE short_code IS NULL
  LOOP
    -- Generate an 8-char random code
    _code := '';
    FOR i IN 1..8 LOOP
      _code := _code || substr(_alphabet, floor(random() * 62 + 1)::int, 1);
    END LOOP;
    UPDATE public.events SET short_code = _code WHERE id = _row.id;
  END LOOP;
END $$;

COMMENT ON COLUMN public.events.short_code IS 'Short alphanumeric code for clean shareable event URLs';

