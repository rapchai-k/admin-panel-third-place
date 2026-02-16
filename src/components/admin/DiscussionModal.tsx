import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { logAdminAction } from '@/lib/admin-audit';
import { AdminActions, AdminTargets } from '@/lib/admin-events';
import { format, addDays } from 'date-fns';
import { cn } from '@/lib/utils';

const discussionSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  prompt: z.string().optional(),
  community_id: z.string().min(1, 'Community is required'),
  expires_at: z.date({
    required_error: 'Expiry date is required',
  }),
  is_visible: z.boolean(),
  extended: z.boolean(),
});

type DiscussionFormData = z.infer<typeof discussionSchema>;

interface Discussion {
  id: string;
  title: string;
  prompt?: string;
  community_id: string;
  expires_at: string;
  is_visible: boolean;
  extended: boolean;
  created_by: string;
}

interface Community {
  id: string;
  name: string;
  city: string;
}

interface DiscussionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  discussion?: Discussion;
}

export function DiscussionModal({ isOpen, onClose, onSuccess, discussion }: DiscussionModalProps) {
  const { toast } = useToast();
  const [communities, setCommunities] = useState<Community[]>([]);
  const isEditing = !!discussion;

  const form = useForm<DiscussionFormData>({
    resolver: zodResolver(discussionSchema),
    defaultValues: {
      title: discussion?.title || '',
      prompt: discussion?.prompt || '',
      community_id: discussion?.community_id || '',
      expires_at: discussion ? new Date(discussion.expires_at) : addDays(new Date(), 7),
      is_visible: discussion?.is_visible ?? true,
      extended: discussion?.extended || false,
    },
  });

  useEffect(() => {
    if (isOpen) {
      loadCommunities();
    }
  }, [isOpen]);

  const loadCommunities = async () => {
    try {
      const { data, error } = await supabase
        .from('communities')
        .select('id, name, city')
        .order('name');

      if (error) throw error;
      setCommunities(data || []);
    } catch (error) {
      console.error('Error loading communities:', error);
    }
  };

  const onSubmit = async (data: DiscussionFormData) => {
    try {
      const discussionData = {
        ...data,
        expires_at: data.expires_at.toISOString(),
      };

      if (isEditing) {
        const { error } = await supabase
          .from('discussions')
          .update(discussionData)
          .eq('id', discussion.id);

        if (error) throw error;

        logAdminAction({
          action: AdminActions.DISCUSSION_UPDATE,
          targetType: AdminTargets.DISCUSSION,
          targetId: discussion.id,
          previousState: { title: discussion.title, is_visible: discussion.is_visible },
          newState: { title: data.title, is_visible: data.is_visible },
        });

        toast({
          title: "Discussion Updated",
          description: `${data.title} has been updated successfully.`,
        });
      } else {
        // For creating discussions, we need the current user's ID
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast({
            title: "Authentication Error",
            description: "You must be logged in to create discussions.",
            variant: "destructive",
          });
          return;
        }

        const { data: inserted, error } = await supabase
          .from('discussions')
          .insert([{
            title: discussionData.title,
            prompt: discussionData.prompt || null,
            community_id: discussionData.community_id,
            expires_at: discussionData.expires_at,
            is_visible: discussionData.is_visible,
            extended: discussionData.extended,
            created_by: user.id,
          }])
          .select('id')
          .single();

        if (error) throw error;

        logAdminAction({
          action: AdminActions.DISCUSSION_CREATE,
          targetType: AdminTargets.DISCUSSION,
          targetId: inserted?.id ?? 'unknown',
          newState: { title: data.title, community_id: data.community_id },
        });

        toast({
          title: "Discussion Created",
          description: `${data.title} has been created successfully.`,
        });
      }

      form.reset();
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving discussion:', error);
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? 'update' : 'create'} discussion.`,
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Discussion' : 'Create New Discussion'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Discussion Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter discussion title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="prompt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Discussion Prompt</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter discussion prompt or question (optional)"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    A guiding question or topic to help start the discussion
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="community_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Community</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select community" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {communities.map((community) => (
                        <SelectItem key={community.id} value={community.id}>
                          {community.name} - {community.city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expires_at"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Expiry Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick expiry date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date()}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    When the discussion will stop accepting new comments
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="is_visible"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Visible</FormLabel>
                      <FormDescription>
                        Show this discussion publicly
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="extended"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Extended</FormLabel>
                      <FormDescription>
                        Mark as extended discussion
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

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
                {isEditing ? 'Update' : 'Create'} Discussion
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}