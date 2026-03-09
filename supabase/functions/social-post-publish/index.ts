/**
 * Edge Function: social-post-publish (Step 1 — Init)
 *
 * Receives: { post_job_id: string }
 *
 * Steps:
 *  1. Fetch post_job + media_assets from DB
 *  2. Set post_job status → 'uploading'
 *  3. For each pending media_asset: POST /v1/media → get mediaId + uploadUrl
 *  4. Save mediaId + uploadUrl to each asset, set upload_status → 'uploading'
 *  5a. If has media → invoke social-media-upload for the first asset
 *  5b. If no media  → invoke social-post-schedule directly
 *
 * Required secrets: HOOTSUITE_CLIENT_ID, HOOTSUITE_CLIENT_SECRET
 * Auto-injected: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createAdminClient, getHootsuiteHeaders, HOOTSUITE_API_BASE } from '../_shared/hootsuite.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

/** Invoke another Edge Function (fire-and-forget) */
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
  try {
    const { post_job_id } = await req.json() as { post_job_id: string };
    if (!post_job_id) {
      return new Response(JSON.stringify({ error: 'post_job_id is required' }), { status: 400 });
    }

    const db = createAdminClient();

    // 1. Fetch job + media_assets
    const { data: job, error: jobErr } = await db
      .from('post_jobs')
      .select('*, media_assets(*), social_target:social_targets(*)')
      .eq('id', post_job_id)
      .single();

    if (jobErr || !job) {
      throw new Error(`post_job not found: ${jobErr?.message}`);
    }

    // Prevent re-processing already completed jobs
    if (job.status === 'scheduled') {
      return new Response(JSON.stringify({ status: 'already_scheduled' }), { status: 200 });
    }

    // 2. Set post_job status → uploading
    await db.from('post_jobs').update({ status: 'uploading' }).eq('id', post_job_id);

    const assets = (job.media_assets ?? []) as Array<{
      id: string;
      mimetype: string;
      upload_status: string;
    }>;

    const pendingAssets = assets.filter(a => a.upload_status === 'pending');

    // 3. Register each pending asset with Hootsuite → get mediaId + uploadUrl
    if (pendingAssets.length > 0) {
      const headers = await getHootsuiteHeaders(db);

      for (const asset of pendingAssets) {
        const mediaResp = await fetch(`${HOOTSUITE_API_BASE}/v1/media`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ mimeType: asset.mimetype }),
        });

        if (!mediaResp.ok) {
          const text = await mediaResp.text();
          throw new Error(`Hootsuite POST /v1/media failed (${mediaResp.status}): ${text}`);
        }

        const { data: mediaData } = await mediaResp.json() as {
          data: { id: string; uploadUrl: string };
        };

        // 4. Persist mediaId + uploadUrl
        await db.from('media_assets').update({
          hootsuite_media_id: mediaData.id,
          hootsuite_upload_url: mediaData.uploadUrl,
          upload_status: 'uploading',
        }).eq('id', asset.id);
      }

      // 5a. Kick off upload for the first pending asset
      await invokeFunction('social-media-upload', { media_asset_id: pendingAssets[0].id });
    } else {
      // 5b. No media → schedule directly
      await invokeFunction('social-post-schedule', { post_job_id });
    }

    return new Response(JSON.stringify({ ok: true, post_job_id }), { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[social-post-publish]', msg);

    // Mark job as failed
    try {
      const { post_job_id } = await (req.clone().json()) as { post_job_id?: string };
      if (post_job_id) {
        const db = createAdminClient();
        await db.from('post_jobs').update({ status: 'failed', last_error: msg }).eq('id', post_job_id);
      }
    } catch { /* best-effort */ }

    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
});

