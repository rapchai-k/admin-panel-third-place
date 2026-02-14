import { useEffect, useState, useMemo } from 'react';
import { DataTable, Column } from '@/components/admin/DataTable';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CreditCard, Clock, Calendar, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCurrency } from '@/context/CurrencyProvider';
import { PaymentDetailsModal } from '@/components/admin/PaymentDetailsModal';

interface PaymentLog {
  id: string;
  event_type: string;
  event_data: any;
  created_at: string;
}

interface Payment {
  id: string;
  user_id: string;
  event_id: string;
  amount: number;
  currency: string;
  status: string;
  payment_status: string | null;
  payment_url: string | null;
  razorpay_payment_link_id: string | null;
  razorpay_payment_id: string | null;
  gateway: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
  user: {
    name: string;
    email?: string;
    photo_url?: string;
  };
  event: {
    title: string;
    date_time: string | null;
    venue: string;
    community: { name: string } | null;
  };
  payment_logs: PaymentLog[];
  display_status: string;
}

function getDisplayStatus(ps: { payment_status: string | null; expires_at: string }): string {
  const status = ps.payment_status;
  if (status === 'paid') return 'paid';
  if (status === 'failed') return 'failed';
  if (status === 'cancelled') return 'cancelled';
  if (status === 'refunded') return 'refunded';
  if (status === 'expired') return 'expired';
  if (status === 'yet_to_pay') {
    return new Date(ps.expires_at) < new Date() ? 'expired' : 'yet_to_pay';
  }
  return status || 'unknown';
}

const statusBadge = (displayStatus: string) => {
  switch (displayStatus) {
    case 'paid':
      return <Badge variant="default" className="bg-green-600">Paid</Badge>;
    case 'yet_to_pay':
      return <Badge variant="secondary" className="bg-yellow-600 text-white">Yet to Pay</Badge>;
    case 'expired':
      return <Badge variant="destructive" className="bg-red-600">Expired</Badge>;
    case 'failed':
      return <Badge variant="destructive">Failed</Badge>;
    case 'cancelled':
      return <Badge variant="destructive" className="bg-orange-600 text-white">Cancelled</Badge>;
    case 'refunded':
      return <Badge variant="secondary" className="bg-blue-600 text-white">Refunded</Badge>;
    default:
      return <Badge variant="outline">{displayStatus}</Badge>;
  }
};

