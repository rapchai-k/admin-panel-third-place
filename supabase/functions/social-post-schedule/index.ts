/**
 * Edge Function: social-post-schedule (Step 3 — Schedule)
 *
 * Receives: { post_job_id: string }
 *
 * Steps:
 *  1. Fetch post_job + media_assets + social_target from DB
 *  2. Verify all media assets are 'uploaded'
 *  3. Build Hootsuite POST /v1/messages payload
 *  4. Call Hootsuite API to schedule the post
 *  5. Store hootsuite_message_id, set post_job status → 'scheduled'
 *  6. On failure → set status 'failed' with error message
 *
 * Required secrets: HOOTSUITE_CLIENT_ID, HOOTSUITE_CLIENT_SECRET
 * Auto-injected: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createAdminClient, getHootsuiteHeaders, HOOTSUITE_API_BASE } from '../_shared/hootsuite.ts';

Deno.serve(async (req: Request) => {
  let post_job_id: string | undefined;
  try {
    ({ post_job_id } = await req.json() as { post_job_id: string });
    if (!post_job_id) {
      return new Response(JSON.stringify({ error: 'post_job_id is required' }), { status: 400 });
    }

    const db = createAdminClient();

    // 1. Fetch job with related data
    const { data: job, error: jobErr } = await db
      .from('post_jobs')
      .select('*, media_assets(*), social_target:social_targets(hootsuite_social_profile_id)')
      .eq('id', post_job_id)
      .single();

    if (jobErr || !job) {
      throw new Error(`post_job not found: ${jobErr?.message}`);
    }

    if (job.status === 'scheduled') {
      return new Response(JSON.stringify({ status: 'already_scheduled' }), { status: 200 });
    }

    const assets = (job.media_assets ?? []) as Array<{
      hootsuite_media_id: string | null;
      upload_status: string;
    }>;

    // 2. Verify all assets uploaded
    const notUploaded = assets.filter(a => a.upload_status !== 'uploaded');
    if (notUploaded.length > 0) {
      throw new Error(`${notUploaded.length} asset(s) not yet uploaded — cannot schedule`);
    }

    const socialProfileId = (job.social_target as { hootsuite_social_profile_id: string })
      ?.hootsuite_social_profile_id;
    if (!socialProfileId) {
      throw new Error('social_target has no hootsuite_social_profile_id');
    }

    // 3. Build POST /v1/messages payload
    const mediaIds = assets
      .filter(a => a.hootsuite_media_id)
      .map(a => ({ id: a.hootsuite_media_id as string }));

    const scheduledTime = job.scheduled_send_time ?? new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const payload: Record<string, unknown> = {
      text: job.post_text ?? '',
      socialProfileIds: [socialProfileId],
      scheduledSendTime: scheduledTime,
    };

    if (mediaIds.length > 0) {
      payload.media = mediaIds;
    }

    // 4. Call Hootsuite API
    const headers = await getHootsuiteHeaders(db);
    const msgResp = await fetch(`${HOOTSUITE_API_BASE}/v1/messages`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!msgResp.ok) {
      const text = await msgResp.text();
      throw new Error(`Hootsuite POST /v1/messages failed (${msgResp.status}): ${text}`);
    }

    const { data: msgData } = await msgResp.json() as { data: { id: string } };

    // 5. Update post_job → scheduled
    await db.from('post_jobs').update({
      status: 'scheduled',
      hootsuite_message_id: msgData.id,
      last_error: null,
    }).eq('id', post_job_id);

    return new Response(
      JSON.stringify({ ok: true, post_job_id, hootsuite_message_id: msgData.id }),
      { status: 200 },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[social-post-schedule]', msg);

    try {
      if (post_job_id) {
        const db = createAdminClient();
        await db.from('post_jobs')
          .update({ status: 'failed', last_error: msg })
          .eq('id', post_job_id);
      }
    } catch { /* best-effort */ }

    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
});

