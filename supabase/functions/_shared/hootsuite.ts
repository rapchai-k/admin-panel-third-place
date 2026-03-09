/**
 * Shared Hootsuite helper for all Edge Functions.
 *
 * Provides:
 *  - HOOTSUITE_API_BASE constant
 *  - createAdminClient() — Supabase client with service_role key (bypasses RLS)
 *  - getHootsuiteHeaders() — reads hootsuite_tokens, auto-refreshes if expired,
 *    returns { Authorization: "Bearer <token>" }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const HOOTSUITE_API_BASE = 'https://platform.hootsuite.com';

// ─────────────────────────────────────────────────────────────────────────────
// Supabase admin client (service_role — bypasses RLS)
// ─────────────────────────────────────────────────────────────────────────────

export function createAdminClient() {
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(url, key);
}

// ─────────────────────────────────────────────────────────────────────────────
// Token management with auto-refresh
// ─────────────────────────────────────────────────────────────────────────────

interface TokenRow {
  id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

async function refreshAccessToken(
  db: ReturnType<typeof createAdminClient>,
  token: TokenRow,
): Promise<string> {
  const clientId = Deno.env.get('HOOTSUITE_CLIENT_ID')!;
  const clientSecret = Deno.env.get('HOOTSUITE_CLIENT_SECRET')!;

  const resp = await fetch(`${HOOTSUITE_API_BASE}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: token.refresh_token,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Token refresh failed (${resp.status}): ${text}`);
  }

  const json = await resp.json() as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  const expiresAt = new Date(Date.now() + json.expires_in * 1000).toISOString();

  const { error } = await db
    .from('hootsuite_tokens')
    .update({
      access_token: json.access_token,
      refresh_token: json.refresh_token,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', token.id);

  if (error) throw new Error(`Failed to persist refreshed token: ${error.message}`);

  return json.access_token;
}

/**
 * Returns { Authorization: "Bearer <access_token>" }.
 * Automatically refreshes the token if it expires within the next 60 seconds.
 */
export async function getHootsuiteHeaders(
  db: ReturnType<typeof createAdminClient>,
): Promise<{ Authorization: string }> {
  const { data: tokens, error } = await db
    .from('hootsuite_tokens')
    .select('id, access_token, refresh_token, expires_at')
    .limit(1)
    .single();

  if (error || !tokens) {
    throw new Error('No Hootsuite token found. Connect Hootsuite in System Settings first.');
  }

  const token = tokens as TokenRow;
  const expiresAt = new Date(token.expires_at).getTime();
  const now = Date.now();
  const bufferMs = 60 * 1000; // refresh 60 s before expiry

  let accessToken = token.access_token;

  if (expiresAt - now < bufferMs) {
    accessToken = await refreshAccessToken(db, token);
  }

  return { Authorization: `Bearer ${accessToken}` };
}

