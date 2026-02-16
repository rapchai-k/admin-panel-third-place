import React from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Crown, Shield, UserCheck, Settings, Users } from 'lucide-react';
import { format } from 'date-fns';
import { logAdminAction } from '@/lib/admin-audit';
import { AdminActions, AdminTargets } from '@/lib/admin-events';

interface UserRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  role?: any;
  onSave: () => void;
}

interface RoleFormData {
  user_id: string;
  role: string;
  expires_at?: Date;
  is_active: boolean;
}

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin', icon: Crown, description: 'Full system access' },
  { value: 'moderator', label: 'Moderator', icon: Shield, description: 'Content moderation' },
  { value: 'community_manager', label: 'Community Manager', icon: UserCheck, description: 'Community management' },
  { value: 'event_organizer', label: 'Event Organizer', icon: Settings, description: 'Event management' },
  { value: 'user', label: 'User', icon: Users, description: 'Basic user access' }
];

export function UserRoleModal({ isOpen, onClose, role, onSave }: UserRoleModalProps) {
  const [showExpiry, setShowExpiry] = React.useState(!!role?.expires_at);
  
  const form = useForm<RoleFormData>({
    defaultValues: {
      user_id: role?.user_id || '',
      role: role?.role || 'user',
      expires_at: role?.expires_at ? new Date(role.expires_at) : undefined,
      is_active: role?.is_active ?? true,
    },
  });

  // Reset form when role changes
  React.useEffect(() => {
    if (isOpen) {
      form.reset({
        user_id: role?.user_id || '',
        role: role?.role || 'user',
        expires_at: role?.expires_at ? new Date(role.expires_at) : undefined,
        is_active: role?.is_active ?? true,
      });
      setShowExpiry(!!role?.expires_at);
    }
  }, [role, isOpen, form]);

  // Fetch users for selection
  const { data: users } = useQuery({
    queryKey: ['users-for-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, photo_url')
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: isOpen && !role
  });

  const onSubmit = async (data: RoleFormData) => {
    try {
      const payload = {
        user_id: data.user_id,
        role: data.role as any,
        expires_at: showExpiry && data.expires_at ? data.expires_at.toISOString() : null,
        is_active: data.is_active,
        ...(role ? {} : { granted_by: (await supabase.auth.getUser()).data.user?.id })
      };

      if (role) {
        // Update existing role
        const { error } = await supabase
          .from('user_roles')
          .update(payload)
          .eq('id', role.id);

        if (error) throw error;

        logAdminAction({
          action: AdminActions.ROLE_UPDATE,
          targetType: AdminTargets.ROLE,
          targetId: role.id,
          previousState: { role: role.role, is_active: role.is_active },
          newState: { role: data.role, is_active: data.is_active },
        });

        toast({ title: 'Role updated successfully' });
      } else {
        // Create new role
        const { data: inserted, error } = await supabase
          .from('user_roles')
          .insert(payload as any)
          .select('id')
          .single();

        if (error) throw error;

        logAdminAction({
          action: AdminActions.ROLE_ASSIGN,
          targetType: AdminTargets.ROLE,
          targetId: inserted?.id ?? 'unknown',
          newState: { user_id: data.user_id, role: data.role },
        });

        toast({ title: 'Role assigned successfully' });
      }

      onSave();
      onClose();
    } catch (error: any) {
      toast({
        title: role ? 'Failed to update role' : 'Failed to assign role',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const selectedRoleOption = ROLE_OPTIONS.find(option => option.value === form.watch('role'));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {role ? 'Edit User Role' : 'Assign User Role'}
          </DialogTitle>
          <DialogDescription>
            {role 
              ? 'Modify the user\'s role and permissions.' 
              : 'Assign a role to a user with specific permissions and optional expiry.'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {!role && (
              <FormField
                control={form.control}
                name="user_id"
                rules={{ required: 'Please select a user' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>User</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a user" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users?.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            <div className="flex items-center space-x-2">
                              {user.photo_url && (
                                <img 
                                  src={user.photo_url} 
                                  alt="" 
                                  className="w-6 h-6 rounded-full"
                                />
                              )}
                              <span>{user.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="role"
              rules={{ required: 'Please select a role' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ROLE_OPTIONS.map((option) => {
                        const Icon = option.icon;
                        return (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center space-x-2">
                              <Icon className="w-4 h-4" />
                              <div>
                                <div className="font-medium">{option.label}</div>
                                <div className="text-xs text-muted-foreground">
                                  {option.description}
                                </div>
                              </div>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedRoleOption && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <selectedRoleOption.icon className="w-4 h-4" />
                  <Badge variant="outline">{selectedRoleOption.label}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {selectedRoleOption.description}
                </p>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Switch
                checked={showExpiry}
                onCheckedChange={setShowExpiry}
              />
              <label className="text-sm font-medium">Set expiry date</label>
            </div>

            {showExpiry && (
              <FormField
                control={form.control}
                name="expires_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiry Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className="w-full pl-3 text-left font-normal"
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
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
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active Status</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Enable or disable this role assignment
                    </div>
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" className="admin-gradient">
                {role ? 'Update Role' : 'Assign Role'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}