const columns: Column<Payment>[] = [
  {
    key: 'user',
    header: 'User',
    sortable: true,
    render: (_value, row) => (
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={row.user.photo_url} />
          <AvatarFallback className="text-xs">
            {row.user.name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium text-sm">{row.user.name}</p>
          {row.user.email && <p className="text-xs text-muted-foreground">{row.user.email}</p>}
        </div>
      </div>
    ),
  },
  {
    key: 'event',
    header: 'Event',
    sortable: true,
    render: (_value, row) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
          <Calendar className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="font-medium text-sm">{row.event.title}</p>
          {row.event.community && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span>{row.event.community.name}</span>
            </div>
          )}
        </div>
      </div>
    ),
  },
  {
    key: 'amount',
    header: 'Amount',
    sortable: true,
    render: (value) => (
      <span className="font-medium">₹{Number(value).toLocaleString('en-IN')}</span>
    ),
  },
  {
    key: 'display_status',
    header: 'Status',
    sortable: true,
    filterable: true,
    render: (value) => statusBadge(value),
  },
  {
    key: 'gateway',
    header: 'Gateway',
    sortable: true,
    filterable: true,
    render: (value) => (
      <Badge variant="outline" className="capitalize">{value || 'razorpay'}</Badge>
    ),
  },
  {
    key: 'created_at',
    header: 'Created',
    sortable: true,
    render: (value) => (
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <div>
          <p className="text-sm">{new Date(value).toLocaleDateString()}</p>
          <p className="text-xs text-muted-foreground">{new Date(value).toLocaleTimeString()}</p>
        </div>
      </div>
    ),
  },
];

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      setIsLoading(true);

      // 1. Fetch payment sessions with payment_logs (reverse FK exists)
      const { data: sessions, error: sessionsError } = await supabase
        .from('payment_sessions')
        .select(`
          *,
          payment_logs(id, event_type, event_data, created_at)
        `)
        .order('created_at', { ascending: false });

      if (sessionsError) throw sessionsError;
      if (!sessions || sessions.length === 0) {
        setPayments([]);
        return;
      }

      // 2. Collect unique user_ids and event_ids
      const userIds = [...new Set(sessions.map(s => s.user_id))];
      const eventIds = [...new Set(sessions.map(s => s.event_id))];

      // 3. Batch-fetch users, events (with community), and emails in parallel
      const [usersResult, eventsResult, ...emailResults] = await Promise.all([
        supabase.from('users').select('id, name, photo_url').in('id', userIds),
        supabase.from('events').select('id, title, date_time, venue, community:communities(name)').in('id', eventIds),
        ...userIds.map(uid => supabase.rpc('get_user_email', { _user_id: uid })),
      ]);

      // Build lookup maps
      const userMap = new Map<string, { name: string; photo_url?: string; email?: string }>();
      (usersResult.data || []).forEach((u, _i) => {
        userMap.set(u.id, { name: u.name, photo_url: u.photo_url ?? undefined });
      });
      // Attach emails
      userIds.forEach((uid, i) => {
        const existing = userMap.get(uid);
        if (existing) existing.email = emailResults[i]?.data || undefined;
      });

      const eventMap = new Map<string, { title: string; date_time: string | null; venue: string; community: { name: string } | null }>();
      (eventsResult.data || []).forEach(e => {
        eventMap.set(e.id, {
          title: e.title,
          date_time: e.date_time,
          venue: e.venue,
          community: e.community as { name: string } | null,
        });
      });

      // 4. Merge into Payment objects
      const merged: Payment[] = sessions.map(s => {
        const user = userMap.get(s.user_id) || { name: 'Unknown User' };
        const event = eventMap.get(s.event_id) || { title: 'Unknown Event', date_time: null, venue: '-', community: null };
        return {
          id: s.id,
          user_id: s.user_id,
          event_id: s.event_id,
          amount: s.amount,
          currency: s.currency,
          status: s.status,
          payment_status: s.payment_status,
          payment_url: s.payment_url,
          razorpay_payment_link_id: (s as any).razorpay_payment_link_id ?? null,
          razorpay_payment_id: (s as any).razorpay_payment_id ?? null,
          gateway: (s as any).gateway ?? 'razorpay',
          expires_at: s.expires_at,
          created_at: s.created_at,
          updated_at: s.updated_at,
          user,
          event,
          payment_logs: (s.payment_logs || []) as PaymentLog[],
          display_status: getDisplayStatus({ payment_status: s.payment_status, expires_at: s.expires_at }),
        };
      });

      setPayments(merged);
    } catch (err) {
      console.error('Error loading payments:', err);
      toast({ title: 'Error Loading Payments', description: 'Failed to load payment data.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    if (payments.length === 0) {
      toast({ title: 'No Data', description: 'No payments to export.' });
      return;
    }

    const csvHeaders = [
      'Payment ID', 'User Name', 'User Email', 'Event', 'Community',
      'Amount', 'Currency', 'Status', 'Gateway',
      'Razorpay Payment ID', 'Razorpay Link ID',
      'Created At', 'Updated At', 'Expires At',
    ];

    const esc = (val: unknown): string => {
      const str = val == null ? '' : String(val);
      return `"${str.replace(/"/g, '""').replace(/[\r\n]+/g, ' ')}"`;
    };

    const csvRows = payments.map(p => [
      esc(p.id), esc(p.user.name), esc(p.user.email),
      esc(p.event.title), esc(p.event.community?.name),
      esc(p.amount), esc(p.currency), esc(p.display_status), esc(p.gateway),
      esc(p.razorpay_payment_id), esc(p.razorpay_payment_link_id),
      esc(new Date(p.created_at).toLocaleString()),
      esc(new Date(p.updated_at).toLocaleString()),
      esc(new Date(p.expires_at).toLocaleString()),
    ].join(','));

    const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `payments_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: 'Export Complete', description: `Exported ${payments.length} payments.` });
  };

  const handleViewDetails = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsDetailsOpen(true);
  };

  // Filters
  const paymentStatusOptions = [
    { value: 'paid', label: 'Paid' },
    { value: 'yet_to_pay', label: 'Yet to Pay' },
    { value: 'expired', label: 'Expired' },
    { value: 'failed', label: 'Failed' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'refunded', label: 'Refunded' },
  ];

  const gatewayOptions = [...new Set(payments.map(p => p.gateway))].map(g => ({
    value: g,
    label: g.charAt(0).toUpperCase() + g.slice(1),
  }));

  const filters = [
    { key: 'display_status' as keyof Payment, label: 'Status', options: paymentStatusOptions },
    { key: 'gateway' as keyof Payment, label: 'Gateway', options: gatewayOptions },
  ];

  // Summary stats
  const summary = useMemo(() => {
    const paid = payments.filter(p => p.display_status === 'paid');
    const yetToPay = payments.filter(p => p.display_status === 'yet_to_pay');
    const expired = payments.filter(p => p.display_status === 'expired');
    const failed = payments.filter(p => p.display_status === 'failed' || p.display_status === 'cancelled');
    return {
      paidCount: paid.length,
      paidAmount: paid.reduce((s, p) => s + Number(p.amount), 0),
      yetToPayCount: yetToPay.length,
      yetToPayAmount: yetToPay.reduce((s, p) => s + Number(p.amount), 0),
      expiredCount: expired.length,
      expiredAmount: expired.reduce((s, p) => s + Number(p.amount), 0),
      failedCount: failed.length,
      total: payments.length,
    };
  }, [payments]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1>Payments</h1>
          <p className="text-muted-foreground">View and manage payment sessions</p>
        </div>
      </div>

      {/* Summary Stats */}
      {!isLoading && payments.length > 0 && (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card className="admin-shadow">
            <CardContent className="pt-4 pb-3">
              <div className="text-sm font-medium text-muted-foreground">Paid</div>
              <div className="text-xl font-bold text-green-600">{summary.paidCount}</div>
              <div className="text-xs text-muted-foreground">{formatCurrency(summary.paidAmount)}</div>
            </CardContent>
          </Card>
          <Card className="admin-shadow">
            <CardContent className="pt-4 pb-3">
              <div className="text-sm font-medium text-muted-foreground">Yet to Pay</div>
              <div className="text-xl font-bold text-yellow-600">{summary.yetToPayCount}</div>
              <div className="text-xs text-muted-foreground">{formatCurrency(summary.yetToPayAmount)}</div>
            </CardContent>
          </Card>
          <Card className="admin-shadow">
            <CardContent className="pt-4 pb-3">
              <div className="text-sm font-medium text-muted-foreground">Expired</div>
              <div className="text-xl font-bold text-red-600">{summary.expiredCount}</div>
              <div className="text-xs text-muted-foreground">{formatCurrency(summary.expiredAmount)}</div>
            </CardContent>
          </Card>
          <Card className="admin-shadow">
            <CardContent className="pt-4 pb-3">
              <div className="text-sm font-medium text-muted-foreground">Failed / Cancelled</div>
              <div className="text-xl font-bold text-orange-600">{summary.failedCount}</div>
              <div className="text-xs text-muted-foreground">of {summary.total} total</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payments Table */}
      <DataTable
        data={payments}
        columns={columns}
        title="Payment Sessions"
        isLoading={isLoading}
        onRefresh={loadPayments}
        onExport={handleExport}
        searchPlaceholder="Search payments..."
        filters={filters}
        onRowClick={(p) => handleViewDetails(p as Payment)}
      />

      <PaymentDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        payment={selectedPayment}
      />
    </div>
  );
}

