import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Users,
  Calendar,
  MessageSquare,
  MapPin,
  User,
  Edit,
  Trash2,
  Globe,
  Clock,
  Star,
  TrendingUp
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Community {
  id: string;
  name: string;
  description?: string;
  city: string;
  state?: string;
  country?: string;
  image_url?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  creator: {
    name: string;
    photo_url?: string;
  };
  member_count?: number;
  event_count?: number;
  discussion_count?: number;
  recent_events?: Array<{
    id: string;
    title: string;
    date_time: string | null;
    registration_count?: number;
  }>;
  recent_discussions?: Array<{
    id: string;
    title: string;
    created_at: string;
    comment_count?: number;
  }>;
  top_members?: Array<{
    id: string;
    name: string;
    photo_url?: string;
    event_count?: number;
  }>;
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


export default function CommunityDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [community, setCommunity] = useState<Community | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadCommunity(id);
    }
  }, [id]);

  const loadCommunity = async (communityId: string) => {
    try {
      setIsLoading(true);

      // Load community basic info
      const { data, error } = await supabase
        .from('communities')
        .select(`
          *,
          creator:users!communities_created_by_fkey(name, photo_url),
          member_count:community_members(count),
          event_count:events(count),
          discussion_count:discussions(count)
        `)
        .eq('id', communityId)
        .single();

      if (error) throw error;

      // Load recent events (excluding parent templates)
      const { data: recentEvents } = await supabase
        .from('events')
        .select(`
          id,
          title,
          date_time,
          registration_count:event_registrations(count)
        `)
        .eq('community_id', communityId)
        .order('date_time', { ascending: false })
        .limit(5);

      // Load recent discussions
      const { data: recentDiscussions } = await supabase
        .from('discussions')
        .select(`
          id,
          title,
          created_at,
          comment_count:discussion_comments(count)
        `)
        .eq('community_id', communityId)
        .order('created_at', { ascending: false })
        .limit(5);

      // Transform data
      const transformedCommunity: Community = {
        id: data.id,
        name: data.name,
        description: data.description,
        city: data.city,
        state: undefined,
        country: undefined,
        image_url: data.image_url,
        created_by: 'unknown',
        created_at: data.created_at,
        updated_at: data.updated_at,
        creator: Array.isArray(data.creator) ? data.creator[0] : data.creator,
        member_count: data.member_count?.[0]?.count || 0,
        event_count: data.event_count?.[0]?.count || 0,
        discussion_count: data.discussion_count?.[0]?.count || 0,
        recent_events: recentEvents?.map(event => ({
          ...event,
          registration_count: event.registration_count?.[0]?.count || 0,
        })) || [],
        recent_discussions: recentDiscussions?.map(discussion => ({
          ...discussion,
          comment_count: discussion.comment_count?.[0]?.count || 0,
        })) || [],
      };

      setCommunity(transformedCommunity);
    } catch (error) {
      console.error('Error loading community:', error);
      toast({
        title: "Error Loading Community",
        description: "Failed to load community details.",
        variant: "destructive",
      });
      navigate('/admin/communities');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = () => {
    toast({
      title: "Edit Community",
      description: "Edit community feature coming soon!",
    });
  };

  const handleDelete = () => {
    toast({
      title: "Delete Community",
      description: "Delete community feature coming soon!",
      variant: "destructive",
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/communities')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Communities
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

  if (!community) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/communities')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Communities
          </Button>
        </div>
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">Community not found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/communities')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Communities
          </Button>
        </div>
        <div className="flex items-center gap-2">
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

      {/* Community Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage
                src={safeString(community.image_url) || undefined}
                alt={safeString(community.name) || 'Community image'}
                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = ''; }}
              />
              <AvatarFallback className="text-xl">
                {getInitials(community.name)}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2 flex-1">
              <CardTitle className="text-2xl">{community.name}</CardTitle>
              <CardDescription className="text-base">
                {community.description || 'No description provided'}
              </CardDescription>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {community.city}
                  {community.state && `, ${community.state}`}
                  {community.country && `, ${community.country}`}
                </div>
                <div className="flex items-center gap-1">
                  <Globe className="h-4 w-4" />
                  Created {new Date(community.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Users className="h-5 w-5 text-primary" />
                  <span className="text-2xl font-bold">{community.member_count}</span>
                </div>
                <p className="text-sm text-muted-foreground">Members</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Calendar className="h-5 w-5 text-success" />
                  <span className="text-2xl font-bold">{community.event_count}</span>
                </div>
                <p className="text-sm text-muted-foreground">Events</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <MessageSquare className="h-5 w-5 text-warning" />
                  <span className="text-2xl font-bold">{community.discussion_count}</span>
                </div>
                <p className="text-sm text-muted-foreground">Discussions</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-info" />
                  <span className="text-2xl font-bold">
                    {Math.round(((community.event_count || 0) + (community.discussion_count || 0)) / Math.max(1, (community.member_count || 1)) * 100)}%
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">Activity Rate</p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Community Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Events */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recent Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            {community.recent_events && community.recent_events.length > 0 ? (
              <div className="space-y-3">
                {community.recent_events.map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">{event.title}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {event.date_time ? new Date(event.date_time).toLocaleDateString() : 'TBD'}
                      </div>
                    </div>
                    <Badge variant="outline">
                      {event.registration_count || 0} registered
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No events yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Discussions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Recent Discussions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {community.recent_discussions && community.recent_discussions.length > 0 ? (
              <div className="space-y-3">
                {community.recent_discussions.map((discussion) => (
                  <div key={discussion.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">{discussion.title}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(discussion.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <Badge variant="outline">
                      {discussion.comment_count || 0} comments
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No discussions yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Creator Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Community Creator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage
                src={safeString(community.creator.photo_url) || undefined}
                alt={safeString(community.creator.name) || 'Creator avatar'}
                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = ''; }}
              />
              <AvatarFallback>
                {getInitials(community.creator.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{community.creator.name}</p>
              <p className="text-sm text-muted-foreground">
                Founded this community on {new Date(community.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}