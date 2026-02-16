import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { MapPin, Users, Calendar as CalendarIcon, Clock, Trash2, Edit, MessageSquare, Loader2, Link2, Copy, Check, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CommunityModal } from '@/components/admin/CommunityModal';
import { buildCommunityUrl } from '@/lib/short-url';


interface Community {
  id: string;
  name: string;
  description?: string;
  city: string;
  image_url?: string;
  created_at: string;
  member_count?: number;
  event_count?: number;
  slug?: string;
}

interface EventSummary {
  id: string;
  title: string;
  date_time: string | null;
  registration_count?: number;
}

interface DiscussionSummary {
  id: string;
  title: string;
  created_at: string;
  comment_count?: number;
}

interface CommunityDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  community: Community | null;
  onSuccess?: () => void;
}

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

export function CommunityDetailsModal({ isOpen, onClose, community, onSuccess }: CommunityDetailsModalProps) {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [recentEvents, setRecentEvents] = useState<EventSummary[]>([]);
  const [recentDiscussions, setRecentDiscussions] = useState<DiscussionSummary[]>([]);
  const [copied, setCopied] = useState(false);

  const handleCopySlugUrl = async () => {
    if (!community?.slug) return;
    const url = buildCommunityUrl(community.slug);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  useEffect(() => {
    const loadMore = async () => {
      if (!community?.id || !isOpen) return;
      try {
        setIsLoading(true);
        const [eventsRes, discussionsRes] = await Promise.all([
          supabase
            .from('events')
            .select(`id, title, date_time, registration_count:event_registrations(count)`)
            .eq('community_id', community.id)
            .order('date_time', { ascending: false })
            .limit(5),
          supabase
            .from('discussions')
            .select(`id, title, created_at, comment_count:discussion_comments(count)`)
            .eq('community_id', community.id)
            .order('created_at', { ascending: false })
            .limit(5)
        ]);

        const evts = (eventsRes.data || []).map((e: any) => ({
          ...e,
          registration_count: e.registration_count?.[0]?.count || 0,
        }));
        const discs = (discussionsRes.data || []).map((d: any) => ({
          ...d,
          comment_count: d.comment_count?.[0]?.count || 0,
        }));
        setRecentEvents(evts);
        setRecentDiscussions(discs);
      } catch (err) {
        console.error('Error fetching community details for modal:', err);
        toast({
          title: 'Error Loading Community',
          description: 'Failed to load community details.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    loadMore();
  }, [community?.id, isOpen]);

  if (!community) return null;

  const handleDelete = async () => {
    const confirmDelete = window.confirm(`Delete community "${community.name}"? This action cannot be undone.`);
    if (!confirmDelete) return;

    try {
      setIsDeleting(true);
      const { error } = await supabase
        .from('communities')
        .delete()
        .eq('id', community.id);

      if (error) throw error;

      toast({
        title: 'Community Deleted',
        description: `${community.name} has been deleted successfully.`,
        variant: 'destructive',
      });

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Failed to delete community', err);
      toast({
        title: 'Error',
        description: 'Failed to delete community. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Community Details</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start gap-4">
              <Avatar className="h-14 w-14">
                <AvatarImage
                  src={safeString(community.image_url) || undefined}
                  alt={safeString(community.name) || 'Community image'}
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = ''; }}
                />
                <AvatarFallback>
                  {getInitials(community.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">{community.name}</h3>
                <p className="text-sm text-muted-foreground">{community.description || 'No description provided.'}</p>
                <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-4 w-4" /> {community.city}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-4 w-4" /> Created {new Date(community.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-md bg-muted/50">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="font-medium">Members</span>
                </div>
                <p className="mt-1 text-xl font-bold">{community.member_count ?? 0}</p>
              </div>
              <div className="p-3 rounded-md bg-muted/50">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-primary" />
                  <span className="font-medium">Events</span>
                </div>
                <p className="mt-1 text-xl font-bold">{community.event_count ?? 0}</p>
              </div>
            </div>

            {/* Shareable Community URL */}
            {community.slug && (
              <>
                <Separator />
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    <Link2 className="h-4 w-4 text-primary" />
                    Shareable Community Link
                  </label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={buildCommunityUrl(community.slug)}
                      className="font-mono text-sm bg-background"
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                    <Button
                      variant={copied ? 'default' : 'outline'}
                      size="icon"
                      onClick={handleCopySlugUrl}
                      title="Copy link"
                      className="shrink-0"
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => window.open(buildCommunityUrl(community.slug!), '_blank', 'noopener,noreferrer')}
                      title="Open in new tab"
                      className="shrink-0"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                  {copied && (
                    <p className="text-xs text-green-600 font-medium">Copied to clipboard!</p>
                  )}
                </div>
              </>
            )}

            {/* Recent content inside modal to avoid separate view */}
            <div className="grid grid-cols-1 gap-4">
              <div className="p-3 rounded-md bg-muted/40">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarIcon className="h-4 w-4" />
                  <span className="font-medium">Recent Events</span>
                </div>
                {isLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin"/> Loading…</div>
                ) : recentEvents.length ? (
                  <ul className="space-y-2 text-sm">
                    {recentEvents.map(evt => (
                      <li key={evt.id} className="flex items-center justify-between">
                        <div className="truncate mr-2">{evt.title}</div>
                        <Badge variant="outline">{evt.date_time ? new Date(evt.date_time).toLocaleDateString() : 'TBD'}</Badge>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No recent events</p>
                )}
              </div>

              <div className="p-3 rounded-md bg-muted/40">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-4 w-4" />
                  <span className="font-medium">Recent Discussions</span>
                </div>
                {isLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin"/> Loading…</div>
                ) : recentDiscussions.length ? (
                  <ul className="space-y-2 text-sm">
                    {recentDiscussions.map(d => (
                      <li key={d.id} className="flex items-center justify-between">
                        <div className="truncate mr-2">{d.title}</div>
                        <Badge variant="outline">{new Date(d.created_at).toLocaleDateString()}</Badge>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No recent discussions</p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end pt-2 gap-2">
              <Button variant="default" onClick={() => setIsEditModalOpen(true)} className="gap-2">
                <Edit className="h-4 w-4" /> Edit
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={isDeleting} className="gap-2">
                <Trash2 className="h-4 w-4" />
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
              <Button variant="outline" onClick={onClose}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <CommunityModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={() => { setIsEditModalOpen(false); onSuccess?.(); }}
        community={community}
      />
    </>
  );
}

