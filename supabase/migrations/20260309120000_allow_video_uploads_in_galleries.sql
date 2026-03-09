-- Migration: Allow video uploads in galleries storage bucket
-- Created: 2026-03-09
-- Description: Update the storage policy for gallery uploads to accept video file extensions
-- in addition to image extensions.

DROP POLICY IF EXISTS "Admins can upload gallery media" ON storage.objects;
CREATE POLICY "Admins can upload gallery media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'galleries'
  AND public.is_admin()
  AND LOWER(storage.extension(name)) IN (
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg',
    'mp4', 'mov', 'webm', 'avi', 'mkv'
  )
);

