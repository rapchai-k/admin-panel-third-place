/**
 * Frontend social posting service layer.
 *
 * Provides helpers for:
 *  - Generating post text from an event
 *  - Computing idempotency keys (prevents duplicate posts on retry)
 *  - Creating post_jobs rows and triggering the Edge Function chain
 *  - Fetching social_targets and post_jobs for display in the UI
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  SocialTarget,
  PostJob,
  CreatePostJobOptions,
} from './social-posting.types';

// ─────────────────────────────────────────────────────────────────────────────
// Text generation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a default post caption from event data.
 * Admins can override this in the UI before submitting.
 */
export function generatePostText(event: {
  title: string;
  date_time: string | null;
  venue: string;
  description?: string;
  external_link?: string;
}): string {
  const lines: string[] = [];
  lines.push(`📅 ${event.title}`);
  if (event.date_time) {
    const d = new Date(event.date_time);
    lines.push(`🗓 ${d.toLocaleDateString('en-IN', { dateStyle: 'long' })} at ${d.toLocaleTimeString('en-IN', { timeStyle: 'short' })}`);
  }
  lines.push(`📍 ${event.venue}`);
  if (event.description) {
    lines.push('');
    lines.push(event.description.slice(0, 200));
  }
  if (event.external_link) {
    lines.push('');
    lines.push(event.external_link);
  }
  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Scheduling helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Returns an ISO timestamp 5 minutes from now (used for "immediate" posts). */
export function computeImmediateScheduleTime(): string {
  return new Date(Date.now() + 5 * 60 * 1000).toISOString();
}

// ─────────────────────────────────────────────────────────────────────────────
// Idempotency
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Deterministic key that ties one event to one social channel.
 * Prevents duplicate post_jobs if the admin submits twice.
 */
export function computeIdempotencyKey(eventId: string, socialTargetId: string): string {
  return `${eventId}::${socialTargetId}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// DB operations
// ─────────────────────────────────────────────────────────────────────────────

/** Fetch all active social channels for the channel-selection UI. */
export async function fetchSocialTargets(): Promise<SocialTarget[]> {
  const { data, error } = await supabase
    .from('social_targets')
    .select('*')
    .eq('is_active', true)
    .order('provider');
  if (error) throw error;
  return (data ?? []) as SocialTarget[];
}

/** Fetch all post_jobs for a given event (with social_target + media_assets). */
export async function fetchPostJobsForEvent(eventId: string): Promise<PostJob[]> {
  const { data, error } = await supabase
    .from('post_jobs')
    .select('*, social_target:social_targets(*), media_assets(*)')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as PostJob[];
}

/**
 * Create a post_job row + its media_asset rows, then fire the
 * `social-post-publish` Edge Function to start the upload chain.
 * Call this fire-and-forget (don't await in the submit handler).
 */
export async function createPostJob(opts: CreatePostJobOptions): Promise<string> {
  const {
    eventId,
    socialTargetId,
    postText,
    scheduledSendTime,
    mediaSourceUrls,
  } = opts;

  const { data: { user } } = await supabase.auth.getUser();

  // 1. Insert post_job
  const { data: job, error: jobErr } = await supabase
    .from('post_jobs')
    .insert({
      event_id: eventId,
      social_target_id: socialTargetId,
      post_text: postText,
      scheduled_send_time: scheduledSendTime ?? computeImmediateScheduleTime(),
      idempotency_key: computeIdempotencyKey(eventId, socialTargetId),
      created_by: user?.id ?? null,
    })
    .select('id')
    .single();
  if (jobErr) throw jobErr;

  const jobId = job.id as string;

  // 2. Insert media_assets
  if (mediaSourceUrls.length > 0) {
    const assetRows = mediaSourceUrls.map((m, idx) => ({
      post_job_id: jobId,
      source_url: m.url,
      mimetype: m.mimetype,
      sort_order: idx,
    }));
    const { error: assetErr } = await supabase.from('media_assets').insert(assetRows);
    if (assetErr) throw assetErr;
  }

  // 3. Invoke Edge Function (fire-and-forget — do not await response body)
  supabase.functions.invoke('social-post-publish', { body: { post_job_id: jobId } });

  return jobId;
}

/** Retry a failed post_job by invoking the retry Edge Function. */
export async function retryPostJob(postJobId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('social-post-retry', {
    body: { post_job_id: postJobId },
  });
  if (error) throw error;
}

