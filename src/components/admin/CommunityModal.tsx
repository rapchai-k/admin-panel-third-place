import React, { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { logAdminAction } from '@/lib/admin-audit';
import { AdminActions, AdminTargets } from '@/lib/admin-events';
import { generateSlug } from '@/lib/short-url';
import { MultiFileUpload } from '@/components/ui/multi-file-upload';
import {
  createEmptyGalleryDraftState,
  type GalleryDraftState,
  type GalleryMediaRow,
  loadGalleryMediaForEntity,
  syncGalleryMedia,
} from '@/lib/gallery-media';

const communitySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  city: z.string().min(1, 'City is required').max(50, 'City must be less than 50 characters'),
  description: z.string().optional(),
});

type CommunityFormData = z.infer<typeof communitySchema>;

interface Community {
  id: string;
  name: string;
  city: string;
  description?: string;
}

interface CommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  community?: Community;
}

export function CommunityModal({ isOpen, onClose, onSuccess, community }: CommunityModalProps) {
  const { toast } = useToast();
  const isEditing = !!community;
  const [existingMedia, setExistingMedia] = useState<GalleryMediaRow[]>([]);
  const [galleryDraft, setGalleryDraft] = useState<GalleryDraftState>(createEmptyGalleryDraftState());
  const [galleryResetKey, setGalleryResetKey] = useState(0);

  const form = useForm<CommunityFormData>({
    resolver: zodResolver(communitySchema),
    defaultValues: {
      name: community?.name || '',
      city: community?.city || '',
      description: community?.description || '',
    },
  });

  const loadCommunityMedia = async (communityId: string) => {
    const rows = await loadGalleryMediaForEntity('communities', communityId);
    setExistingMedia(rows);
    setGalleryResetKey((value) => value + 1);
  };

  React.useEffect(() => {
    if (!isOpen) return;

    form.reset({
      name: community?.name || '',
      city: community?.city || '',
      description: community?.description || '',
    });

    setGalleryDraft(createEmptyGalleryDraftState());

    if (community?.id) {
      void loadCommunityMedia(community.id);
    } else {
      setExistingMedia([]);
      setGalleryResetKey((value) => value + 1);
    }
  }, [community, isOpen, form]);

  const onGalleryChange = useCallback((value: GalleryDraftState) => {
    setGalleryDraft(value);
  }, []);

  const onSubmit = async (data: CommunityFormData) => {
    try {
      let communityId: string | null = null;

      if (isEditing) {
        const updatePayload: Record<string, unknown> = {
          name: data.name,
          city: data.city,
          description: data.description || null,
        };

        if (data.name !== community.name) {
          updatePayload.slug = generateSlug(data.name);
        }

        const { error } = await supabase
          .from('communities')
          .update(updatePayload)
          .eq('id', community.id);

        if (error) throw error;
        communityId = community.id;

        await syncGalleryMedia({
          entity: 'communities',
          entityId: community.id,
          draft: galleryDraft,
          existingMedia,
        });

        logAdminAction({
          action: AdminActions.COMMUNITY_UPDATE,
          targetType: AdminTargets.COMMUNITY,
          targetId: community.id,
          previousState: { name: community.name, city: community.city, description: community.description },
          newState: {
            name: data.name,
            city: data.city,
            description: data.description,
            media_count: galleryDraft.items.length,
          },
        });

        toast({
          title: 'Community Updated',
          description: `${data.name} has been updated successfully.`,
        });
      } else {
        const slug = generateSlug(data.name);

        const { data: inserted, error } = await supabase
          .from('communities')
          .insert([
            {
              name: data.name,
              city: data.city,
              description: data.description || null,
            },
          ])
          .select('id')
          .single();

        if (error) throw error;

        communityId = inserted?.id ?? null;
        if (!communityId) {
          throw new Error('Community insert did not return an id.');
        }

        await supabase
          .from('communities')
          .update({ slug })
          .eq('id', communityId);

        await syncGalleryMedia({
          entity: 'communities',
          entityId: communityId,
          draft: galleryDraft,
          existingMedia: [],
        });

        logAdminAction({
          action: AdminActions.COMMUNITY_CREATE,
          targetType: AdminTargets.COMMUNITY,
          targetId: communityId,
          newState: { name: data.name, city: data.city, slug, media_count: galleryDraft.items.length },
        });

        toast({
          title: 'Community Created',
          description: `${data.name} has been created successfully.`,
        });
      }

      form.reset();
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving community:', error);
      toast({
        title: 'Error',
        description: `Failed to ${isEditing ? 'update' : 'create'} community.`,
        variant: 'destructive',
      });
    }
  };

  const handleClose = () => {
    form.reset();
    setGalleryDraft(createEmptyGalleryDraftState());
    setExistingMedia([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Community' : 'Create New Community'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Community Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter community name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter city" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter community description (optional)"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <MultiFileUpload
              label="Community Gallery"
              initialMedia={existingMedia}
              onChange={onGalleryChange}
              resetKey={`${community?.id ?? 'new'}-${galleryResetKey}`}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="admin-focus"
              >
                {form.formState.isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEditing ? 'Update' : 'Create'} Community
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
