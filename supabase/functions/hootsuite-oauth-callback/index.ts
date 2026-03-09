/**
 * Edge Function: hootsuite-oauth-callback
 *
 * Handles the OAuth2 Authorization Code redirect from Hootsuite.
 * Hootsuite calls this URL with ?code=<authorization_code>.
 *
 * Steps:
 *  1. Extract `code` from query params
 *  2. Exchange code for access_token + refresh_token via POST /oauth2/token
 *  3. Upsert into hootsuite_tokens (single-row table)
 *  4. Redirect admin back to the Settings page with ?hootsuite_connected=true
 *
 * On error: redirect with ?hootsuite_error=<message>
 *
 * Required Supabase secrets:
 *   HOOTSUITE_CLIENT_ID, HOOTSUITE_CLIENT_SECRET, HOOTSUITE_REDIRECT_URI
 * Required env (auto-injected):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createAdminClient, HOOTSUITE_API_BASE } from '../_shared/hootsuite.ts';

// The admin settings page URL — redirect target after OAuth completes.
const SETTINGS_URL = `${Deno.env.get('SITE_URL') ?? 'https://app.mythirdplace.com'}/admin/settings`;

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const oauthError = url.searchParams.get('error');

  // Handle Hootsuite-side errors (user denied)
  if (oauthError) {
    const desc = url.searchParams.get('error_description') ?? oauthError;
    return Response.redirect(`${SETTINGS_URL}?hootsuite_error=${encodeURIComponent(desc)}`, 302);
  }

  if (!code) {
    return Response.redirect(
      `${SETTINGS_URL}?hootsuite_error=${encodeURIComponent('No authorization code received')}`,
      302,
    );
  }

  try {
    const clientId = Deno.env.get('HOOTSUITE_CLIENT_ID')!;
    const clientSecret = Deno.env.get('HOOTSUITE_CLIENT_SECRET')!;
    const redirectUri = Deno.env.get('HOOTSUITE_REDIRECT_URI')!;

    // Exchange authorization code for tokens
    const tokenResp = await fetch(`${HOOTSUITE_API_BASE}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!tokenResp.ok) {
      const text = await tokenResp.text();
      throw new Error(`Token exchange failed (${tokenResp.status}): ${text}`);
    }

    const tokens = await tokenResp.json() as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    // Upsert into hootsuite_tokens (only ever one row)
    const db = createAdminClient();
    const { data: existing } = await db
      .from('hootsuite_tokens')
      .select('id')
      .limit(1)
      .single();

    const upsertPayload = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    };

    let upsertErr: { message: string } | null = null;

    if (existing?.id) {
      const { error } = await db
        .from('hootsuite_tokens')
        .update(upsertPayload)
        .eq('id', existing.id);
      upsertErr = error;
    } else {
      const { error } = await db.from('hootsuite_tokens').insert(upsertPayload);
      upsertErr = error;
    }

    if (upsertErr) throw new Error(`DB upsert failed: ${upsertErr.message}`);

    return Response.redirect(`${SETTINGS_URL}?hootsuite_connected=true`, 302);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[hootsuite-oauth-callback]', msg);
    return Response.redirect(
      `${SETTINGS_URL}?hootsuite_error=${encodeURIComponent(msg)}`,
      302,
    );
  }
});

