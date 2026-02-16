import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DataTable } from '@/components/admin/DataTable';
import { UserRoleModal } from '@/components/admin/UserRoleModal';
import { BulkOperationModal } from '@/components/admin/BulkOperationModal';
import { PermissionModal } from '@/components/admin/PermissionModal';
import { toast } from '@/components/ui/use-toast';
import {
  Users,
  UserCheck,
  Shield,
  Settings,
  Zap,
  UserPlus,
  Crown,
  Key
} from 'lucide-react';

interface UserRole {
  id: string;
  user_id: string;
  role: string;
  granted_by: string | null;
  granted_at: string;
  expires_at: string | null;
  is_active: boolean;
  users: {
    name: string;
    photo_url: string | null;
  } | null;
  granted_by_user: {
    name: string;
  } | null;
}

interface BulkOperation {
  id: string;
  operation_type: string;
  initiated_by: string;
  target_count: number;
  success_count: number;
  error_count: number;
  status: string;
  started_at: string;
  completed_at: string | null;
  users: {
    name: string;
  } | null;
}

interface UserPermission {
  id: string;
  user_id: string;
  permission_type: string;
  resource_type: string | null;
  resource_id: string | null;
  granted_by: string | null;
  granted_at: string;
  expires_at: string | null;
  is_active: boolean;
  users: {
    name: string;
  } | null;
}

const ROLE_COLORS = {
  admin: 'destructive',
  moderator: 'default',
  community_manager: 'secondary',
  event_organizer: 'outline',
  user: 'outline'
} as const;

const ROLE_ICONS = {
  admin: Crown,
  moderator: Shield,
  community_manager: UserCheck,
  event_organizer: Settings,
  user: Users
} as const;

const STATUS_COLORS = {
  pending: 'outline',
  in_progress: 'default',
  completed: 'default',
  failed: 'destructive',
  cancelled: 'secondary'
} as const;

