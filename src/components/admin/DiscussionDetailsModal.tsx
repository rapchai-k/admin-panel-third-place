import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, MessageSquare, Eye, EyeOff, MapPin, Calendar as CalendarIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Discussion {
  id: string;
  title: string;
  prompt?: string;
  community_id: string;
  is_visible: boolean;
  extended: boolean;
  expires_at: string;
  created_by: string;
  created_at?: string;
}

interface DiscussionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  discussion: Discussion | null;
  onEdit?: () => void;
  onToggleVisibility?: () => void;
  onExtendExpiry?: () => void;
  onDelete?: () => void;
}

const safeString = (v: unknown): string => { if (v == null) return ''; try { return String(v); } catch { return ''; } };
const getInitials = (name?: string) => { const s = safeString(name).trim(); if (!s) return 'U'; const p = s.split(/\s+/); return `${p[0]?.[0] ?? ''}${p[p.length-1]?.[0] ?? ''}`.toUpperCase() || 'U'; };

export function DiscussionDetailsModal({ isOpen, onClose, discussion, onEdit, onToggleVisibility, onExtendExpiry, onDelete }: DiscussionDetailsModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [community, setCommunity] = useState<{ name: string; city?: string } | null>(null);
  const [creator, setCreator] = useState<{ name: string; photo_url?: string } | null>(null);
  const [comments, setComments] = useState<Array<{ id: string; created_at: string; user: { name: string; photo_url?: string } }>>([]);

  useEffect(() => {
    const loadDetails = async () => {
      if (!isOpen || !discussion?.id) return;
      try {
        setIsLoading(true);
        const [commRes, creatorRes, commentsRes] = await Promise.all([
          supabase.from('communities').select('name, city').eq('id', discussion.community_id).single(),
          supabase.from('users').select('name, photo_url').eq('id', discussion.created_by).single(),
          supabase
            .from('discussion_comments')
            .select('id, created_at, user:users(name, photo_url)')
            .eq('discussion_id', discussion.id)
            .order('created_at', { ascending: true })
            .limit(10),
        ]);
        setCommunity((commRes as any).data || null);
        setCreator((creatorRes as any).data || null);
        setComments((commentsRes as any).data || []);
      } catch (err) {
        console.error('Error loading discussion details:', err);
        toast({ title: 'Error Loading Discussion', description: 'Failed to load discussion details.', variant: 'destructive' });
      } finally { setIsLoading(false); }
    };
    loadDetails();
  }, [isOpen, discussion?.id]);

  if (!discussion) return null;

  const isExpired = new Date(discussion.expires_at) < new Date();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Discussion Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-semibold">{discussion.title}</h3>
              <div className="flex items-center gap-2">
                {!discussion.is_visible ? <Badge variant="secondary"><EyeOff className="h-3 w-3 mr-1"/>Hidden</Badge> : <Badge variant="default"><Eye className="h-3 w-3 mr-1"/>Visible</Badge>}
                {isExpired && <Badge variant="destructive">Expired</Badge>}
                {discussion.extended && <Badge variant="outline">Extended</Badge>}
              </div>
            </div>
            {discussion.prompt && <p className="text-muted-foreground">{discussion.prompt}</p>}
          </div>

          <Separator />

          {/* Meta */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Community</label>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{community?.name || '—'}</p>
                  <p className="text-sm text-muted-foreground">{community?.city || ''}</p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Creator</label>
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={safeString(creator?.photo_url) || undefined} />
                  <AvatarFallback className="text-[10px]">{getInitials(creator?.name)}</AvatarFallback>
                </Avatar>
                <span className="text-sm">{creator?.name || '—'}</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Expiry</label>
              <div className="flex items-center gap-2 text-sm">
                <CalendarIcon className="h-4 w-4"/>
                {new Date(discussion.expires_at).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Comments */}
          <div className="p-3 rounded-md bg-muted/40">
            <div className="flex items-center gap-2 mb-2"><MessageSquare className="h-4 w-4"/><span className="font-medium">Recent Comments</span></div>
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin"/> Loading…</div>
            ) : comments.length ? (
              <div className="space-y-3">
                {comments.map((c) => (
                  <div key={c.id} className="flex gap-3 p-2 bg-muted/60 rounded">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={safeString(c.user?.photo_url) || undefined} />
                      <AvatarFallback className="text-[10px]">{getInitials(c.user?.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{c.user?.name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No comments yet</p>
            )}
          </div>

          {/* Actions (replaces table dropdown) */}
          <div className="flex items-center justify-end gap-2 pt-2">
            {onToggleVisibility && (
              <Button variant="outline" onClick={onToggleVisibility} className="gap-2">
                {discussion.is_visible ? 'Hide' : 'Show'}
              </Button>
            )}
            {onExtendExpiry && (
              <Button variant="outline" onClick={onExtendExpiry} className="gap-2">
                Extend Expiry
              </Button>
            )}
            {onEdit && (
              <Button variant="default" onClick={onEdit} className="gap-2">
                Edit
              </Button>
            )}
            {onDelete && (
              <Button variant="destructive" onClick={onDelete} className="gap-2">
                Delete Discussion
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}

