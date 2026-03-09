/**
 * Hootsuite OAuth2 helpers (frontend-side only).
 *
 * The actual token exchange happens server-side in the
 * `hootsuite-oauth-callback` Supabase Edge Function.
 *
 * Required env vars (set in .env.local / Vercel dashboard):
 *   VITE_HOOTSUITE_CLIENT_ID
 *   VITE_HOOTSUITE_REDIRECT_URI   — must match what's registered in the Hootsuite Developer Portal
 */

const HOOTSUITE_AUTH_ENDPOINT = 'https://platform.hootsuite.com/oauth2/auth';

/**
 * Build the Hootsuite OAuth2 authorization URL.
 * Opens in a popup / new tab so the admin can approve the connection.
 * After approval, Hootsuite redirects to VITE_HOOTSUITE_REDIRECT_URI
 * (the hootsuite-oauth-callback Edge Function URL) with ?code=...
 */
export function buildHootsuiteAuthUrl(): string {
  const clientId = import.meta.env.VITE_HOOTSUITE_CLIENT_ID as string | undefined;
  const redirectUri = import.meta.env.VITE_HOOTSUITE_REDIRECT_URI as string | undefined;

  if (!clientId) {
    throw new Error('VITE_HOOTSUITE_CLIENT_ID is not set. Add it to your .env.local file.');
  }
  if (!redirectUri) {
    throw new Error('VITE_HOOTSUITE_REDIRECT_URI is not set. Add it to your .env.local file.');
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'offline',
  });

  return `${HOOTSUITE_AUTH_ENDPOINT}?${params.toString()}`;
}

/**
 * Open the Hootsuite OAuth consent screen in a centred popup.
 * Returns the popup window reference (can be used to poll for close).
 */
export function openHootsuiteAuthPopup(): Window | null {
  const url = buildHootsuiteAuthUrl();
  const width = 600;
  const height = 700;
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;

  return window.open(
    url,
    'hootsuite_oauth',
    `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`,
  );
}

