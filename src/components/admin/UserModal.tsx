import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { FileUpload } from '@/components/ui/file-upload';
import { logAdminAction } from '@/lib/admin-audit';
import { AdminActions, AdminTargets } from '@/lib/admin-events';

const userSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  photo_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  role: z.enum(['user', 'admin']),
  is_banned: z.boolean(),
  referral_code: z.string().optional(),
});

type UserFormData = z.infer<typeof userSchema>;

interface User {
  id: string;
  name: string;
  photo_url?: string;
  role: 'user' | 'admin';
  is_banned: boolean;
  referral_code?: string;
}

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user?: User;
}

export function UserModal({ isOpen, onClose, onSuccess, user }: UserModalProps) {
  const { toast } = useToast();
  const isEditing = !!user;
  const isCreating = !isEditing;

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: user?.name || '',
      photo_url: user?.photo_url || '',
      role: user?.role || 'user',
      is_banned: user?.is_banned || false,
      referral_code: user?.referral_code || '',
    },
  });

  // Reset form values when user data changes
  React.useEffect(() => {
    if (isOpen) {
      form.reset({
        name: user?.name || '',
        photo_url: user?.photo_url || '',
        role: user?.role || 'user',
        is_banned: user?.is_banned || false,
        referral_code: user?.referral_code || '',
      });
    }
  }, [user, isOpen, form]);

  const onSubmit = async (data: UserFormData) => {
    try {
      if (isEditing) {
        // Note: role changes should go through the user_roles table
        // (via AdvancedUserManagement), not via users.role column directly.
        const { error } = await supabase
          .from('users')
          .update({
            name: data.name,
            photo_url: data.photo_url || null,
            is_banned: data.is_banned,
            referral_code: data.referral_code || null,
          })
          .eq('id', user.id);

        if (error) throw error;

        // Audit log — fire-and-forget
        const wasBanned = user.is_banned;
        const isBanned = data.is_banned;
        const action = isBanned && !wasBanned
          ? AdminActions.USER_BAN
          : !isBanned && wasBanned
            ? AdminActions.USER_UNBAN
            : AdminActions.USER_UPDATE;

        logAdminAction({
          action,
          targetType: AdminTargets.USER,
          targetId: user.id,
          previousState: { name: user.name, photo_url: user.photo_url, is_banned: user.is_banned },
          newState: { name: data.name, photo_url: data.photo_url, is_banned: data.is_banned },
        });

        toast({
          title: "User Updated",
          description: `${data.name} has been updated successfully.`,
        });
      } else {
        // For creating users, we'd typically use the auth.admin API
        // This is a simplified version - in reality, you'd want to use proper user creation
        toast({
          title: "User Creation",
          description: "User creation requires authentication setup - Feature coming soon!",
          variant: "destructive",
        });
        return;
      }

      form.reset();
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving user:', error);
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? 'update' : 'create'} user.`,
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit User' : 'Create New User'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter full name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="photo_url"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <FileUpload
                      bucket="user-avatars"
                      path={user?.id || 'temp'}
                      onUpload={field.onChange}
                      currentImage={field.value}
                      label="Profile Picture"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="referral_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Referral Code</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter referral code (optional)" {...field} />
                  </FormControl>
                  <FormDescription>
                    Leave empty to auto-generate or enter a custom code
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_banned"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Banned Status</FormLabel>
                    <FormDescription>
                      Banned users cannot access the platform
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

            {isCreating && (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Creating new users requires proper authentication setup. 
                  This feature is currently limited to editing existing users.
                </p>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={form.formState.isSubmitting || isCreating}
                className="admin-focus"
              >
                {form.formState.isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEditing ? 'Update' : 'Create'} User
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}