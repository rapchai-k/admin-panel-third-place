import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Users, Calendar as CalendarIcon, Award, Clock, Share2, Edit, Shield, UserX, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UserSummary {
  id: string;
  name: string;
  email?: string;
  photo_url?: string;
  role: 'user' | 'admin';
  is_banned: boolean;
  created_at: string;
  referral_code?: string;
  referred_by?: string | null;
  community_count?: number;
  event_count?: number;
  badge_count?: number;
}

interface CommunityItem { id: string; name: string; city?: string; image_url?: string; }
interface EventItem { id: string; title: string; date_time: string | null; venue?: string; status?: string; }
interface BadgeItem { badge: string; granted_at: string; }

interface UserDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserSummary | null;
  onEdit?: (user: UserSummary) => void;
  onPromote?: (user: UserSummary) => void;
  onBan?: (user: UserSummary) => void;
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

export function UserDetailsModal({ isOpen, onClose, user, onEdit, onPromote, onBan }: UserDetailsModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [communities, setCommunities] = useState<CommunityItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [badges, setBadges] = useState<BadgeItem[]>([]);
  const [referrerName, setReferrerName] = useState<string | null>(null);

  useEffect(() => {
    const loadDetails = async () => {
      if (!isOpen || !user?.id) return;
      try {
        setIsLoading(true);
        const [cmRes, evRes, bdRes, refRes] = await Promise.all([
          supabase
            .from('community_members')
            .select('community:communities(id,name,city,image_url)')
            .eq('user_id', user.id)
            .limit(5),
          supabase
            .from('event_registrations')
            .select('status, created_at, event:events(id,title,date_time,venue)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(5),
          supabase
            .from('user_badges')
            .select('badge, granted_at')
            .eq('user_id', user.id)
            .order('granted_at', { ascending: false })
            .limit(10),
          user.referred_by
            ? supabase.from('users').select('name').eq('id', user.referred_by).single()
            : Promise.resolve({ data: null }),
        ]);

        setCommunities((cmRes.data || []).map((r: any) => r.community).filter(Boolean));
        setEvents((evRes.data || []).map((r: any) => ({
          id: r.event?.id,
          title: r.event?.title,
          date_time: r.event?.date_time,
          venue: r.event?.venue,
          status: r.status,
        })).filter((e: EventItem) => !!e.id));
        setBadges((bdRes.data || []) as BadgeItem[]);
        setReferrerName((refRes as any)?.data?.name ?? null);
      } catch (err) {
        console.error('Error loading user details:', err);
        toast({ title: 'Error Loading User', description: 'Failed to load user details.', variant: 'destructive' });
      } finally { setIsLoading(false); }
    };
    loadDetails();
  }, [isOpen, user?.id]);

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[650px]">
        <DialogHeader>
          <DialogTitle>User Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start gap-4">
            <Avatar className="h-14 w-14">
              <AvatarImage src={safeString(user.photo_url) || undefined} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = ''; }} />
              <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="text-lg font-semibold">{user.name}</h3>
              {user.email && (
                <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                  <Mail className="h-3 w-3"/> {user.email}
                </div>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>{user.role === 'admin' ? 'Admin' : 'User'}</Badge>
                {user.is_banned && <Badge variant="destructive">Banned</Badge>}
                <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4"/> Joined {new Date(user.created_at).toLocaleDateString()}</span>
                {user.referral_code && (
                  <span className="inline-flex items-center gap-1"><Share2 className="h-4 w-4"/> Ref: <span className="font-mono">{user.referral_code}</span></span>
                )}
                {referrerName && (
                  <span className="inline-flex items-center gap-1">Referred by {referrerName}</span>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 rounded-md bg-muted/50">
              <div className="flex items-center gap-2"><Users className="h-4 w-4 text-primary"/><span className="font-medium">Communities</span></div>
              <p className="mt-1 text-xl font-bold">{user.community_count ?? communities.length}</p>
            </div>
            <div className="p-3 rounded-md bg-muted/50">
              <div className="flex items-center gap-2"><CalendarIcon className="h-4 w-4 text-primary"/><span className="font-medium">Events</span></div>
              <p className="mt-1 text-xl font-bold">{user.event_count ?? events.length}</p>
            </div>
            <div className="p-3 rounded-md bg-muted/50">
              <div className="flex items-center gap-2"><Award className="h-4 w-4 text-primary"/><span className="font-medium">Badges</span></div>
              <p className="mt-1 text-xl font-bold">{user.badge_count ?? badges.length}</p>
            </div>
          </div>

          {/* Recent activity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Communities */}
            <div className="p-3 rounded-md bg-muted/40">
              <div className="flex items-center gap-2 mb-2"><Users className="h-4 w-4"/><span className="font-medium">Joined Communities</span></div>
              {isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin"/> Loading…</div>
              ) : communities.length ? (
                <ul className="space-y-2 text-sm">
                  {communities.map((c) => (
                    <li key={c.id} className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={c.image_url || ''} />
                        <AvatarFallback className="text-[10px]">{getInitials(c.name)}</AvatarFallback>
                      </Avatar>
                      <span className="truncate">{c.name}</span>
                      {c.city && <Badge variant="outline" className="ml-auto">{c.city}</Badge>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No communities</p>
              )}
            </div>

            {/* Events */}
            <div className="p-3 rounded-md bg-muted/40">
              <div className="flex items-center gap-2 mb-2"><CalendarIcon className="h-4 w-4"/><span className="font-medium">Recent Events</span></div>
              {isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin"/> Loading…</div>
              ) : events.length ? (
                <ul className="space-y-2 text-sm">
                  {events.map((e) => (
                    <li key={e.id} className="flex items-center justify-between">
                      <span className="truncate mr-2">{e.title}</span>
                      <Badge variant="outline">{e.date_time ? new Date(e.date_time).toLocaleDateString() : 'TBD'}</Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No recent events</p>
              )}
            </div>
          </div>

          {/* Badges */}
          <div className="p-3 rounded-md bg-muted/40">
            <div className="flex items-center gap-2 mb-2"><Award className="h-4 w-4"/><span className="font-medium">Badges</span></div>
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin"/> Loading…</div>
            ) : badges.length ? (
              <div className="flex flex-wrap gap-2">
                {badges.map((b, idx) => (
                  <Badge key={idx} variant="secondary" className="capitalize">{b.badge}</Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No badges yet</p>
            )}
          </div>

          {/* Actions (replaces table dropdown) */}
          <div className="flex items-center justify-end gap-2 pt-2">
            {onPromote && (
              <Button variant="outline" onClick={() => onPromote(user)} className="gap-2"><Shield className="h-4 w-4"/> Promote to Admin</Button>
            )}
            {onBan && (
              <Button variant="destructive" onClick={() => onBan(user)} className="gap-2"><UserX className="h-4 w-4"/> Ban User</Button>
            )}
            {onEdit && (
              <Button variant="default" onClick={() => onEdit(user)} className="gap-2"><Edit className="h-4 w-4"/> Edit</Button>
            )}
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

