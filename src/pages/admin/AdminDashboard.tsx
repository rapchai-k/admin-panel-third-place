import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Users,
  MapPin,
  Calendar,
  UserCheck,
  MessageSquare,
  Plus,
  ArrowUpRight,
  CreditCard,
  Flag,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useCurrency } from '@/context/CurrencyProvider';
import { EventModal } from '@/components/admin/EventModal';
import { CommunityModal } from '@/components/admin/CommunityModal';
import { UserModal } from '@/components/admin/UserModal';
import { DiscussionModal } from '@/components/admin/DiscussionModal';

// ── Types ─────────────────────────────────────────────────────────────
interface FlagRow {
  id: string;
  reason: string;
  status: string;
  created_at: string;
  flagged_user: { name: string } | null;
  flagged_by: { name: string } | null;
}

interface RegistrationRow {
  id: string;
  status: string;
  created_at: string;
  user: { name: string } | null;
  event: { title: string } | null;
}

interface PaymentRow {
  id: string;
  amount: number;
  payment_status: string | null;
  created_at: string;
  user: { name: string } | null;
  event: { title: string } | null;
}

interface UserRow {
  id: string;
  name: string;
  created_at: string;
  is_banned: boolean;
}

interface CommunityRow {
  id: string;
  name: string;
  city: string;
  created_at: string;
}

interface DashboardData {
  flags: FlagRow[];
  registrations: RegistrationRow[];
  payments: PaymentRow[];
  users: UserRow[];
  communities: CommunityRow[];
}

// ── Create Actions config ─────────────────────────────────────────────
type ModalKey = 'event' | 'community' | 'user' | 'discussion';
type CreateAction = {
  label: string;
  icon: typeof Calendar;
  color: string;
  bg: string;
} & ({ modal: ModalKey; route?: never } | { route: string; modal?: never });

