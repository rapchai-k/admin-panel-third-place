/**
 * TypeScript interfaces for the social posting feature.
 * These mirror the DB schema defined in 20260305120000_social_posting_tables.sql.
 */

export type PostJobStatus = 'pending' | 'uploading' | 'uploaded' | 'scheduled' | 'failed';
export type MediaUploadStatus = 'pending' | 'uploading' | 'uploaded' | 'failed';
export type SocialProvider = 'linkedin' | 'instagram' | 'twitter';

export interface SocialTarget {
  id: string;
  provider: SocialProvider | string;
  profile_name: string;
  hootsuite_social_profile_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MediaAsset {
  id: string;
  post_job_id: string;
  source_url: string;
  mimetype: string;
  hootsuite_media_id: string | null;
  hootsuite_upload_url: string | null;
  upload_status: MediaUploadStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PostJob {
  id: string;
  event_id: string;
  social_target_id: string;
  status: PostJobStatus;
  post_text: string | null;
  scheduled_send_time: string | null;
  hootsuite_message_id: string | null;
  idempotency_key: string;
  attempts: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Joined relations (optional, populated by fetchPostJobsForEvent)
  social_target?: SocialTarget;
  media_assets?: MediaAsset[];
}

export interface HootsuiteToken {
  id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  updated_at: string;
  updated_by: string | null;
}

/** Options passed to createPostJob */
export interface CreatePostJobOptions {
  eventId: string;
  socialTargetId: string;
  postText: string;
  scheduledSendTime: string | null; // ISO string; null = immediate (5 min from now)
  mediaSourceUrls: Array<{ url: string; mimetype: string }>;
}

export type PostScheduleMode = 'immediate' | 'custom';

