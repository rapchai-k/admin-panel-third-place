import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  MessageSquare,
  Eye,
  EyeOff,
  Clock,
  MapPin,
  Calendar,
  Edit,
  Trash2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user: {
    name: string;
    photo_url?: string;
  };
}

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
    description?: string;
  };
  creator: {
    name: string;
    photo_url?: string;
  };
  comments: Comment[];
}

export default function DiscussionDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [discussion, setDiscussion] = useState<Discussion | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadDiscussion(id);
    }
  }, [id]);

  const loadDiscussion = async (discussionId: string) => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('discussions')
        .select(`
          *,
          community:communities(name, city, description),
          creator:users!discussions_created_by_fkey(name, photo_url)
        `)
        .eq('id', discussionId)
        .single();

      if (error) throw error;

      // Load comments separately
      const { data: commentsData } = await supabase
        .from('discussion_comments')
        .select(`
          id,
          created_at,
          user:users(name, photo_url)
        `)
        .eq('discussion_id', discussionId)
        .order('created_at', { ascending: true });

      const transformedDiscussion = {
        ...data,
        comments: commentsData?.map(comment => ({
          id: comment.id,
          content: 'Comment content not available', // Placeholder since content column doesn't exist
          created_at: comment.created_at,
          user: comment.user as Comment['user'],
        })) || [],
      } as Discussion;

      setDiscussion(transformedDiscussion);
    } catch (error) {
      console.error('Error loading discussion:', error);
      toast({
        title: "Error Loading Discussion",
        description: "Failed to load discussion details.",
        variant: "destructive",
      });
      navigate('/admin/discussions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleVisibility = async () => {
    if (!discussion) return;

    try {
      const { error } = await supabase
        .from('discussions')
        .update({ is_visible: !discussion.is_visible })
        .eq('id', discussion.id);

      if (error) throw error;

      setDiscussion(prev => prev ? { ...prev, is_visible: !prev.is_visible } : null);
      toast({
        title: "Visibility Updated",
        description: `Discussion is now ${!discussion.is_visible ? 'visible' : 'hidden'}.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update discussion visibility.",
        variant: "destructive",
      });
    }
  };

  const handleExtendExpiry = () => {
    toast({
      title: "Extend Discussion",
      description: "Extend expiry feature coming soon!",
    });
  };

  const handleEdit = () => {
    toast({
      title: "Edit Discussion",
      description: "Edit discussion feature coming soon!",
    });
  };

  const handleDelete = () => {
    toast({
      title: "Delete Discussion",
      description: "Delete discussion feature coming soon!",
      variant: "destructive",
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/discussions')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Discussions
          </Button>
        </div>
        <div className="space-y-4">
          <div className="h-8 bg-muted animate-pulse rounded" />
          <div className="h-24 bg-muted animate-pulse rounded" />
          <div className="h-32 bg-muted animate-pulse rounded" />
        </div>
      </div>
    );
  }

  if (!discussion) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/discussions')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Discussions
          </Button>
        </div>
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">Discussion not found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const expiresAt = new Date(discussion.expires_at);
  const now = new Date();
  const isExpired = expiresAt < now;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/discussions')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Discussions
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleToggleVisibility}>
            {discussion.is_visible ? (
              <>
                <EyeOff className="h-4 w-4 mr-2" />
                Hide
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Show
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExtendExpiry}>
            <Clock className="h-4 w-4 mr-2" />
            Extend
          </Button>
          <Button variant="outline" size="sm" onClick={handleEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Discussion Info */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <CardTitle className="text-2xl">{discussion.title}</CardTitle>
              <CardDescription className="text-base">
                {discussion.prompt || 'No prompt provided'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {discussion.is_visible ? (
                <Badge variant="default">
                  <Eye className="h-3 w-3 mr-1" />
                  Visible
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <EyeOff className="h-3 w-3 mr-1" />
                  Hidden
                </Badge>
              )}
              {isExpired && <Badge variant="destructive">Expired</Badge>}
              {discussion.extended && <Badge variant="outline">Extended</Badge>}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Meta Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Community</label>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{discussion.community.name}</p>
                  <p className="text-sm text-muted-foreground">{discussion.community.city}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Created By</label>
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={discussion.creator.photo_url} />
                  <AvatarFallback className="text-xs">
                    {discussion.creator.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium">{discussion.creator.name}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Expires At</label>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className={`font-medium ${isExpired ? 'text-destructive' : 'text-foreground'}`}>
                    {expiresAt.toLocaleDateString()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {expiresAt.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Timestamps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>Created: {new Date(discussion.created_at).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>Updated: {new Date(discussion.updated_at).toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Comments ({discussion.comments?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {discussion.comments && discussion.comments.length > 0 ? (
            <div className="space-y-4">
              {discussion.comments.map((comment) => (
                <div key={comment.id} className="flex gap-3 p-4 bg-muted/50 rounded-lg">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={comment.user.photo_url} />
                    <AvatarFallback className="text-xs">
                      {comment.user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{comment.user.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(comment.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm">{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No comments yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}