const createActions: CreateAction[] = [
  { label: 'Create Event', icon: Calendar, modal: 'event', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/40' },
  { label: 'Add Community', icon: MapPin, modal: 'community', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
  { label: 'Create User', icon: Users, modal: 'user', color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-950/40' },
  { label: 'New Discussion', icon: MessageSquare, modal: 'discussion', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40' },
  { label: 'New Registration', icon: UserCheck, route: '/admin/registrations', color: 'text-pink-600 dark:text-pink-400', bg: 'bg-pink-50 dark:bg-pink-950/40' },
  { label: 'Record Payment', icon: CreditCard, route: '/admin/payments', color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-50 dark:bg-teal-950/40' },
];

// ── Helper: relative time ─────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

// ── Component ─────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [openModal, setOpenModal] = useState<ModalKey | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleCreateAction = (action: CreateAction) => {
    if (action.modal) {
      setOpenModal(action.modal);
    } else {
      navigate(action.route);
    }
  };

  const handleModalSuccess = () => {
    setOpenModal(null);
    loadDashboard();
  };

  const loadDashboard = async () => {
    try {
      setIsLoading(true);

      const [flagsRes, regsRes, paymentsRes, usersRes, communitiesRes] = await Promise.all([
        supabase
          .from('flags')
          .select('id, reason, status, created_at, flagged_user:flagged_user_id(name), flagged_by:flagged_by_id(name)')
          .in('status', ['open', 'urgent'])
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('event_registrations')
          .select('id, status, created_at, user:user_id(name), event:event_id(title)')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('payment_sessions')
          .select('id, amount, payment_status, created_at, user:user_id(name), event:event_id(title)')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('users')
          .select('id, name, created_at, is_banned')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('communities')
          .select('id, name, city, created_at')
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      setData({
        flags: (flagsRes.data as unknown as FlagRow[]) || [],
        registrations: (regsRes.data as unknown as RegistrationRow[]) || [],
        payments: (paymentsRes.data as unknown as PaymentRow[]) || [],
        users: (usersRes.data as UserRow[]) || [],
        communities: (communitiesRes.data as CommunityRow[]) || [],
      });
    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast({
        title: 'Error Loading Dashboard',
        description: 'Failed to load dashboard data.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ── Loading skeleton ──────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Loading your command center…</p>
        </div>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to your community platform control center</p>
      </div>

      {/* ── Create Actions ───────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Quick Create</h2>
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {createActions.map((action) => (
            <button
              key={action.label}
              onClick={() => handleCreateAction(action)}
              className={`group relative flex flex-col items-center gap-3 rounded-xl border p-6 ${action.bg} hover:shadow-lg admin-transition cursor-pointer text-center`}
            >
              <div className={`rounded-full p-3 bg-white/80 dark:bg-white/10 shadow-sm group-hover:scale-110 admin-transition`}>
                <action.icon className={`h-6 w-6 ${action.color}`} />
              </div>
              <span className="text-sm font-medium">{action.label}</span>
              <Plus className="absolute top-2 right-2 h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 admin-transition" />
            </button>
          ))}
        </div>
      </section>

      {/* ── View Actions (latest data cards) ─────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold mb-4">At a Glance</h2>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">

          {/* Open Flags */}
          <Card className="admin-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flag className="h-4 w-4 text-destructive" />
                  <CardTitle className="text-base">Open Flags</CardTitle>
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => navigate('/admin/moderation')}>
                  View All <ArrowUpRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {data?.flags.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-3">No open flags 🎉</p>
              ) : (
                data?.flags.map((f) => (
                  <div key={f.id} className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{f.flagged_user?.name || 'Unknown user'}</p>
                      <p className="text-xs text-muted-foreground truncate">{f.reason}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant={f.status === 'urgent' ? 'destructive' : 'secondary'} className="text-xs">
                        {f.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo(f.created_at)}</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Latest Registrations */}
          <Card className="admin-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-pink-500" />
                  <CardTitle className="text-base">Latest Registrations</CardTitle>
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => navigate('/admin/registrations')}>
                  View All <ArrowUpRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {data?.registrations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-3">No registrations yet</p>
              ) : (
                data?.registrations.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{r.user?.name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground truncate">{r.event?.title || 'Unknown event'}</p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">{timeAgo(r.created_at)}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Latest Payments */}
          <Card className="admin-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-teal-500" />
                  <CardTitle className="text-base">Latest Payments</CardTitle>
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => navigate('/admin/payments')}>
                  View All <ArrowUpRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {data?.payments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-3">No payments yet</p>
              ) : (
                data?.payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{p.user?.name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground truncate">{p.event?.title || 'Unknown event'}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant={p.payment_status === 'paid' ? 'default' : 'secondary'} className="text-xs">
                        {p.payment_status === 'paid' ? formatCurrency(p.amount) : p.payment_status || 'pending'}
                      </Badge>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo(p.created_at)}</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Latest Users */}
          <Card className="admin-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-violet-500" />
                  <CardTitle className="text-base">Latest Users</CardTitle>
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => navigate('/admin/users')}>
                  View All <ArrowUpRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {data?.users.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-3">No users yet</p>
              ) : (
                data?.users.map((u) => (
                  <div key={u.id} className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2">
                    <p className="text-sm font-medium truncate">{u.name}</p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {u.is_banned && <Badge variant="destructive" className="text-xs">Banned</Badge>}
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo(u.created_at)}</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Latest Communities */}
          <Card className="admin-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-emerald-500" />
                  <CardTitle className="text-base">Latest Communities</CardTitle>
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => navigate('/admin/communities')}>
                  View All <ArrowUpRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {data?.communities.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-3">No communities yet</p>
              ) : (
                data?.communities.map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{c.city}</p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">{timeAgo(c.created_at)}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

        </div>
      </section>

      {/* ── Creation Modals ───────────────────────────────────────── */}
      <EventModal
        isOpen={openModal === 'event'}
        onClose={() => setOpenModal(null)}
        onSuccess={handleModalSuccess}
      />
      <CommunityModal
        isOpen={openModal === 'community'}
        onClose={() => setOpenModal(null)}
        onSuccess={handleModalSuccess}
      />
      <UserModal
        isOpen={openModal === 'user'}
        onClose={() => setOpenModal(null)}
        onSuccess={handleModalSuccess}
      />
      <DiscussionModal
        isOpen={openModal === 'discussion'}
        onClose={() => setOpenModal(null)}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
}