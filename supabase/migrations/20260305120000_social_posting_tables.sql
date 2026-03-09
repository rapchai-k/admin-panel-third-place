-- Migration: Social posting tables for Hootsuite integration
-- Created: 2026-03-05
-- Description:
--   - social_targets  : Hootsuite social profile channels (LinkedIn, Instagram, etc.)
--   - post_jobs       : One row per (event, channel) posting attempt with status machine
--   - media_assets    : Media files attached to a post_job, with per-asset upload tracking
--   - hootsuite_tokens: OAuth2 access + refresh tokens (admin-only, RLS enforced)
-- NOTE: gallery_media table and galleries bucket already exist — do not recreate them.
-- NOTE: Idempotent — safe to re-run.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) social_targets
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.social_targets (
  id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider                    TEXT        NOT NULL,  -- 'linkedin' | 'instagram' | 'twitter'
  profile_name                TEXT        NOT NULL,
  hootsuite_social_profile_id TEXT        NOT NULL UNIQUE,
  is_active                   BOOLEAN     NOT NULL DEFAULT true,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.social_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage social targets" ON public.social_targets;
CREATE POLICY "Admins can manage social targets"
ON public.social_targets FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_social_targets_active ON public.social_targets(is_active);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) post_jobs
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.post_jobs (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id             UUID        NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  social_target_id     UUID        NOT NULL REFERENCES public.social_targets(id),
  status               TEXT        NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending','uploading','uploaded','scheduled','failed')),
  post_text            TEXT,
  scheduled_send_time  TIMESTAMPTZ,
  hootsuite_message_id TEXT,
  idempotency_key      TEXT        NOT NULL,
  attempts             INTEGER     NOT NULL DEFAULT 0,
  last_error           TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by           UUID        REFERENCES auth.users(id),
  CONSTRAINT post_jobs_idempotency_key_unique UNIQUE (idempotency_key)
);

ALTER TABLE public.post_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage post jobs" ON public.post_jobs;
CREATE POLICY "Admins can manage post jobs"
ON public.post_jobs FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_post_jobs_event_id        ON public.post_jobs(event_id);
CREATE INDEX IF NOT EXISTS idx_post_jobs_status          ON public.post_jobs(status);
CREATE INDEX IF NOT EXISTS idx_post_jobs_social_target   ON public.post_jobs(social_target_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) media_assets
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.media_assets (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_job_id          UUID        NOT NULL REFERENCES public.post_jobs(id) ON DELETE CASCADE,
  source_url           TEXT        NOT NULL,  -- Supabase storage public URL
  mimetype             TEXT        NOT NULL,
  hootsuite_media_id   TEXT,                  -- returned by POST /v1/media
  hootsuite_upload_url TEXT,                  -- S3 upload URL returned by POST /v1/media
  upload_status        TEXT        NOT NULL DEFAULT 'pending'
                         CHECK (upload_status IN ('pending','uploading','uploaded','failed')),
  sort_order           INTEGER     NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage media assets" ON public.media_assets;
CREATE POLICY "Admins can manage media assets"
ON public.media_assets FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_media_assets_post_job_id     ON public.media_assets(post_job_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_upload_status   ON public.media_assets(upload_status);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4) hootsuite_tokens  (single-row table; admin-only)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hootsuite_tokens (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token  TEXT        NOT NULL,
  refresh_token TEXT        NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by    UUID        REFERENCES auth.users(id)
);

ALTER TABLE public.hootsuite_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage hootsuite tokens" ON public.hootsuite_tokens;
CREATE POLICY "Admins can manage hootsuite tokens"
ON public.hootsuite_tokens FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- 5) updated_at triggers (shared helper reused across all 4 tables)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['social_targets','post_jobs','media_assets','hootsuite_tokens']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgname = 'trg_' || tbl || '_updated_at'
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER trg_%I_updated_at
         BEFORE UPDATE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
        tbl, tbl
      );
    END IF;
  END LOOP;
END
$$;

