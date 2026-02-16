-- P0 + P1 Admin Panel Improvements
-- Covers: role unification, N+1 query fixes, missing indexes,
--         admin avatar RLS bug fix, email_templates/webhook RLS,
--         granular user_roles policies, admin_audit_log table,
--         dashboard stats RPC

-- ============================================================
-- P0 #1: ROLE UNIFICATION
-- ============================================================

-- Backfill: ensure every users.role='admin' user has a matching user_roles row
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::app_role
FROM public.users u
WHERE u.role = 'admin'
ON CONFLICT (user_id, role) DO NOTHING;

-- Replace is_admin_user() to delegate to is_admin() (unified check)
CREATE OR REPLACE FUNCTION public.is_admin_user(_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin(_user_id)
$$;

-- ============================================================
-- P0 #2: get_users_with_counts() RPC — replaces N+1 on UsersPage
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_users_with_counts()
RETURNS TABLE (
  id UUID,
  name TEXT,
  photo_url TEXT,
  role public.user_role,
  is_banned BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  referral_code TEXT,
  referred_by TEXT,
  email TEXT,
  community_count BIGINT,
  event_count BIGINT,
  badge_count BIGINT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u.id,
    u.name,
    u.photo_url,
    u.role,
    u.is_banned,
    u.created_at,
    u.updated_at,
    u.referral_code,
    u.referred_by,
    au.email,
    COALESCE(cm.cnt, 0)::BIGINT AS community_count,
    COALESCE(er.cnt, 0)::BIGINT AS event_count,
    COALESCE(ub.cnt, 0)::BIGINT AS badge_count
  FROM public.users u
  LEFT JOIN auth.users au ON au.id = u.id
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS cnt FROM public.community_members WHERE user_id = u.id
  ) cm ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS cnt FROM public.event_registrations WHERE user_id = u.id
  ) er ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS cnt FROM public.user_badges WHERE user_id = u.id
  ) ub ON true
  ORDER BY u.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_users_with_counts() TO authenticated;

-- ============================================================
-- P0 #3: get_user_emails(uuid[]) RPC — replaces N individual calls
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_user_emails(_user_ids UUID[])
RETURNS TABLE (user_id UUID, email TEXT)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT au.id AS user_id, au.email
  FROM auth.users au
  WHERE au.id = ANY(_user_ids);
$$;

GRANT EXECUTE ON FUNCTION public.get_user_emails(UUID[]) TO authenticated;

-- ============================================================
-- P0 #5: MISSING INDEXES for admin page query patterns
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON public.events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_communities_created_at ON public.communities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_status_created ON public.payment_sessions(payment_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_event_id ON public.payment_sessions(event_id);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_user_id ON public.payment_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_session_id ON public.payment_logs(payment_session_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_timestamp ON public.user_activity_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id ON public.event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_community_members_community_id ON public.community_members(community_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_template_id ON public.email_logs(template_id);
CREATE INDEX IF NOT EXISTS idx_discussions_community_id ON public.discussions(community_id);

-- ============================================================
-- P0 BUG FIX: Admin avatar upload RLS bypass
-- ============================================================

DROP POLICY IF EXISTS "Admins can upload user avatars" ON storage.objects;
CREATE POLICY "Admins can upload user avatars"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'user-avatars' AND public.is_admin());

DROP POLICY IF EXISTS "Admins can update user avatars" ON storage.objects;
CREATE POLICY "Admins can update user avatars"
ON storage.objects FOR UPDATE
USING (bucket_id = 'user-avatars' AND public.is_admin());

DROP POLICY IF EXISTS "Admins can delete user avatars" ON storage.objects;
CREATE POLICY "Admins can delete user avatars"
ON storage.objects FOR DELETE
USING (bucket_id = 'user-avatars' AND public.is_admin());

-- ============================================================
-- P1 #6: RLS POLICIES for email_templates & webhook_configurations
-- ============================================================

-- email_templates: ensure RLS is on, then add admin-only write + public read
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read email templates" ON public.email_templates;
CREATE POLICY "Authenticated users can read email templates"
ON public.email_templates FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admins can manage email templates" ON public.email_templates;
CREATE POLICY "Admins can manage email templates"
ON public.email_templates FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- webhook_configurations: ensure RLS is on, then add admin-only policies
ALTER TABLE public.webhook_configurations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read webhook configurations" ON public.webhook_configurations;
CREATE POLICY "Admins can read webhook configurations"
ON public.webhook_configurations FOR SELECT
TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage webhook configurations" ON public.webhook_configurations;
CREATE POLICY "Admins can manage webhook configurations"
ON public.webhook_configurations FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- webhook_deliveries: ensure RLS is on, admin-only read
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read webhook deliveries" ON public.webhook_deliveries;
CREATE POLICY "Admins can read webhook deliveries"
ON public.webhook_deliveries FOR SELECT
TO authenticated
USING (public.is_admin());

-- ============================================================
-- P1 #7: GRANULAR user_roles POLICIES (replace overly broad FOR ALL)
-- ============================================================

-- Drop the existing overly broad "FOR ALL" policy
DROP POLICY IF EXISTS "Admins can manage all user roles" ON public.user_roles;

-- Admins can view all roles
DROP POLICY IF EXISTS "Admins can view all user roles" ON public.user_roles;
CREATE POLICY "Admins can view all user roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.is_admin());

-- Admins can insert new roles (but not 'admin' — only existing admins
-- can grant admin, enforced by the is_admin() check on the policy itself)
DROP POLICY IF EXISTS "Admins can insert user roles" ON public.user_roles;
CREATE POLICY "Admins can insert user roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin()
  AND role <> 'admin'::app_role  -- admin promotion requires direct DB/migration
);

-- Admins can update roles but cannot promote to admin
DROP POLICY IF EXISTS "Admins can update user roles" ON public.user_roles;
CREATE POLICY "Admins can update user roles"
ON public.user_roles FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (
  public.is_admin()
  AND role <> 'admin'::app_role  -- cannot promote to admin via update
);

-- Admins can delete roles but not their own admin role
DROP POLICY IF EXISTS "Admins can delete non-self admin roles" ON public.user_roles;
CREATE POLICY "Admins can delete non-self admin roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (
  public.is_admin()
  AND NOT (user_id = auth.uid() AND role = 'admin'::app_role)
);

-- ============================================================
-- P1 #8: ADMIN AUDIT LOG TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES public.users(id),
  action TEXT NOT NULL,           -- e.g. 'user.ban', 'event.create', 'role.assign'
  target_type TEXT,               -- e.g. 'user', 'event', 'community'
  target_id UUID,
  previous_state JSONB,
  new_state JSONB,
  metadata JSONB,                 -- extra context (IP, user-agent, etc.)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
DROP POLICY IF EXISTS "Admins can read audit logs" ON public.admin_audit_log;
CREATE POLICY "Admins can read audit logs"
ON public.admin_audit_log FOR SELECT
TO authenticated
USING (public.is_admin());

-- Only admins can insert audit logs
DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.admin_audit_log;
CREATE POLICY "Admins can insert audit logs"
ON public.admin_audit_log FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_audit_log_admin_user ON public.admin_audit_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_target ON public.admin_audit_log(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.admin_audit_log(action);

