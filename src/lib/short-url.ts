/**
 * Short URL utilities for generating clean, shareable event links.
 *
 * Instead of exposing raw UUIDs (e.g. /events/f3a2b1c4-...) to admins and
 * end-users, we generate an 8-character alphanumeric code that maps 1:1
 * to an event row.  The consumer panel resolves `/e/{code}` to the full
 * event detail page.
 */

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const CODE_LENGTH = 8;

/**
 * Generate a cryptographically-random short code (8 chars, [A-Za-z0-9]).
 *
 * 62^8 ≈ 218 trillion possible codes — collision probability is negligible
 * even at millions of events.  The DB column has a UNIQUE constraint as a
 * safety net.
 */
export function generateShortCode(): string {
  const values = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
  return Array.from(values)
    .map((v) => ALPHABET[v % ALPHABET.length])
    .join('');
}

/**
 * The consumer-facing base URL.  Points to the consumer panel domain.
 * Can be overridden via the VITE_CONSUMER_URL env var for local dev.
 */
const CONSUMER_BASE =
  (import.meta.env.VITE_CONSUMER_URL as string | undefined)?.replace(/\/+$/, '') ??
  'https://mythirdplace.rapchai.com';

/**
 * Build the full short URL for an event, e.g.
 *   https://mythirdplace.rapchai.com/e/Xk9mP2qR
 */
export function buildEventShortUrl(shortCode: string): string {
  return `${CONSUMER_BASE}/e/${shortCode}`;
}

/* ------------------------------------------------------------------ */
/*  Community slug helpers                                            */
/* ------------------------------------------------------------------ */

/**
 * Generate a URL-friendly slug from a community name.
 *
 * "Rap & Hip Hop and Cool Music" → "rap-hip-hop-and-cool-music"
 *
 * Rules:
 *   1. Lowercase
 *   2. Replace any non-alphanumeric character (including spaces) with a hyphen
 *   3. Collapse consecutive hyphens
 *   4. Trim leading/trailing hyphens
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Build the full community URL, e.g.
 *   https://mythirdplace.rapchai.com/c/rap-hip-hop-and-cool-music
 */
export function buildCommunityUrl(slug: string): string {
  return `${CONSUMER_BASE}/c/${slug}`;
}

