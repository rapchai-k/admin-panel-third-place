import { useEffect, useState } from 'react';
import { DataTable, Column } from '@/components/admin/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, Shield, UserCheck, UserX, Clock, Award } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { UserModal } from '@/components/admin/UserModal';
import { UserDetailsModal } from '@/components/admin/UserDetailsModal';

interface User {
  id: string;
  name: string;
  email?: string;
  photo_url?: string;
  role: 'user' | 'admin';
  is_banned: boolean;
  created_at: string;
  updated_at: string;
  referral_code?: string;
  referred_by?: string | null;
  community_count?: number;
  event_count?: number;
  badge_count?: number;
}


// Null-safe helpers for string handling and initials
function safeString(v: unknown): string {
  if (v === null || v === undefined) return '';
  try {
    return String(v);
  } catch {
    return '';
  }
}

function getInitials(name?: string): string {
  const s = safeString(name).trim();
  if (!s) return 'U';
  const parts = s.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0];
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : undefined;
  const initials = `${first ?? ''}${last ?? ''}`.toUpperCase();
  return initials || (first?.toUpperCase() ?? 'U');
}

const columns: Column<User>[] = [
  {
    key: 'name',
    header: 'User',
    sortable: true,
    render: (_value, row) => (
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage
            src={safeString(row.photo_url) || undefined}
            alt={safeString(row.name) || 'User avatar'}
            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = ''; }}
          />
          <AvatarFallback>
            {getInitials(row.name)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{safeString(row.name) || 'Unknown'}</p>
          <p className="text-sm text-muted-foreground">
            {safeString(row.email) || `ID: ${safeString(row.id).slice(0, 8)}...`}
          </p>
        </div>
      </div>
    ),
  },
  {
    key: 'role',
    header: 'Role',
    sortable: true,
    filterable: true,
    render: (value) => (
      <div className="flex items-center gap-2">
        {value === 'admin' ? (
          <>
            <Shield className="h-4 w-4 text-primary" />
            <Badge variant="default">Admin</Badge>
          </>
        ) : (
          <>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
            <Badge variant="secondary">User</Badge>
          </>
        )}
      </div>
    ),
  },
  {
    key: 'is_banned',
    header: 'Status',
    filterable: true,
    render: (value) => (
      <div className="flex items-center gap-2">
        {value ? (
          <>
            <UserX className="h-4 w-4 text-destructive" />
            <Badge variant="destructive">Banned</Badge>
          </>
        ) : (
          <>
            <UserCheck className="h-4 w-4 text-success" />
            <Badge variant="default">Active</Badge>
          </>
        )}
      </div>
    ),
  },
  {
    key: 'community_count',
    header: 'Communities',
    sortable: true,
    render: (value) => (
      <div className="text-center">
        <span className="text-lg font-medium">{value || 0}</span>
        <p className="text-xs text-muted-foreground">joined</p>
      </div>
    ),
  },
  {
    key: 'event_count',
    header: 'Events',
    sortable: true,
    render: (value) => (
      <div className="text-center">
        <span className="text-lg font-medium">{value || 0}</span>
        <p className="text-xs text-muted-foreground">registered</p>
      </div>
    ),
  },
  {
    key: 'badge_count',
    header: 'Badges',
    sortable: true,
    render: (value) => (
      <div className="flex items-center gap-2">
        <Award className="h-4 w-4 text-yellow-500" />
        <span>{value || 0}</span>
      </div>
    ),
  },
  {
    key: 'referral_code',
    header: 'Referral',
    render: (value) => (
      <div>
        {value ? (
          <Badge variant="outline" className="font-mono text-xs">
            {value}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-sm">None</span>
        )}
      </div>
    ),
  },
  {
    key: 'created_at',
    header: 'Joined',
    sortable: true,
    render: (value) => (
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm">{new Date(value).toLocaleDateString()}</span>
      </div>
    ),
  },
];

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | undefined>();
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [detailsUser, setDetailsUser] = useState<User | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setIsLoading(true);

      // Single RPC replaces N+1 queries (1 base query + 4 per user)
      const { data, error } = await supabase.rpc('get_users_with_counts');

      if (error) {
        console.error('get_users_with_counts error:', error);
        throw error;
      }

      const usersWithCounts: User[] = (data || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        email: row.email || undefined,
        photo_url: row.photo_url || undefined,
        role: row.role,
        is_banned: row.is_banned,
        created_at: row.created_at,
        updated_at: row.updated_at,
        referral_code: row.referral_code || undefined,
        referred_by: row.referred_by || undefined,
        community_count: Number(row.community_count) || 0,
        event_count: Number(row.event_count) || 0,
        badge_count: Number(row.badge_count) || 0,
      }));

      setUsers(usersWithCounts);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: "Error Loading Users",
        description: "Failed to load users data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePromoteUser = (user: User) => {
    toast({
      title: "Promote User",
      description: `Promote ${user.name} to admin - Feature coming soon!`,
    });
  };

  const handleBanUser = (user: User) => {
    toast({
      title: "Ban User",
      description: `Ban ${user.name} - Feature coming soon!`,
      variant: "destructive",
    });
  };

  const handleExport = () => {
    toast({
      title: "Export Users",
      description: "Export functionality coming soon!",
    });
  };

  // Get filter options
  const roles = [
    { value: 'user', label: 'User' },
    { value: 'admin', label: 'Admin' },
  ];

  const statuses = [
    { value: 'active', label: 'Active' },
    { value: 'banned', label: 'Banned' },
  ];

  const filters = [
    {
      key: 'role' as keyof User,
      label: 'Role',
      options: roles,
    },
    {
      key: 'is_banned' as keyof User,
      label: 'Status',
      options: statuses,
    },
  ];

  const handleCreate = () => {
    setSelectedUser(undefined);
    setIsModalOpen(true);
  };

  const handleModalSuccess = () => {
    loadUsers();
  };



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1>Users</h1>
          <p className="text-muted-foreground">Manage platform users and permissions</p>
        </div>
        <Button onClick={handleCreate} className="admin-focus">
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Users Table */}
      <DataTable
        data={users}
        columns={columns}
        title="Users Overview"
        isLoading={isLoading}
        onRefresh={loadUsers}
        onExport={handleExport}
        searchPlaceholder="Search users..."
        filters={filters}
        onRowClick={(user) => { setDetailsUser(user as User); setIsDetailsOpen(true); }}
      />

      <UserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleModalSuccess}
        user={selectedUser}
      />

      <UserDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        user={detailsUser}
        onEdit={(u) => {
          // Convert UserSummary to User by adding missing updated_at field
          const userForEdit: User = { ...u, updated_at: new Date().toISOString() };
          setSelectedUser(userForEdit);
          setIsModalOpen(true);
        }}
        onPromote={(u) => {
          // Convert UserSummary to User by adding missing updated_at field
          const userForPromotion: User = { ...u, updated_at: new Date().toISOString() };
          handlePromoteUser(userForPromotion);
        }}
        onBan={(u) => {
          // Convert UserSummary to User by adding missing updated_at field
          const userForBan: User = { ...u, updated_at: new Date().toISOString() };
          handleBanUser(userForBan);
        }}
      />
    </div>
  );
}