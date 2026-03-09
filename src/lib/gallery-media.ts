import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type GalleryMediaRow = Database['public']['Tables']['gallery_media']['Row'];

export type GalleryEntity = 'events' | 'communities';

export type GalleryDraftItem =
  | {
      key: string;
      type: 'existing';
      id: string;
      previewUrl: string;
      name: string;
      mimetype: string;
    }
  | {
      key: string;
      type: 'new';
      file: File;
      previewUrl: string;
      name: string;
      mimetype: string;
    };

export const isVideoMimetype = (mimetype: string): boolean =>
  mimetype.startsWith('video/');

export interface GalleryDraftState {
  items: GalleryDraftItem[];
  removedExistingIds: string[];
}

const GALLERIES_BUCKET = 'galleries';

export const createEmptyGalleryDraftState = (): GalleryDraftState => ({
  items: [],
  removedExistingIds: [],
});

const sanitizeFilename = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'file';

const extractGalleryPathFromUrl = (url: string): string | null => {
  const markers = [
    `/storage/v1/object/public/${GALLERIES_BUCKET}/`,
    `/storage/v1/object/sign/${GALLERIES_BUCKET}/`,
  ];

  for (const marker of markers) {
    const index = url.indexOf(marker);
    if (index !== -1) {
      const value = url.slice(index + marker.length);
      return decodeURIComponent(value.split('?')[0]);
    }
  }

  return null;
};

const buildUploadPath = (entity: GalleryEntity, entityId: string, filename: string): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  return `${entity}/${entityId}/${timestamp}-${random}-${sanitizeFilename(filename)}`;
};

const uploadGalleryFile = async (
  entity: GalleryEntity,
  entityId: string,
  file: File,
): Promise<string> => {
  const path = buildUploadPath(entity, entityId, file.name);

  const { error: uploadError } = await supabase.storage
    .from(GALLERIES_BUCKET)
    .upload(path, file);

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(GALLERIES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
};

export const loadGalleryMediaForEntity = async (
  entity: GalleryEntity,
  entityId: string,
): Promise<GalleryMediaRow[]> => {
  const key = entity === 'events' ? 'event_id' : 'community_id';

  const { data, error } = await supabase
    .from('gallery_media')
    .select('*')
    .eq(key, entityId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
};

export const syncGalleryMedia = async ({
  entity,
  entityId,
  draft,
  existingMedia,
}: {
  entity: GalleryEntity;
  entityId: string;
  draft: GalleryDraftState;
  existingMedia: GalleryMediaRow[];
}) => {
  const removedRows = existingMedia.filter((row) => draft.removedExistingIds.includes(row.id));

  if (removedRows.length > 0) {
    const storagePaths = removedRows
      .map((row) => extractGalleryPathFromUrl(row.media_url))
      .filter((path): path is string => Boolean(path));

    if (storagePaths.length > 0) {
      const { error: removeStorageError } = await supabase.storage
        .from(GALLERIES_BUCKET)
        .remove(storagePaths);
      if (removeStorageError) throw removeStorageError;
    }

    const { error: removeRowsError } = await supabase
      .from('gallery_media')
      .delete()
      .in('id', removedRows.map((row) => row.id));

    if (removeRowsError) throw removeRowsError;
  }

  const existingById = new Map(existingMedia.map((item) => [item.id, item]));

  for (let index = 0; index < draft.items.length; index += 1) {
    const item = draft.items[index];

    if (item.type === 'existing') {
      const existing = existingById.get(item.id);
      if (!existing || existing.sort_order === index) continue;

      const { error: updateError } = await supabase
        .from('gallery_media')
        .update({ sort_order: index })
        .eq('id', item.id);

      if (updateError) throw updateError;
      continue;
    }

    const mediaUrl = await uploadGalleryFile(entity, entityId, item.file);

    const { error: insertError } = await supabase
      .from('gallery_media')
      .insert({
        event_id: entity === 'events' ? entityId : null,
        community_id: entity === 'communities' ? entityId : null,
        media_url: mediaUrl,
        mimetype: item.file.type || 'application/octet-stream',
        sort_order: index,
      });

    if (insertError) throw insertError;
  }
};
