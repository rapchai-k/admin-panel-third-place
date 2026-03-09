/**
 * Edge Function: social-media-upload (Step 2 — Upload)
 *
 * Receives: { media_asset_id: string }
 *
 * Steps:
 *  1. Fetch media_assets row (has source_url + hootsuite_upload_url)
 *  2. Download file bytes from source_url (Supabase storage public URL)
 *  3. PUT bytes to hootsuite_upload_url
 *  4. Mark asset upload_status → 'uploaded'
 *  5. Check if ALL assets for this post_job are 'uploaded'
 *     - If more remain → invoke social-media-upload for the next pending asset
 *     - If all done   → invoke social-post-schedule
 *  6. On failure → set asset upload_status 'failed' + post_job status 'failed'
 *
 * Required secrets: HOOTSUITE_CLIENT_ID, HOOTSUITE_CLIENT_SECRET
 * Auto-injected: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createAdminClient } from '../_shared/hootsuite.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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
  let media_asset_id: string | undefined;
  try {
    ({ media_asset_id } = await req.json() as { media_asset_id: string });
    if (!media_asset_id) {
      return new Response(JSON.stringify({ error: 'media_asset_id is required' }), { status: 400 });
    }

    const db = createAdminClient();

    // 1. Fetch the media asset row
    const { data: asset, error: assetErr } = await db
      .from('media_assets')
      .select('id, post_job_id, source_url, mimetype, hootsuite_upload_url, upload_status')
      .eq('id', media_asset_id)
      .single();

    if (assetErr || !asset) {
      throw new Error(`media_asset not found: ${assetErr?.message}`);
    }

    if (asset.upload_status === 'uploaded') {
      return new Response(JSON.stringify({ status: 'already_uploaded' }), { status: 200 });
    }

    if (!asset.hootsuite_upload_url) {
      throw new Error('hootsuite_upload_url is missing — run social-post-publish first');
    }

    // 2. Download bytes from Supabase storage
    const fileResp = await fetch(asset.source_url);
    if (!fileResp.ok) {
      throw new Error(`Failed to fetch source file (${fileResp.status}): ${asset.source_url}`);
    }

    // 3. PUT bytes to Hootsuite S3 upload URL
    const uploadResp = await fetch(asset.hootsuite_upload_url, {
      method: 'PUT',
      headers: { 'Content-Type': asset.mimetype },
      body: fileResp.body,
      // @ts-ignore — duplex required for streaming in some runtimes
      duplex: 'half',
    });

    if (!uploadResp.ok) {
      const text = await uploadResp.text();
      throw new Error(`S3 upload failed (${uploadResp.status}): ${text}`);
    }

    // 4. Mark this asset as uploaded
    await db.from('media_assets')
      .update({ upload_status: 'uploaded' })
      .eq('id', media_asset_id);

    // 5. Check remaining assets for this job
    const { data: remaining } = await db
      .from('media_assets')
      .select('id, upload_status')
      .eq('post_job_id', asset.post_job_id)
      .neq('upload_status', 'uploaded');

    const next = (remaining ?? []).find(a => a.upload_status === 'uploading');

    if (next) {
      // More assets to upload — chain to next asset
      await invokeFunction('social-media-upload', { media_asset_id: next.id });
    } else if ((remaining ?? []).length === 0) {
      // All assets uploaded — move to scheduling
      await invokeFunction('social-post-schedule', { post_job_id: asset.post_job_id });
    } else {
      // Some assets still failed — mark job failed
      await db.from('post_jobs')
        .update({ status: 'failed', last_error: 'One or more media assets failed to upload' })
        .eq('id', asset.post_job_id);
    }

    return new Response(JSON.stringify({ ok: true, media_asset_id }), { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[social-media-upload]', msg);

    // Best-effort: mark asset + job as failed
    try {
      if (media_asset_id) {
        const db = createAdminClient();
        const { data: asset } = await db
          .from('media_assets')
          .select('post_job_id')
          .eq('id', media_asset_id)
          .single();
        await db.from('media_assets').update({ upload_status: 'failed' }).eq('id', media_asset_id);
        if (asset?.post_job_id) {
          await db.from('post_jobs')
            .update({ status: 'failed', last_error: msg })
            .eq('id', asset.post_job_id);
        }
      }
    } catch { /* best-effort */ }

    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
});

