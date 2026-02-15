import React from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Key, Database, FileText, Settings, Users, Shield } from 'lucide-react';
import { format } from 'date-fns';

interface PermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  permission?: any;
  onSave: () => void;
}

interface PermissionFormData {
  user_id: string;
  permission_type: string;
  resource_type: string;
  resource_id: string;
  expires_at?: Date;
  is_active: boolean;
}

const PERMISSION_TYPES = [
  {
    value: 'read',
    label: 'Read Access',
    icon: FileText,
    description: 'View and read data'
  },
  {
    value: 'write',
    label: 'Write Access',
    icon: Settings,
    description: 'Create and modify data'
  },
  {
    value: 'delete',
    label: 'Delete Access',
    icon: Shield,
    description: 'Remove data'
  },
  {
    value: 'admin',
    label: 'Admin Access',
    icon: Key,
    description: 'Full administrative control'
  },
  {
    value: 'moderate',
    label: 'Moderate',
    icon: Shield,
    description: 'Content moderation capabilities'
  },
  {
    value: 'manage_users',
    label: 'Manage Users',
    icon: Users,
    description: 'User management permissions'
  },
  {
    value: 'manage_events',
    label: 'Manage Events',
    icon: Settings,
    description: 'Event management permissions'
  },
  {
    value: 'manage_communities',
    label: 'Manage Communities',
    icon: Database,
    description: 'Community management permissions'
  }
];

const RESOURCE_TYPES = [
  { value: 'global', label: 'Global (All Resources)' },
  { value: 'users', label: 'Users' },
  { value: 'communities', label: 'Communities' },
  { value: 'events', label: 'Events' },
  { value: 'discussions', label: 'Discussions' },
  { value: 'comments', label: 'Comments' },
  { value: 'registrations', label: 'Registrations' }
];

export function PermissionModal({ isOpen, onClose, permission, onSave }: PermissionModalProps) {
  const [showExpiry, setShowExpiry] = React.useState(!!permission?.expires_at);
  const [showResourceId, setShowResourceId] = React.useState(!!permission?.resource_id);
  
  const form = useForm<PermissionFormData>({
    defaultValues: {
      user_id: permission?.user_id || '',
      permission_type: permission?.permission_type || '',
      resource_type: permission?.resource_type || 'global',
      resource_id: permission?.resource_id || '',
      expires_at: permission?.expires_at ? new Date(permission.expires_at) : undefined,
      is_active: permission?.is_active ?? true,
    },
  });

  // Reset form when permission changes
  React.useEffect(() => {
    if (isOpen) {
      form.reset({
        user_id: permission?.user_id || '',
        permission_type: permission?.permission_type || '',
        resource_type: permission?.resource_type || 'global',
        resource_id: permission?.resource_id || '',
        expires_at: permission?.expires_at ? new Date(permission.expires_at) : undefined,
        is_active: permission?.is_active ?? true,
      });
      setShowExpiry(!!permission?.expires_at);
      setShowResourceId(!!permission?.resource_id);
    }
  }, [permission, isOpen, form]);

  // Fetch users for selection
  const { data: users } = useQuery({
    queryKey: ['users-for-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, photo_url')
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: isOpen && !permission
  });

  // Fetch resources based on selected type
  const { data: resources } = useQuery({
    queryKey: ['resources', form.watch('resource_type')],
    queryFn: async () => {
      const resourceType = form.getValues('resource_type');
      if (!resourceType || resourceType === 'global') return [];

      // Use type assertion to fix the dynamic table query
      const validTableNames = ['users', 'communities', 'discussions', 'events'] as const;
      if (!validTableNames.includes(resourceType as any)) return [];

      const { data, error } = await supabase
        .from(resourceType as any)
        .select('id, name, title')
        .limit(50);

      if (error) throw error;
      return ((data || []) as unknown) as Array<{ id: string; name?: string; title?: string; }>;
    },
    enabled: showResourceId && form.watch('resource_type') !== 'global'
  });

  const selectedPermissionType = PERMISSION_TYPES.find(
    type => type.value === form.watch('permission_type')
  );

  const onSubmit = async (data: PermissionFormData) => {
    try {
      const payload = {
        user_id: data.user_id,
        permission_type: data.permission_type,
        resource_type: data.resource_type === 'global' ? null : data.resource_type,
        resource_id: showResourceId && data.resource_id ? data.resource_id : null,
        expires_at: showExpiry && data.expires_at ? data.expires_at.toISOString() : null,
        is_active: data.is_active,
        ...(permission ? {} : { granted_by: (await supabase.auth.getUser()).data.user?.id })
      };

      if (permission) {
        // Update existing permission
        const { error } = await supabase
          .from('user_permissions')
          .update(payload)
          .eq('id', permission.id);

        if (error) throw error;
        toast({ title: 'Permission updated successfully' });
      } else {
        // Create new permission
        const { error } = await supabase
          .from('user_permissions')
          .insert(payload);

        if (error) throw error;
        toast({ title: 'Permission granted successfully' });
      }

      onSave();
      onClose();
    } catch (error: any) {
      toast({
        title: permission ? 'Failed to update permission' : 'Failed to grant permission',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {permission ? 'Edit Permission' : 'Grant Permission'}
          </DialogTitle>
          <DialogDescription>
            {permission 
              ? 'Modify user permissions for specific resources.' 
              : 'Grant specific permissions to a user with optional resource scope and expiry.'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {!permission && (
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
              name="permission_type"
              rules={{ required: 'Please select a permission type' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Permission Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select permission type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PERMISSION_TYPES.map((type) => {
                        const Icon = type.icon;
                        return (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center space-x-2">
                              <Icon className="w-4 h-4" />
                              <div>
                                <div className="font-medium">{type.label}</div>
                                <div className="text-xs text-muted-foreground">
                                  {type.description}
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

            {selectedPermissionType && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <selectedPermissionType.icon className="w-4 h-4" />
                  <Badge variant="outline">{selectedPermissionType.label}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {selectedPermissionType.description}
                </p>
              </div>
            )}

            <FormField
              control={form.control}
              name="resource_type"
              rules={{ required: 'Please select a resource type' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resource Type</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      setShowResourceId(value !== 'global');
                      if (value === 'global') {
                        form.setValue('resource_id', '');
                      }
                    }} 
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select resource type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {RESOURCE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {showResourceId && form.watch('resource_type') !== 'global' && (
              <FormField
                control={form.control}
                name="resource_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specific Resource (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select specific resource or leave empty for all" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">All {form.watch('resource_type')}</SelectItem>
                        {resources?.map((resource) => (
                          <SelectItem key={resource.id} value={resource.id}>
                            {resource.name || resource.title || resource.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                      Enable or disable this permission
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
                {permission ? 'Update Permission' : 'Grant Permission'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}