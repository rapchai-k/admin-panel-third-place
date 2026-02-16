import { useEffect, useState } from 'react';
import { DataTable, Column } from '@/components/admin/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, MessageSquare, Eye, EyeOff, Clock, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DiscussionModal } from '@/components/admin/DiscussionModal';
import { DiscussionDetailsModal } from '@/components/admin/DiscussionDetailsModal';

interface Discussion {
  id: string;
  title: string;
  prompt?: string;
  community_id: string;
  expires_at: string;
  is_visible: boolean;
  extended: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  community: {
    name: string;
    city: string;
  };
  creator: {
    name: string;
    photo_url?: string;
  };
  comment_count?: number;
}

const columns: Column<Discussion>[] = [
  {
    key: 'title',
    header: 'Discussion',
    sortable: true,
    render: (_value, row) => (
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
          <MessageSquare className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="font-medium">{row.title}</p>
          <p className="text-sm text-muted-foreground truncate max-w-[300px]">
            {row.prompt || 'No prompt provided'}
          </p>
        </div>
      </div>
    ),
  },
  {
    key: 'community',
    header: 'Community',
    sortable: true,
    filterable: true,
    render: (_value, row) => (
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">{row.community.name}</p>
          <p className="text-xs text-muted-foreground">{row.community.city}</p>
        </div>
      </div>
    ),
  },
  {
    key: 'creator',
    header: 'Created By',
    render: (_value, row) => (
      <div className="flex items-center gap-2">
        <Avatar className="h-6 w-6">
          <AvatarImage src={row.creator.photo_url} />
          <AvatarFallback className="text-xs">
            {row.creator.name.split(' ').map(n => n[0]).join('').toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm">{row.creator.name}</span>
      </div>
    ),
  },
  {
    key: 'comment_count',
    header: 'Comments',
    sortable: true,
    render: (value) => (
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <span>{value || 0}</span>
      </div>
    ),
  },
  {
    key: 'is_visible',
    header: 'Visibility',
    filterable: true,
    render: (value) => (
      <div className="flex items-center gap-2">
        {value ? (
          <>
            <Eye className="h-4 w-4 text-success" />
            <Badge variant="default">Visible</Badge>
          </>
        ) : (
          <>
            <EyeOff className="h-4 w-4 text-muted-foreground" />
            <Badge variant="secondary">Hidden</Badge>
          </>
        )}
      </div>
    ),
  },
  {
    key: 'expires_at',
    header: 'Expires',
    sortable: true,
    render: (value, row) => {
      const expiresAt = new Date(value);
      const now = new Date();
      const isExpired = expiresAt < now;
      const isExtended = row.extended;

      return (
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className={`text-sm ${isExpired ? 'text-destructive' : 'text-foreground'}`}>
              {expiresAt.toLocaleDateString()}
            </p>
            <div className="flex gap-1">
              {isExpired && <Badge variant="destructive" className="text-xs">Expired</Badge>}
              {isExtended && <Badge variant="outline" className="text-xs">Extended</Badge>}
            </div>
          </div>
        </div>
      );
    },
  },
  {
    key: 'created_at',
    header: 'Created',
    sortable: true,
    render: (value) => new Date(value).toLocaleDateString(),
  },
];

export default function DiscussionsPage() {
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDiscussion, setSelectedDiscussion] = useState<Discussion | undefined>();
  const { toast } = useToast();
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [detailsDiscussion, setDetailsDiscussion] = useState<Discussion | null>(null);


  useEffect(() => {
    loadDiscussions();
  }, []);

  const loadDiscussions = async () => {
    try {
      setIsLoading(true);

      const { data: discussionsData, error } = await supabase
        .from('discussions')
        .select(`
          *,
          community:communities(name, city),
          creator:users!discussions_created_by_fkey(name, photo_url),
          comment_count:discussion_comments(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformedData = discussionsData?.map(discussion => ({
        ...discussion,
        comment_count: discussion.comment_count?.[0]?.count || 0,
      })) || [];

      setDiscussions(transformedData as Discussion[]);
    } catch (error) {
      console.error('Error loading discussions:', error);
      toast({
        title: "Error Loading Discussions",
        description: "Failed to load discussions data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleVisibility = (discussion: Discussion) => {
    toast({
      title: "Toggle Visibility",
      description: `${discussion.is_visible ? 'Hide' : 'Show'} ${discussion.title} - Feature coming soon!`,
    });
  };

  const handleExtendExpiry = (discussion: Discussion) => {
    toast({
      title: "Extend Discussion",
      description: `Extend ${discussion.title} - Feature coming soon!`,
    });
  };

  const handleExport = () => {
    toast({
      title: "Export Discussions",
      description: "Export functionality coming soon!",
    });
  };

  // Get unique communities for filtering
  const communities = [...new Set(discussions.map(d => d.community.name))].map(name => ({
    value: name,
    label: name,
  }));

  const visibilityOptions = [
    { value: 'visible', label: 'Visible' },
    { value: 'hidden', label: 'Hidden' },
  ];

  const filters = [
    {
      key: 'community' as keyof Discussion,
      label: 'Community',
      options: communities,
    },
    {
      key: 'is_visible' as keyof Discussion,
      label: 'Visibility',
      options: visibilityOptions,
    },
  ];



  const handleCreate = () => {
    setSelectedDiscussion(undefined);
    setIsModalOpen(true);
  };

  const handleModalSuccess = () => {
    loadDiscussions();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1>Discussions</h1>
          <p className="text-muted-foreground">Manage community discussions and content</p>
        </div>
        <Button onClick={handleCreate} className="admin-focus">
          <Plus className="h-4 w-4 mr-2" />
          Create Discussion
        </Button>
      </div>

      {/* Discussions Table */}
      <DataTable
        data={discussions}
        columns={columns}
        title="Discussions Overview"
        isLoading={isLoading}
        onRefresh={loadDiscussions}
        onExport={handleExport}
        searchPlaceholder="Search discussions..."
        filters={filters}
        onRowClick={(d) => { setDetailsDiscussion(d as Discussion); setIsDetailsOpen(true); }}
      />


      <DiscussionDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        discussion={detailsDiscussion}
        onEdit={() => { if (detailsDiscussion) { setSelectedDiscussion(detailsDiscussion); setIsModalOpen(true); } }}
        onToggleVisibility={() => detailsDiscussion && handleToggleVisibility(detailsDiscussion)}
        onExtendExpiry={() => detailsDiscussion && handleExtendExpiry(detailsDiscussion)}
        onDelete={() => detailsDiscussion && toast({ title: 'Delete Discussion', description: `Delete ${detailsDiscussion.title} - Feature coming soon!`, variant: 'destructive' })}
      />
      <DiscussionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleModalSuccess}
        discussion={selectedDiscussion}
      />
    </div>
  );
}