/**
 * Edge Function: hootsuite-profiles
 *
 * Proxies GET /v1/socialProfiles from Hootsuite so admins can discover
 * available social channels for populating the social_targets table.
 *
 * Returns: Array of social profile objects from Hootsuite.
 * The admin uses this list to get hootsuite_social_profile_id values
 * and add them to the social_targets table via the Settings page.
 *
 * Required secrets: HOOTSUITE_CLIENT_ID, HOOTSUITE_CLIENT_SECRET
 * Auto-injected: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createAdminClient, getHootsuiteHeaders, HOOTSUITE_API_BASE } from '../_shared/hootsuite.ts';

Deno.serve(async (_req: Request) => {
  try {
    const db = createAdminClient();
    const headers = await getHootsuiteHeaders(db);

    const resp = await fetch(`${HOOTSUITE_API_BASE}/v1/socialProfiles`, {
      headers,
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Hootsuite GET /v1/socialProfiles failed (${resp.status}): ${text}`);
    }

    const json = await resp.json() as { data: unknown[] };

    return new Response(JSON.stringify({ data: json.data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[hootsuite-profiles]', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

