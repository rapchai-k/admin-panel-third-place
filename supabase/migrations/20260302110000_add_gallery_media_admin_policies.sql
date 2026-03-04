-- Migration: Add gallery_media support + admin policies for galleries bucket
-- Created: 2026-03-02
-- Description:
--   - Ensure public.gallery_media exists with expected constraints/indexes
--   - Ensure galleries storage bucket exists
--   - Add admin write policies for gallery_media and storage.objects in galleries bucket
-- NOTE: Idempotent — safe to re-run.

-- 1) gallery_media table
CREATE TABLE IF NOT EXISTS public.gallery_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  community_id UUID REFERENCES public.communities(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  mimetype TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT gallery_media_parent_check CHECK (num_nonnulls(event_id, community_id) = 1)
);

ALTER TABLE public.gallery_media ENABLE ROW LEVEL SECURITY;

-- Ensure ownership constraint exists even if table pre-existed without it.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'gallery_media_parent_check'
      AND conrelid = 'public.gallery_media'::regclass
  ) THEN
    ALTER TABLE public.gallery_media
      ADD CONSTRAINT gallery_media_parent_check
      CHECK (num_nonnulls(event_id, community_id) = 1);
  END IF;
END
$$;

-- 2) gallery_media indexes
CREATE INDEX IF NOT EXISTS idx_gallery_media_event_id ON public.gallery_media(event_id);
CREATE INDEX IF NOT EXISTS idx_gallery_media_community_id ON public.gallery_media(community_id);
CREATE INDEX IF NOT EXISTS idx_gallery_media_event_sort_order ON public.gallery_media(event_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_gallery_media_community_sort_order ON public.gallery_media(community_id, sort_order);

-- 3) updated_at trigger
CREATE OR REPLACE FUNCTION public.update_gallery_media_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_gallery_media_updated_at'
  ) THEN
    CREATE TRIGGER update_gallery_media_updated_at
      BEFORE UPDATE ON public.gallery_media
      FOR EACH ROW
      EXECUTE FUNCTION public.update_gallery_media_updated_at_column();
  END IF;
END
$$;

-- 4) gallery_media RLS policies
DROP POLICY IF EXISTS "Public Read Access" ON public.gallery_media;
CREATE POLICY "Public Read Access"
ON public.gallery_media FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Admins can insert gallery media" ON public.gallery_media;
CREATE POLICY "Admins can insert gallery media"
ON public.gallery_media FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update gallery media" ON public.gallery_media;
CREATE POLICY "Admins can update gallery media"
ON public.gallery_media FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete gallery media" ON public.gallery_media;
CREATE POLICY "Admins can delete gallery media"
ON public.gallery_media FOR DELETE
TO authenticated
USING (public.is_admin());

-- 5) galleries storage bucket + policies
INSERT INTO storage.buckets (id, name, public)
VALUES ('galleries', 'galleries', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Read Access on Galleries" ON storage.objects;
CREATE POLICY "Public Read Access on Galleries"
ON storage.objects FOR SELECT
USING (bucket_id = 'galleries');

DROP POLICY IF EXISTS "Admins can upload gallery media" ON storage.objects;
CREATE POLICY "Admins can upload gallery media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'galleries'
  AND public.is_admin()
  AND LOWER(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'gif', 'webp', 'svg')
);

DROP POLICY IF EXISTS "Admins can update gallery media" ON storage.objects;
CREATE POLICY "Admins can update gallery media"
ON storage.objects FOR UPDATE
USING (bucket_id = 'galleries' AND public.is_admin());

DROP POLICY IF EXISTS "Admins can delete gallery media" ON storage.objects;
CREATE POLICY "Admins can delete gallery media"
ON storage.objects FOR DELETE
USING (bucket_id = 'galleries' AND public.is_admin());
