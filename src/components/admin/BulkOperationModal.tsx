import React from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Zap,
  Users,
  UserPlus,
  Ban,
  Mail,
  Shield,
  Download,
  Upload,
  Crown,
} from 'lucide-react';

interface BulkOperationModalProps {
  isOpen: boolean;
  onClose: () => void;
  operation?: any;
  onSave: () => void;
}

interface BulkOperationFormData {
  operation_type: string;
  target_criteria: string;
  target_data: string;
  dry_run: boolean;
  notification_enabled: boolean;
  batch_size: number;
}

const OPERATION_TYPES = [
  {
    value: 'bulk_role_assignment',
    label: 'Bulk Role Assignment',
    icon: Crown,
    description: 'Assign roles to multiple users at once'
  },
  {
    value: 'bulk_user_ban',
    label: 'Bulk User Ban',
    icon: Ban,
    description: 'Ban multiple users based on criteria'
  },
  {
    value: 'bulk_user_unban',
    label: 'Bulk User Unban',
    icon: UserPlus,
    description: 'Unban multiple users'
  },
  {
    value: 'bulk_notification',
    label: 'Bulk Notification',
    icon: Mail,
    description: 'Send notifications to user groups'
  },
  {
    value: 'bulk_permission_grant',
    label: 'Bulk Permission Grant',
    icon: Shield,
    description: 'Grant permissions to multiple users'
  },
  {
    value: 'bulk_data_export',
    label: 'Bulk Data Export',
    icon: Download,
    description: 'Export user data in bulk'
  },
  {
    value: 'bulk_data_import',
    label: 'Bulk Data Import',
    icon: Upload,
    description: 'Import user data from file'
  }
];

const CRITERIA_OPTIONS = [
  { value: 'all_users', label: 'All Users' },
  { value: 'role_based', label: 'By Role' },
  { value: 'community_based', label: 'By Community' },
  { value: 'registration_date', label: 'By Registration Date' },
  { value: 'activity_level', label: 'By Activity Level' },
  { value: 'custom_filter', label: 'Custom Filter' }
];

