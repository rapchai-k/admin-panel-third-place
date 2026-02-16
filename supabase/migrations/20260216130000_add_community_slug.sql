-- Migration: Add slug column to communities table
-- Created: 2026-02-16
-- Description: Adds a unique slug column so communities can be referenced via
--   clean URLs (e.g. mythirdplace.com/c/rap-hip-hop-and-cool-music) instead of UUIDs.
-- NOTE: Idempotent — safe to re-run.

-- 1. Add the column
ALTER TABLE public.communities
  ADD COLUMN IF NOT EXISTS slug TEXT;

-- 2. Unique index (partial — only non-null values must be unique)
CREATE UNIQUE INDEX IF NOT EXISTS idx_communities_slug
  ON public.communities (slug)
  WHERE slug IS NOT NULL;

-- 3. Back-fill existing communities with slugs derived from their name
DO $$
DECLARE
  _row RECORD;
  _slug TEXT;
  _base_slug TEXT;
  _counter INT;
BEGIN
  FOR _row IN
    SELECT id, name FROM public.communities WHERE slug IS NULL
  LOOP
    -- Convert name to URL-friendly slug:
    --   lowercase, replace non-alphanum with hyphens, collapse multi-hyphens, trim hyphens
    _base_slug := lower(_row.name);
    _base_slug := regexp_replace(_base_slug, '[^a-z0-9]+', '-', 'g');
    _base_slug := regexp_replace(_base_slug, '-+', '-', 'g');
    _base_slug := trim(both '-' from _base_slug);

    -- If empty after sanitisation, fallback to id prefix
    IF _base_slug = '' OR _base_slug IS NULL THEN
      _base_slug := substr(_row.id::text, 1, 8);
    END IF;

    -- Ensure uniqueness: append -2, -3, … if slug already taken
    _slug := _base_slug;
    _counter := 2;
    WHILE EXISTS (SELECT 1 FROM public.communities WHERE slug = _slug AND id != _row.id) LOOP
      _slug := _base_slug || '-' || _counter;
      _counter := _counter + 1;
    END LOOP;

    UPDATE public.communities SET slug = _slug WHERE id = _row.id;
  END LOOP;
END $$;

COMMENT ON COLUMN public.communities.slug IS 'URL-friendly slug derived from community name, used for clean shareable URLs';

