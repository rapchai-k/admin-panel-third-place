import { useEffect, useState } from 'react';
import { DataTable, Column } from '@/components/admin/DataTable';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Flag, MessageSquare, User, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FlagDetailsModal } from '@/components/admin/FlagDetailsModal';
import { logAdminAction } from '@/lib/admin-audit';
import { AdminActions, AdminTargets } from '@/lib/admin-events';

interface Flag {
  id: string;
  reason: string;
  created_at: string;
  status: 'open' | 'resolved' | 'urgent';
  resolved_at?: string;
  resolved_by?: string;
  flagged_by: {
    name: string;
    photo_url?: string;
  };
  flagged_user: {
    id: string;
    name: string;
    photo_url?: string;
  };
  comment?: {
    text: string;
    discussion: {
      title: string;
      community: {
        name: string;
      };
    };
  };
}

const columns: Column<Flag>[] = [
  {
    key: 'reason',
    header: 'Flag Reason',
    sortable: true,
    filterable: true,
    render: (value, row) => (
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          row.status === 'urgent' ? 'bg-red-100 text-red-600' :
          row.status === 'resolved' ? 'bg-green-100 text-green-600' :
          'bg-orange-100 text-orange-600'
        }`}>
          <Flag className="h-5 w-5" />
        </div>
        <div>
          <p className="font-medium">{value}</p>
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">
              Flag #{row.id.slice(0, 8)}...
            </p>
            <Badge variant={
              row.status === 'urgent' ? 'destructive' :
              row.status === 'resolved' ? 'default' :
              'secondary'
            } className="text-xs">
              {row.status}
            </Badge>
          </div>
        </div>
      </div>
    ),
  },
  {
    key: 'flagged_user',
    header: 'Flagged User',
    sortable: true,
    render: (_value, row) => (
      <div className="flex items-center gap-2">
        <Avatar className="h-8 w-8">
          <AvatarImage src={row.flagged_user.photo_url} />
          <AvatarFallback className="text-xs">
            {row.flagged_user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="font-medium">{row.flagged_user.name}</span>
      </div>
    ),
  },
  {
    key: 'flagged_by',
    header: 'Reported By',
    render: (_value, row) => (
      <div className="flex items-center gap-2">
        <Avatar className="h-6 w-6">
          <AvatarImage src={row.flagged_by.photo_url} />
          <AvatarFallback className="text-xs">
            {row.flagged_by.name.split(' ').map(n => n[0]).join('').toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm">{row.flagged_by.name}</span>
      </div>
    ),
  },
  {
    key: 'comment',
    header: 'Content',
    render: (_value, row) => (
      <div>
        {row.comment ? (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Comment</span>
            </div>
            <p className="text-sm text-muted-foreground truncate max-w-[200px]">
              "{row.comment.text}"
            </p>
            <p className="text-xs text-muted-foreground">
              in {row.comment.discussion.title}
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">User Profile</span>
          </div>
        )}
      </div>
    ),
  },
  {
    key: 'created_at',
    header: 'Reported',
    sortable: true,
    render: (value) => (
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <div>
          <p className="text-sm">{new Date(value).toLocaleDateString()}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(value).toLocaleTimeString()}
          </p>
        </div>
      </div>
    ),
  },
];

export default function ModerationPage() {
  const [flags, setFlags] = useState<Flag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFlag, setSelectedFlag] = useState<Flag | null>(null);
  const [isFlagDetailsModalOpen, setIsFlagDetailsModalOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadFlags();
  }, []);

  const loadFlags = async () => {
    try {
      setIsLoading(true);
      
      const { data: flagsData, error } = await supabase
        .from('flags')
        .select(`
          *,
          flagged_by:users!flags_flagged_by_id_fkey(id, name, photo_url),
          flagged_user:users!flags_flagged_user_id_fkey(id, name, photo_url),
          comment:discussion_comments(
            text,
            discussion:discussions(
              title,
              community:communities(name)
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformedData = flagsData?.map(flag => ({
        ...flag,
        comment: (flag.comment as any)?.[0] || null,
      })) || [];

      setFlags(transformedData as Flag[]);
    } catch (error) {
      console.error('Error loading flags:', error);
      toast({
        title: "Error Loading Flags",
        description: "Failed to load flagged content.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolveFlag = async (flag: Flag) => {
    try {
      const { error } = await supabase
        .from('flags')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolved_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', flag.id);

      if (error) throw error;

      logAdminAction({
        action: AdminActions.FLAG_RESOLVE,
        targetType: AdminTargets.FLAG,
        targetId: flag.id,
        previousState: { status: flag.status },
        newState: { status: 'resolved' },
      });

      toast({
        title: "Flag Resolved",
        description: `Flag has been resolved successfully.`,
      });

      loadFlags();
    } catch (error) {
      console.error('Error resolving flag:', error);
      toast({
        title: "Error",
        description: "Failed to resolve flag.",
        variant: "destructive",
      });
    }
  };

  const handleDismissFlag = async (flag: Flag) => {
    try {
      const { error } = await supabase
        .from('flags')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolved_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', flag.id);

      if (error) throw error;

      logAdminAction({
        action: AdminActions.FLAG_DISMISS,
        targetType: AdminTargets.FLAG,
        targetId: flag.id,
        previousState: { status: flag.status },
        newState: { status: 'resolved' },
        metadata: { dismissed: true },
      });

      toast({
        title: "Flag Dismissed",
        description: `Flag has been dismissed successfully.`,
      });

      loadFlags();
    } catch (error) {
      console.error('Error dismissing flag:', error);
      toast({
        title: "Error",
        description: "Failed to dismiss flag.",
        variant: "destructive",
      });
    }
  };

  const handleBanUser = (flag: Flag) => {
    toast({
      title: "Ban User",
      description: `Ban ${flag.flagged_user.name} - Feature coming soon!`,
      variant: "destructive",
    });
  };

  const handleExport = () => {
    toast({
      title: "Export Flags",
      description: "Export functionality coming soon!",
    });
  };

  const handleMarkUrgent = async (flag: Flag) => {
    try {
      const { error } = await supabase
        .from('flags')
        .update({ status: 'urgent' })
        .eq('id', flag.id);

      if (error) throw error;

      logAdminAction({
        action: AdminActions.FLAG_URGENT,
        targetType: AdminTargets.FLAG,
        targetId: flag.id,
        previousState: { status: flag.status },
        newState: { status: 'urgent' },
      });

      toast({
        title: "Flag Marked Urgent",
        description: `Flag has been marked as urgent.`,
        variant: "destructive",
      });

      loadFlags();
    } catch (error) {
      console.error('Error marking flag urgent:', error);
      toast({
        title: "Error",
        description: "Failed to mark flag as urgent.",
        variant: "destructive",
      });
    }
  };

  // Get unique reasons and statuses for filtering
  const reasons = [...new Set(flags.map(f => f.reason))].map(reason => ({
    value: reason,
    label: reason,
  }));

  const statuses = [
    { value: 'open', label: 'Open' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'urgent', label: 'Urgent' },
  ];

  const filters = [
    {
      key: 'reason' as keyof Flag,
      label: 'Reason',
      options: reasons,
    },
    {
      key: 'status' as keyof Flag,
      label: 'Status',
      options: statuses,
    },
  ];

  const actions = [
    {
      label: 'View Details',
      onClick: (flag: Flag) => {
        setSelectedFlag(flag);
        setIsFlagDetailsModalOpen(true);
      },
    },
    {
      label: 'Contact Reporter',
      onClick: (flag: Flag) => {
        toast({
          title: "Contact Reporter",
          description: `Contact ${flag.flagged_by.name} - Feature coming soon!`,
        });
      },
    },
    {
      label: 'Mark Urgent',
      onClick: handleMarkUrgent,
      variant: 'destructive' as const,
      show: (flag: Flag) => flag.status !== 'urgent',
    },
    {
      label: 'Resolve Flag',
      onClick: handleResolveFlag,
      show: (flag: Flag) => flag.status !== 'resolved',
    },
    {
      label: 'Dismiss Flag',
      onClick: handleDismissFlag,
      show: (flag: Flag) => flag.status !== 'resolved',
    },
    {
      label: 'Ban User',
      onClick: handleBanUser,
      variant: 'destructive' as const,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1>Content Moderation</h1>
          <p className="text-muted-foreground">Review and manage flagged content and users</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            {flags.length} pending
          </Badge>
        </div>
      </div>

      {/* Moderation Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center gap-2 mb-2">
            <Flag className="h-5 w-5 text-orange-500" />
            <h3 className="font-medium">Open Flags</h3>
          </div>
          <p className="text-2xl font-bold">{flags.filter(f => f.status === 'open').length}</p>
        </div>
        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <h3 className="font-medium">Urgent Flags</h3>
          </div>
          <p className="text-2xl font-bold">{flags.filter(f => f.status === 'urgent').length}</p>
        </div>
        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-5 w-5 text-success" />
            <h3 className="font-medium">Resolved Today</h3>
          </div>
          <p className="text-2xl font-bold">
            {flags.filter(f => 
              f.status === 'resolved' && 
              f.resolved_at && 
              new Date(f.resolved_at).toDateString() === new Date().toDateString()
            ).length}
          </p>
        </div>
        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-medium">Total Flags</h3>
          </div>
          <p className="text-2xl font-bold">{flags.length}</p>
        </div>
      </div>

      {/* Flags Table */}
      <DataTable
        data={flags}
        columns={columns}
        title="Flagged Content"
        isLoading={isLoading}
        onRefresh={loadFlags}
        onExport={handleExport}
        searchPlaceholder="Search flags..."
        filters={filters}
        actions={actions}
      />

      <FlagDetailsModal
        isOpen={isFlagDetailsModalOpen}
        onClose={() => setIsFlagDetailsModalOpen(false)}
        flag={selectedFlag}
        onSuccess={loadFlags}
      />
    </div>
  );
}