export function BulkOperationModal({ isOpen, onClose, operation, onSave }: BulkOperationModalProps) {
  const [previewCount, setPreviewCount] = React.useState(0);
  const [isLoadingPreview, setIsLoadingPreview] = React.useState(false);
  
  const form = useForm<BulkOperationFormData>({
    defaultValues: {
      operation_type: operation?.operation_type || '',
      target_criteria: 'all_users',
      target_data: operation?.operation_data?.target_data || '',
      dry_run: !operation,
      notification_enabled: true,
      batch_size: 100,
    },
  });

  const selectedOperationType = OPERATION_TYPES.find(
    type => type.value === form.watch('operation_type')
  );

  // Reset form when operation changes
  React.useEffect(() => {
    if (isOpen) {
      form.reset({
        operation_type: operation?.operation_type || '',
        target_criteria: 'all_users',
        target_data: operation?.operation_data?.target_data || '',
        dry_run: !operation,
        notification_enabled: true,
        batch_size: 100,
      });
    }
  }, [operation, isOpen, form]);

  // Preview target count
  const previewTargets = async () => {
    const criteria = form.getValues('target_criteria');
    const targetData = form.getValues('target_data');
    
    setIsLoadingPreview(true);
    try {
      let query = supabase.from('users').select('*', { count: 'exact', head: true });
      
      switch (criteria) {
        case 'role_based':
          if (targetData) {
            const { data: roleUsers } = await supabase
              .from('user_roles')
              .select('user_id')
              .eq('role', targetData as any)
              .eq('is_active', true);
            
            if (roleUsers) {
              const userIds = roleUsers.map(r => r.user_id);
              query = query.in('id', userIds);
            }
          }
          break;
        case 'community_based':
          if (targetData) {
            const { data: members } = await supabase
              .from('community_members')
              .select('user_id')
              .eq('community_id', targetData);
            
            if (members) {
              const userIds = members.map(m => m.user_id);
              query = query.in('id', userIds);
            }
          }
          break;
        case 'registration_date':
          if (targetData) {
            query = query.gte('created_at', targetData);
          }
          break;
      }
      
      const { count } = await query;
      setPreviewCount(count || 0);
    } catch (error) {
      console.error('Error previewing targets:', error);
      setPreviewCount(0);
    }
    setIsLoadingPreview(false);
  };

  React.useEffect(() => {
    if (form.watch('target_criteria') && form.watch('target_data')) {
      previewTargets();
    }
  }, [form.watch('target_criteria'), form.watch('target_data')]);

  const onSubmit = async (data: BulkOperationFormData) => {
    try {
      const currentUser = await supabase.auth.getUser();
      
      const payload = {
        operation_type: data.operation_type,
        initiated_by: currentUser.data.user?.id ?? '',
        target_count: previewCount,
        operation_data: {
          target_criteria: data.target_criteria,
          target_data: data.target_data,
          dry_run: data.dry_run,
          notification_enabled: data.notification_enabled,
          batch_size: data.batch_size
        },
        status: data.dry_run ? 'pending' : 'in_progress'
      };

      if (operation) {
        // Update existing operation
        const { error } = await supabase
          .from('bulk_operations')
          .update(payload)
          .eq('id', operation.id);

        if (error) throw error;
        toast({ title: 'Operation updated successfully' });
      } else {
        // Create new operation
        const { error } = await supabase
          .from('bulk_operations')
          .insert(payload);

        if (error) throw error;
        toast({ 
          title: data.dry_run ? 'Dry run scheduled' : 'Operation started',
          description: `Targeting ${previewCount} users`
        });
      }

      onSave();
      onClose();
    } catch (error: any) {
      toast({
        title: 'Failed to create operation',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {operation ? 'Edit Bulk Operation' : 'Create Bulk Operation'}
          </DialogTitle>
          <DialogDescription>
            Configure and execute bulk operations across multiple users safely.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="operation_type"
              rules={{ required: 'Please select an operation type' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Operation Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select operation type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {OPERATION_TYPES.map((type) => {
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

            {selectedOperationType && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <selectedOperationType.icon className="w-4 h-4" />
                  <Badge variant="outline">{selectedOperationType.label}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {selectedOperationType.description}
                </p>
              </div>
            )}

            <FormField
              control={form.control}
              name="target_criteria"
              rules={{ required: 'Please select target criteria' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Criteria</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select targeting criteria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CRITERIA_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
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
              name="target_data"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Data</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter specific criteria data (role names, community IDs, dates, etc.)"
                      {...field}
                    />
                  </FormControl>
                  <div className="text-sm text-muted-foreground">
                    Specify the data for your targeting criteria (e.g., role name, community ID, date range)
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="batch_size"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Batch Size</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="1000"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 100)}
                      />
                    </FormControl>
                    <div className="text-sm text-muted-foreground">
                      Users per batch (1-1000)
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <label className="text-sm font-medium">Target Preview</label>
                <div className="p-3 bg-muted rounded-lg">
                  {isLoadingPreview ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                      <span className="text-sm">Calculating...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4" />
                      <span className="font-medium">{previewCount.toLocaleString()} users</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="dry_run"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Dry Run Mode</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Test the operation without making actual changes
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

              <FormField
                control={form.control}
                name="notification_enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Send Notifications</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Notify affected users about the operation
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
            </div>

            {operation && (
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Operation Status</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress:</span>
                    <span>{operation.success_count + operation.error_count}/{operation.target_count}</span>
                  </div>
                  <Progress 
                    value={operation.target_count > 0 ? ((operation.success_count + operation.error_count) / operation.target_count) * 100 : 0} 
                  />
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center">
                      <div className="font-medium text-green-600">{operation.success_count}</div>
                      <div className="text-muted-foreground">Success</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-red-600">{operation.error_count}</div>
                      <div className="text-muted-foreground">Errors</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium">{operation.target_count - operation.success_count - operation.error_count}</div>
                      <div className="text-muted-foreground">Pending</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" className="admin-gradient">
                <Zap className="w-4 h-4 mr-2" />
                {operation ? 'Update Operation' : (form.watch('dry_run') ? 'Run Dry Test' : 'Start Operation')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}