export default function AdvancedUserManagementPage() {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [selectedOperation, setSelectedOperation] = useState<BulkOperation | null>(null);
  const [selectedPermission, setSelectedPermission] = useState<UserPermission | null>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  
  const queryClient = useQueryClient();

  // Fetch user roles with user details
  const { data: userRoles, isLoading: rolesLoading } = useQuery({
    queryKey: ['user-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          *,
          users:user_id(name, photo_url),
          granted_by_user:granted_by(name)
        `)
        .order('granted_at', { ascending: false });

      if (error) throw error;
      return data as any;
    }
  });

  // Fetch bulk operations
  const { data: bulkOperations, isLoading: operationsLoading } = useQuery({
    queryKey: ['bulk-operations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bulk_operations')
        .select(`
          *,
          users:initiated_by(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as BulkOperation[];
    }
  });

  // Fetch user permissions
  const { data: userPermissions, isLoading: permissionsLoading } = useQuery({
    queryKey: ['user-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_permissions')
        .select(`
          *,
          users!user_permissions_user_id_fkey(name)
        `)
        .order('granted_at', { ascending: false });

      if (error) throw error;
      return data?.map(permission => ({
        ...permission,
        users: permission.users as { name: string }
      })) as UserPermission[];
    }
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      toast({ title: 'Role removed successfully' });
    },
    onError: (error) => {
      toast({ 
        title: 'Failed to remove role', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  });

  // Bulk operation mutations
  const cancelOperationMutation = useMutation({
    mutationFn: async (operationId: string) => {
      const { error } = await supabase
        .from('bulk_operations')
        .update({ status: 'cancelled', completed_at: new Date().toISOString() })
        .eq('id', operationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bulk-operations'] });
      toast({ title: 'Operation cancelled successfully' });
    },
    onError: (error) => {
      toast({ 
        title: 'Failed to cancel operation', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  });

  // Calculate statistics
  const roleStats = userRoles?.reduce((acc: Record<string, number>, role: UserRole) => {
    acc[role.role] = (acc[role.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const operationStats = bulkOperations?.reduce((acc, op) => {
    acc[op.status] = (acc[op.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const activeRoles = userRoles?.filter((role: UserRole) => role.is_active).length || 0;
  const expiredRoles = userRoles?.filter((role: UserRole) =>
    role.expires_at && new Date(role.expires_at) < new Date()
  ).length || 0;

  const roleColumns = [
    { 
      key: 'user' as keyof UserRole, 
      header: 'User',
      render: (role: UserRole) => (
        <div className="flex items-center space-x-2">
          {role.users?.photo_url && (
            <img 
              src={role.users.photo_url} 
              alt="" 
              className="w-8 h-8 rounded-full"
            />
          )}
          <span className="font-medium">{role.users?.name || 'Unknown'}</span>
        </div>
      )
    },
    { 
      key: 'role' as keyof UserRole, 
      header: 'Role',
      render: (role: UserRole) => {
        const Icon = ROLE_ICONS[role.role as keyof typeof ROLE_ICONS] || Users;
        return (
          <div className="flex items-center space-x-2">
            <Icon className="w-4 h-4" />
            <Badge variant={ROLE_COLORS[role.role as keyof typeof ROLE_COLORS]}>
              {role.role.replace('_', ' ')}
            </Badge>
          </div>
        );
      }
    },
    { 
      key: 'granted_at' as keyof UserRole, 
      header: 'Granted',
      render: (role: UserRole) => new Date(role.granted_at).toLocaleDateString()
    },
    { 
      key: 'expires_at' as keyof UserRole, 
      header: 'Expires',
      render: (role: UserRole) => 
        role.expires_at ? new Date(role.expires_at).toLocaleDateString() : 'Never'
    },
    { 
      key: 'is_active' as keyof UserRole, 
      header: 'Status',
      render: (role: UserRole) => {
        const isExpired = role.expires_at && new Date(role.expires_at) < new Date();
        return (
          <Badge variant={role.is_active && !isExpired ? 'default' : 'secondary'}>
            {role.is_active && !isExpired ? 'Active' : 'Inactive'}
          </Badge>
        );
      }
    }
  ];

  const operationColumns = [
    { 
      key: 'operation_type' as keyof BulkOperation, 
      header: 'Operation',
      render: (op: BulkOperation) => (
        <div className="flex items-center space-x-2">
          <Zap className="w-4 h-4" />
          <span className="font-medium">{op.operation_type.replace('_', ' ')}</span>
        </div>
      )
    },
    { 
      key: 'initiated_by' as keyof BulkOperation, 
      header: 'Initiated By',
      render: (op: BulkOperation) => op.users?.name || 'Unknown'
    },
    { 
      key: 'target_count' as keyof BulkOperation, 
      header: 'Progress',
      render: (op: BulkOperation) => {
        const progress = op.target_count > 0 
          ? ((op.success_count + op.error_count) / op.target_count) * 100 
          : 0;
        return (
          <div className="space-y-1">
            <Progress value={progress} className="w-20" />
            <span className="text-xs text-muted-foreground">
              {op.success_count + op.error_count}/{op.target_count}
            </span>
          </div>
        );
      }
    },
    { 
      key: 'status' as keyof BulkOperation, 
      header: 'Status',
      render: (op: BulkOperation) => (
        <Badge variant={STATUS_COLORS[op.status as keyof typeof STATUS_COLORS]}>
          {op.status.replace('_', ' ')}
        </Badge>
      )
    },
    { 
      key: 'started_at' as keyof BulkOperation, 
      header: 'Started',
      render: (op: BulkOperation) => new Date(op.started_at).toLocaleString()
    }
  ];

  const permissionColumns = [
    { 
      key: 'user_id' as keyof UserPermission, 
      header: 'User',
      render: (perm: UserPermission) => perm.users?.name || 'Unknown'
    },
    { 
      key: 'permission_type' as keyof UserPermission, 
      header: 'Permission',
      render: (perm: UserPermission) => (
        <div className="flex items-center space-x-2">
          <Key className="w-4 h-4" />
          <span className="font-medium">{perm.permission_type.replace('_', ' ')}</span>
        </div>
      )
    },
    { 
      key: 'resource_type' as keyof UserPermission, 
      header: 'Resource',
      render: (perm: UserPermission) => 
        perm.resource_type ? `${perm.resource_type}${perm.resource_id ? ` (${perm.resource_id.slice(0, 8)}...)` : ''}` : 'Global'
    },
    { 
      key: 'granted_at' as keyof UserPermission, 
      header: 'Granted',
      render: (perm: UserPermission) => new Date(perm.granted_at).toLocaleDateString()
    },
    { 
      key: 'expires_at' as keyof UserPermission, 
      header: 'Expires',
      render: (perm: UserPermission) => 
        perm.expires_at ? new Date(perm.expires_at).toLocaleDateString() : 'Never'
    }
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Advanced User Management</h1>
        <p className="text-muted-foreground">
          Manage roles, permissions, and bulk operations across your platform.
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="admin-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Roles</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeRoles}</div>
            <p className="text-xs text-muted-foreground">
              {expiredRoles} expired roles
            </p>
          </CardContent>
        </Card>

        <Card className="admin-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Crown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roleStats.admin || 0}</div>
            <p className="text-xs text-muted-foreground">
              Total admin users
            </p>
          </CardContent>
        </Card>

        <Card className="admin-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bulk Operations</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bulkOperations?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              {operationStats.pending || 0} pending
            </p>
          </CardContent>
        </Card>

        <Card className="admin-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Permissions</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userPermissions?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Custom permissions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs Interface */}
      <Tabs defaultValue="roles" className="space-y-4">
        <TabsList>
          <TabsTrigger value="roles">User Roles</TabsTrigger>
          <TabsTrigger value="operations">Bulk Operations</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium">User Role Management</h3>
              <p className="text-sm text-muted-foreground">
                Manage user roles and their permissions across the platform.
              </p>
            </div>
            <Button 
              onClick={() => {
                setSelectedRole(null);
                setIsRoleModalOpen(true);
              }}
              className="admin-gradient"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Assign Role
            </Button>
          </div>

          <Card className="admin-shadow">
            <CardContent className="p-6">
              <DataTable
                data={userRoles || []}
                columns={roleColumns}
                isLoading={rolesLoading}
                actions={[
                  {
                    label: "Edit",
                    onClick: (role) => {
                      setSelectedRole(role);
                      setIsRoleModalOpen(true);
                    }
                  },
                  {
                    label: "Delete",
                    onClick: (role) => deleteRoleMutation.mutate(role.id),
                    variant: "destructive" as const
                  }
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operations" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium">Bulk Operations</h3>
              <p className="text-sm text-muted-foreground">
                Monitor and manage bulk operations across user accounts.
              </p>
            </div>
            <Button 
              onClick={() => {
                setSelectedOperation(null);
                setIsBulkModalOpen(true);
              }}
              className="admin-gradient"
            >
              <Zap className="w-4 h-4 mr-2" />
              New Operation
            </Button>
          </div>

          <Card className="admin-shadow">
            <CardContent className="p-6">
              <DataTable
                data={bulkOperations || []}
                columns={operationColumns}
                isLoading={operationsLoading}
                actions={[
                  {
                    label: "Edit",
                    onClick: (operation) => {
                      setSelectedOperation(operation);
                      setIsBulkModalOpen(true);
                    }
                  },
                  {
                    label: "Cancel",
                    onClick: (operation) => cancelOperationMutation.mutate(operation.id),
                    variant: "destructive" as const
                  }
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium">User Permissions</h3>
              <p className="text-sm text-muted-foreground">
                Manage granular permissions for specific resources and actions.
              </p>
            </div>
            <Button 
              onClick={() => {
                setSelectedPermission(null);
                setIsPermissionModalOpen(true);
              }}
              className="admin-gradient"
            >
              <Key className="w-4 h-4 mr-2" />
              Grant Permission
            </Button>
          </div>

          <Card className="admin-shadow">
            <CardContent className="p-6">
              <DataTable
                data={userPermissions || []}
                columns={permissionColumns}
                isLoading={permissionsLoading}
                actions={[
                  {
                    label: "Edit",
                    onClick: (permission) => {
                      setSelectedPermission(permission);
                      setIsPermissionModalOpen(true);
                    }
                  }
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <UserRoleModal
        isOpen={isRoleModalOpen}
        onClose={() => {
          setIsRoleModalOpen(false);
          setSelectedRole(null);
        }}
        role={selectedRole}
        onSave={() => queryClient.invalidateQueries({ queryKey: ['user-roles'] })}
      />

      <BulkOperationModal
        isOpen={isBulkModalOpen}
        onClose={() => {
          setIsBulkModalOpen(false);
          setSelectedOperation(null);
        }}
        operation={selectedOperation}
        onSave={() => queryClient.invalidateQueries({ queryKey: ['bulk-operations'] })}
      />

      <PermissionModal
        isOpen={isPermissionModalOpen}
        onClose={() => {
          setIsPermissionModalOpen(false);
          setSelectedPermission(null);
        }}
        permission={selectedPermission}
        onSave={() => queryClient.invalidateQueries({ queryKey: ['user-permissions'] })}
      />
    </div>
  );
}