import { useEffect, useState } from 'react';
import { DataTable, Column } from '@/components/admin/DataTable';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, MapPin, Users, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CommunityModal } from '@/components/admin/CommunityModal';
import { CommunityDetailsModal } from '@/components/admin/CommunityDetailsModal';

interface Community {
  id: string;
  name: string;
  description?: string;
  city: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
  member_count?: number;
  event_count?: number;
}

// Helpers for null-safe strings and initials
const safeString = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  try { return String(v); } catch { return ''; }
};
const getInitials = (name?: string): string => {
  const s = safeString(name).trim();
  if (!s) return 'U';
  const parts = s.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0];
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : undefined;
  const initials = `${first ?? ''}${last ?? ''}`.toUpperCase();
  return initials || (first?.toUpperCase() ?? 'U');
};


const columns: Column<Community>[] = [
  {
    key: 'name',
    header: 'Community',
    sortable: true,
    render: (_value, row) => (
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage
            src={safeString(row.image_url) || undefined}
            alt={safeString(row.name) || 'Community image'}
            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = ''; }}
          />
          <AvatarFallback>
            {getInitials(row.name)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{row.name}</p>
          <p className="text-sm text-muted-foreground truncate max-w-[200px]">
            {row.description || 'No description'}
          </p>
        </div>
      </div>
    ),
  },
  {
    key: 'city',
    header: 'Location',
    sortable: true,
    filterable: true,
    render: (value) => (
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-muted-foreground" />
        <span>{value}</span>
      </div>
    ),
  },
  {
    key: 'member_count',
    header: 'Members',
    sortable: true,
    render: (value) => (
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <span>{value || 0}</span>
      </div>
    ),
  },
  {
    key: 'event_count',
    header: 'Events',
    sortable: true,
    render: (value) => (
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span>{value || 0}</span>
      </div>
    ),
  },
  {
    key: 'created_at',
    header: 'Created',
    sortable: true,
    render: (value) => new Date(value).toLocaleDateString(),
  },
];

export default function CommunitiesPage() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCommunity, setSelectedCommunity] = useState<Community | undefined>();
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [detailsCommunity, setDetailsCommunity] = useState<Community | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadCommunities();
  }, []);

  const loadCommunities = async () => {
    try {
      setIsLoading(true);

      // Fetch communities with member and event counts
      const { data: communitiesData, error } = await supabase
        .from('communities')
        .select(`
          *,
          member_count:community_members(count),
          event_count:events(count)
        `);

      if (error) throw error;

      // Transform the data to flatten the counts
      const transformedData = communitiesData?.map(community => ({
        ...community,
        member_count: community.member_count?.[0]?.count || 0,
        event_count: community.event_count?.[0]?.count || 0,
      })) || [];

      setCommunities(transformedData as Community[]);
    } catch (error) {
      console.error('Error loading communities:', error);
      toast({
        title: "Error Loading Communities",
        description: "Failed to load communities data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedCommunity(undefined);
    setIsModalOpen(true);
  };

  const openDetails = (community: Community) => {
    setDetailsCommunity(community);
    setIsDetailsOpen(true);
  };

  const handleModalSuccess = () => {
    loadCommunities();
  };

  const handleExport = () => {
    toast({
      title: "Export Communities",
      description: "Export functionality coming soon!",
    });
  };

  // Get unique cities for filtering
  const cities = [...new Set(communities.map(c => c.city))].map(city => ({
    value: city,
    label: city,
  }));

  const filters = [
    {
      key: 'city' as keyof Community,
      label: 'Location',
      options: cities,
    },
  ];

  const actions: never[] = [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1>Communities</h1>
          <p className="text-muted-foreground">Manage communities across your platform</p>
        </div>
        <Button onClick={handleCreate} className="admin-focus">
          <Plus className="h-4 w-4 mr-2" />
          Add Community
        </Button>
      </div>

      {/* Communities Table */}
      <DataTable
        data={communities}
        columns={columns}
        title="Communities Overview"
        isLoading={isLoading}
        onRefresh={loadCommunities}
        onExport={handleExport}
        searchPlaceholder="Search communities..."
        filters={filters}
        actions={actions}
        onRowClick={openDetails}
      />

      <CommunityModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleModalSuccess}
        community={selectedCommunity}
      />

      <CommunityDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        community={detailsCommunity}
        onSuccess={loadCommunities}
      />
    </div>
  );
}