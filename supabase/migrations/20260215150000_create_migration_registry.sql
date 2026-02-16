-- Migration Registry
-- Shared coordination table for tracking migrations across admin-panel and consumer-panel repos.
-- Lives in its own schema to avoid cluttering public/app types.

-- ============================================================
-- 1. SCHEMA + TABLE
-- ============================================================

CREATE SCHEMA IF NOT EXISTS migration_tools;

CREATE TABLE IF NOT EXISTS migration_tools.migration_registry (
  version       TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  source_repo   TEXT NOT NULL CHECK (source_repo IN ('admin-panel', 'consumer-panel')),
  checksum      TEXT,
  applied       BOOLEAN NOT NULL DEFAULT false,
  applied_at    TIMESTAMPTZ,
  applied_by    TEXT,
  review_status TEXT CHECK (review_status IS NULL OR review_status IN ('pending_review', 'reviewed', 'deprecated', 'superseded')),
  description   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  migration_tools.migration_registry IS 'Cross-repo migration coordination. Both admin-panel and consumer-panel register migrations here.';
COMMENT ON COLUMN migration_tools.migration_registry.version       IS 'Timestamp prefix of the migration file, e.g. 20260215120000';
COMMENT ON COLUMN migration_tools.migration_registry.source_repo   IS 'Which repo authored the migration';
COMMENT ON COLUMN migration_tools.migration_registry.checksum      IS 'SHA-256 of the .sql file — detects post-apply edits';
COMMENT ON COLUMN migration_tools.migration_registry.review_status IS 'NULL = normal. pending_review = needs verification. deprecated/superseded = no longer needed.';

-- No RLS — accessed only via service_role key in CLI scripts.

-- ============================================================
-- 2. SEED: consumer-panel migrations (27 — all applied)
-- ============================================================

INSERT INTO migration_tools.migration_registry (version, name, source_repo, checksum, applied, applied_at, applied_by) VALUES
  ('20250805130146', '7598aeb3-8932-438d-83ca-dda9e438b2ec', 'consumer-panel', '70ae2eefee00fc3c20ae63639c3819e7a033c726ff0274303303ac96d0f82ee3', true, now(), 'backfill'),
  ('20250806091345', '03ed66d6-2765-48d7-8d7a-ceb2b9a683ff', 'consumer-panel', 'e041cf25dbe1372f5d9db69609222538d9202ea1ca675f92eabfc051f5d226f5', true, now(), 'backfill'),
  ('20250806091954', 'e1dcc2c4-59b4-4726-9e68-c78776e34d17', 'consumer-panel', '3ca1653faa2e225dd213e5518a8a7ce8238a28de8dd7c52f46f48ff531ba3a7c', true, now(), 'backfill'),
  ('20250806094303', '78ae1cb9-931f-4fc9-b854-650295d25d61', 'consumer-panel', '53221842102c48d526ea1f5f3df20509717ea271cd7c752349c8dc36607fe23e', true, now(), 'backfill'),
  ('20250807125309', '8472e517-f1ea-438b-a42e-4e3239d8ba09', 'consumer-panel', '9884d324433710dc1cd66879bf69c8f01648ac6a26f3841a1accbe98929a05ff', true, now(), 'backfill'),
  ('20250807145041', '35dd259a-af84-4245-a83e-488217431607', 'consumer-panel', '2b89eb9ee21653bc8b83d6d7bf63746282e46b09f43586bb115403d73647964d', true, now(), 'backfill'),
  ('20250807145114', '77ff7cdc-c5ad-4821-b07c-7f184d00a5de', 'consumer-panel', 'b0ce610af595bdddcf9572a67122c12d00332842941a5eac19ba7e6dbf6e3087', true, now(), 'backfill'),
  ('20250808133640', '23653d44-208c-43c3-a816-e4e69d03658b', 'consumer-panel', '2235411e456edead7d1247d8ba46c3d165d84a749de6b40f0ef55a08e274620c', true, now(), 'backfill'),
  ('20250823000001', 'add_welcome_email_tracking',            'consumer-panel', 'ef867820a016df6c420d2c3190d51884e3720085825a78b53349809845522061', true, now(), 'backfill'),
  ('20250823000002', 'update_handle_new_user_with_email',     'consumer-panel', '739bec1d1df5c65c8a1038162afbb3ac6493f7da2f853d1bfaf0ef03bd861aa4', true, now(), 'backfill'),
  ('20250823125000', 'fix_email_logs_and_welcome_email',      'consumer-panel', 'df33dfe3df79e6e5d06759a4bb363f9196bab4dc7d2e6b91256dd46099ba8611', true, now(), 'backfill'),
  ('20250823131000', 'ensure_email_logs_exists',              'consumer-panel', 'e5967a2c1455a809abeb886496d4d6095d6f129a3b110a223d1f55f609735a70', true, now(), 'backfill'),
  ('20250825233753', '825c9926-ff4f-4644-87f7-b6ea58eff2b0', 'consumer-panel', '6bdf95456afd6228918fab93b79c86827adc3899d5e4f199dccbff1419407284', true, now(), 'backfill'),
  ('20250908000001', 'add_whatsapp_number_to_users',          'consumer-panel', 'f606e019972ef4920b002266382d6560f3e8bdb09510282001313e5ce986703d', true, now(), 'backfill'),
  ('20250910000001', 'simplify_status_enums',                 'consumer-panel', 'e0d06f453f0a0ae6d6bf9cb8fc84b5f349991da9ac951d42a7616986bdd13222', true, now(), 'backfill'),
  ('20260113201018', 'add_razorpay_fields',                   'consumer-panel', 'a6547718bedf62d7c45ad3c1b235e24ce1ddea109f420bb13a8dd63b7dcb3d50', true, now(), 'backfill'),
  ('20260115201244', 'sync_remote_schema',                    'consumer-panel', 'ab09a94e0f87d815d0a87ba6b49c05b04d7cd93b14abb85df508bf95b7c9bba5', true, now(), 'backfill'),
  ('20260117000001', 'add_event_seo_columns',                 'consumer-panel', '62a9c83d6352e5c90b7523d3eaaa49b9333b583818ab4be5e553511a319e3a47', true, now(), 'backfill'),
  ('20260117120000', 'grant_anon_permissions',                'consumer-panel', 'fe9b90b2b5a82d965156b0f731a44df063cc498948ea7bec7f23bb77f7562dcf', true, now(), 'backfill'),
  ('20260123000001', 'add_app_settings_and_fix_local_user_creation', 'consumer-panel', '105d8dcfd03f1baab043ca603a159a8fa86024fbdf3b97cef3f36453cf0d0a6b', true, now(), 'backfill'),
  ('20260126000001', 'fix_community_member_count',            'consumer-panel', '14fcdd0bdf2bc090d718c1df92bec0b93d48d870733cd645e08a0fecaa2d694a', true, now(), 'backfill'),
  ('20260129000001', 'remove_cashfree_columns',               'consumer-panel', '09409346d1f91c18ab16a8149012236a082b1368d1c6bbb48fd1c4bb0b018646', true, now(), 'backfill'),
  ('20260129100001', 'extend_payment_status_enum',            'consumer-panel', '1a5d5587791d4d4993c8a156122e3e465530fcf04eb4ab96c22f25bebffbcf31', true, now(), 'backfill'),
  ('20260130000001', 'add_community_discussion_seo_columns',  'consumer-panel', '8c97cd0e2129117dd9ec02eb1c0f4d4bf6f908c1df9c85de2424a2cdba931fc2', true, now(), 'backfill'),
  ('20260130100001', 'add_enable_payments_flag',              'consumer-panel', 'c680d2d99d172797f2b4ec6711a9a18f51cb8c2fca98b178c1eea3c69d8eb2e2', true, now(), 'backfill'),
  ('20260130110001', 'grant_service_role_events_access',      'consumer-panel', '307417c984fa4353c311dc97c12a9c646dec1d54aea4176fc965fd2045ed1195', true, now(), 'backfill'),
  ('20260211000001', 'enable_rls_on_all_tables',              'consumer-panel', '1c53f46603b7551bd9dbeb41c0f51aca38a5a78a7a777262d4112c6300dad891', true, now(), 'backfill')
ON CONFLICT (version) DO NOTHING;



-- ============================================================
-- 3. SEED: admin-panel migrations — applied to remote (4)
-- ============================================================

INSERT INTO migration_tools.migration_registry (version, name, source_repo, checksum, applied, applied_at, applied_by) VALUES
  ('20260214120000', 'add_recurring_events',              'admin-panel', '82c3c7409c49d70dd4bcf1b4a800da3902bd13dd8a2a0d7061a89128727d3d8b', true, now(), 'backfill'),
  ('20260215120000', 'p0_p1_admin_panel_improvements',    'admin-panel', '13b5a131f8297016eda517da3cd013d172471d1c87ce525a98ae1c85ba4623d9', true, now(), 'backfill'),
  ('20260215130000', 'p2_storage_and_audit',              'admin-panel', '26c0c8c7e90077ff0f04688c2692401aad5beb20473d5ed85fd2929b87fd8506', true, now(), 'backfill'),
  ('20260215140000', 'seed_email_templates',              'admin-panel', '6a5d8ebc2b8e4f61c635057c4a49f0601d92ec68b1547426921dc0685e16ea61', true, now(), 'backfill')
ON CONFLICT (version) DO NOTHING;

-- ============================================================
-- 4. SEED: admin-panel migrations — LOCAL ONLY, NEVER APPLIED (11)
--    Marked as pending_review. Verify from consumer-panel whether
--    these changes were already applied via other migrations.
-- ============================================================

INSERT INTO migration_tools.migration_registry (version, name, source_repo, checksum, applied, review_status, description) VALUES
  ('20250113120000', 'add_get_user_email_function',                    'admin-panel', '273fe3b8254530e86fa6548d053ecc11c9717420bad2a47a9e587e67f506a156', false, 'pending_review', 'Creates get_user_email() RPC — may already exist from consumer-panel'),
  ('20250807145109', 'e092c50d-220e-4356-bec4-7c50e3864bbb',          'admin-panel', 'e48b82a0f86e79e7437bd969bc2111a93d45d508e831cda1b1e62c0ade10d6ff', false, 'pending_review', 'Early admin-panel migration — needs review'),
  ('20250807151652', '8e8fde97-753e-407e-9498-1e0632162d27',          'admin-panel', 'd1feaf2b1338d5ba8cc3f490181ba3638ae310c9d2f6393c6f8d93eff883f966', false, 'pending_review', 'Early admin-panel migration — needs review'),
  ('20250807151913', 'ad0cb737-7c3e-40fe-b005-645fd701fc25',          'admin-panel', 'a97150572a7b925034f033694d89f419915469a47d04665720380a229b2f4d4a', false, 'pending_review', 'Early admin-panel migration — needs review'),
  ('20250807184945', '5621f24e-0e10-4d18-955a-fddf097f16e5',          'admin-panel', '8fc8cb4f1282636401fc31282474d15d68230e8ff4d70d54e765a3bc9fec6fbd', false, 'pending_review', 'Early admin-panel migration — needs review'),
  ('20250822120000', 'block_cancelled_event_edits',                    'admin-panel', '7b6109909a51fe2af0f02e12c215127f4ef4143b01bebfe64930e0f36578805d', false, 'pending_review', 'Adds trigger to block edits on cancelled events'),
  ('20250823104845', 'e2c0c356-ad7b-4544-a19f-22eaea336167',          'admin-panel', 'edcad34d013215ef996ed2451655f950fda49d21a6746e2de82b7ad75c2cbaff', false, 'pending_review', 'Early admin-panel migration — needs review'),
  ('20250826120000', 'create_system_settings',                         'admin-panel', 'bbffcd771f50f16a4a249780d90a96dd9083168dc273f26da7efa3952659231f', false, 'pending_review', 'Creates system_settings table — may overlap with app_settings'),
  ('20250829100000', 'inr_only_currency_standardization',              'admin-panel', '788288796129512ee1fef85bb5b66e708aa066437a957a11a7f11bde3e596f58', false, 'pending_review', 'Standardizes currency to INR only'),
  ('20251104120000', 'allow_null_event_datetime',                      'admin-panel', '431dd7c030f0025f2266cb6358c98f383e13ed25e55908a1e2119edd9a02db91', false, 'pending_review', 'Makes event date_time nullable'),
  ('20260114120000', 'add_external_link_to_events',                    'admin-panel', 'c4d7f99cfb605b104a0313ecdc0c4aa54bf6028fdf6f0bb8ce626af031d56884', false, 'pending_review', 'Adds external_link column to events table')
ON CONFLICT (version) DO NOTHING;

-- ============================================================
-- 5. SELF-REGISTER this migration
-- ============================================================

INSERT INTO migration_tools.migration_registry (version, name, source_repo, applied, applied_by, description)
VALUES ('20260215150000', 'create_migration_registry', 'admin-panel', true, 'backfill', 'Creates migration_tools schema and registry table')
ON CONFLICT (version) DO NOTHING;