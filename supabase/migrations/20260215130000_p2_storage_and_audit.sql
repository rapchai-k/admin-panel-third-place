-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  P2 #15a  Storage upload file-type restrictions                     ║
-- ║  Restrict community-images and event-images to image-only uploads   ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- Drop existing INSERT policies that lack file-type validation
DROP POLICY IF EXISTS "Admins can upload community images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload event images" ON storage.objects;

-- Recreate with file-extension validation
CREATE POLICY "Admins can upload community images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'community-images'
  AND get_user_role() = 'admin'::user_role
  AND LOWER(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'gif', 'webp', 'svg')
);

CREATE POLICY "Admins can upload event images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'event-images'
  AND get_user_role() = 'admin'::user_role
  AND LOWER(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'gif', 'webp', 'svg')
);

