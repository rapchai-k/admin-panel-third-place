/**
 * Edge Function: social-post-retry
 *
 * Receives: { post_job_id: string }
 *
 * Smart retry — inspects current state and resumes from the correct step:
 *  - If any asset is not 'uploaded' → re-runs social-post-publish (skips already-uploaded assets)
 *  - If all assets are 'uploaded'   → jumps straight to social-post-schedule
 *
 * Guards:
 *  - Only accepts jobs with status 'failed'
 *  - Rejects if attempts >= 3
 *
 * Required secrets: HOOTSUITE_CLIENT_ID, HOOTSUITE_CLIENT_SECRET
 * Auto-injected: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createAdminClient } from '../_shared/hootsuite.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const MAX_ATTEMPTS = 3;

async function invokeFunction(name: string, body: Record<string, unknown>) {
  await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_ROLE}`,
    },
    body: JSON.stringify(body),
  });
}

Deno.serve(async (req: Request) => {
  let post_job_id: string | undefined;
  try {
    ({ post_job_id } = await req.json() as { post_job_id: string });
    if (!post_job_id) {
      return new Response(JSON.stringify({ error: 'post_job_id is required' }), { status: 400 });
    }

    const db = createAdminClient();

    // Fetch job + assets
    const { data: job, error: jobErr } = await db
      .from('post_jobs')
      .select('id, status, attempts, media_assets(id, upload_status, hootsuite_media_id)')
      .eq('id', post_job_id)
      .single();

    if (jobErr || !job) {
      throw new Error(`post_job not found: ${jobErr?.message}`);
    }

    // Guard: only retry failed jobs
    if (job.status !== 'failed') {
      return new Response(
        JSON.stringify({ error: `Cannot retry job with status '${job.status}'` }),
        { status: 422 },
      );
    }

    // Guard: max attempts
    if ((job.attempts ?? 0) >= MAX_ATTEMPTS) {
      return new Response(
        JSON.stringify({ error: `Max retry attempts (${MAX_ATTEMPTS}) reached` }),
        { status: 422 },
      );
    }

    // Increment attempts, reset status to 'pending' so downstream functions accept it
    await db.from('post_jobs').update({
      attempts: (job.attempts ?? 0) + 1,
      status: 'pending',
      last_error: null,
    }).eq('id', post_job_id);

    const assets = (job.media_assets ?? []) as Array<{
      id: string;
      upload_status: string;
      hootsuite_media_id: string | null;
    }>;

    const notUploaded = assets.filter(a => a.upload_status !== 'uploaded');

    if (notUploaded.length > 0) {
      // Reset failed assets so publish re-registers them with Hootsuite
      const failedAssetIds = notUploaded
        .filter(a => a.upload_status === 'failed')
        .map(a => a.id);

      if (failedAssetIds.length > 0) {
        await db.from('media_assets')
          .update({
            upload_status: 'pending',
            hootsuite_media_id: null,
            hootsuite_upload_url: null,
          })
          .in('id', failedAssetIds);
      }

      // Resume from publish (will skip already-uploaded assets)
      await invokeFunction('social-post-publish', { post_job_id });
    } else {
      // All assets already uploaded — jump to scheduling
      await invokeFunction('social-post-schedule', { post_job_id });
    }

    return new Response(
      JSON.stringify({ ok: true, post_job_id, resumed_from: notUploaded.length > 0 ? 'publish' : 'schedule' }),
      { status: 200 },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[social-post-retry]', msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
});

