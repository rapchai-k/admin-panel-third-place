import { useEffect, useState } from 'react';
import { DataTable, Column } from '@/components/admin/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Download, Calendar, CreditCard, Clock, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RegistrationDetailsModal } from '@/components/admin/RegistrationDetailsModal';

interface Registration {
  id: string;
  status: 'registered' | 'unregistered';
  payment_session_id?: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  event: {
    title: string;
    date_time: string | null;
    venue: string;
    price?: number;
    currency?: string;
    community: {
      name: string;
      city: string;
    };
  };
  user: {
    name: string;
    photo_url?: string;
    email?: string;
  };
  payment_session?: {
    id: string;
    payment_status: 'yet_to_pay' | 'paid' | null;
    amount: number;
    currency: string;
    expires_at: string;
    cashfree_order_id?: string | null;
    cashfree_payment_id?: string | null;
  } | null;
}

const columns: Column<Registration>[] = [
  {
    key: 'user',
    header: 'User',
    sortable: true,
    render: (value, row) => (
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={row.user.photo_url} />
          <AvatarFallback className="text-xs">
            {row.user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="font-medium">{row.user.name}</span>
      </div>
    ),
  },
  {
    key: 'event',
    header: 'Event',
    sortable: true,
    filterable: true,
    render: (value, row) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
          <Calendar className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="font-medium">{row.event.title}</p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span>{row.event.community.name}</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    key: 'event',
    header: 'Event Date',
    sortable: true,
    render: (value, row) => (
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <div>
          {row.event.date_time ? (
            <>
              <p className="text-sm font-medium">
                {new Date(row.event.date_time).toLocaleDateString()}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(row.event.date_time).toLocaleTimeString()}
              </p>
            </>
          ) : (
            <p className="text-sm font-medium text-muted-foreground">TBD</p>
          )}
        </div>
      </div>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    sortable: true,
    filterable: true,
    render: (value) => {
      const variants = {
        pending: 'outline' as const,
        success: 'default' as const,
        failed: 'destructive' as const,
        cancelled: 'destructive' as const,
      };
      return <Badge variant={variants[value]}>{value.charAt(0).toUpperCase() + value.slice(1)}</Badge>;
    },
  },
  {
    key: 'payment_session',
    header: 'Payment',
    render: (_value, row) => {
      if (!row.payment_session) {
        return (
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <Badge variant="outline" className="bg-gray-100">Free</Badge>
          </div>
        );
      }

      const paymentStatus = row.payment_session.payment_status;
      const isExpired = new Date(row.payment_session.expires_at) < new Date();

      return (
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          {paymentStatus === 'paid' ? (
            <Badge variant="default" className="bg-green-600">Paid</Badge>
          ) : paymentStatus === 'yet_to_pay' ? (
            isExpired ? (
              <Badge variant="destructive" className="bg-red-600">Expired</Badge>
            ) : (
              <Badge variant="secondary" className="bg-yellow-600 text-white">Yet to Pay</Badge>
            )
          ) : (
            <Badge variant="outline">Unknown</Badge>
          )}
        </div>
      );
    },
  },
  {
    key: 'created_at',
    header: 'Registered',
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

export default function RegistrationsPage() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRegistration, setSelectedRegistration] = useState<any>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadRegistrations();
  }, []);

  const loadRegistrations = async () => {
    try {
      setIsLoading(true);

      const { data: registrationsData, error } = await supabase
        .from('event_registrations')
        .select(`
          *,
          event:events!event_registrations_event_id_fkey(
            title,
            date_time,
            venue,
            price,
            currency,
            community:communities(name, city)
          ),
          user:users!event_registrations_user_id_fkey(name, photo_url),
          payment_session:payment_sessions!event_registrations_payment_session_id_fkey(
            id,
            payment_status,
            amount,
            currency,
            expires_at,
            cashfree_order_id,
            cashfree_payment_id
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch emails for all users
      const registrationsWithEmails = await Promise.all(
        (registrationsData || []).map(async (reg) => {
          // Fetch email from auth.users using RPC function
          const { data: email } = await supabase.rpc('get_user_email', {
            _user_id: reg.user_id
          });

          return {
            ...reg,
            user: {
              ...reg.user,
              email: email || undefined,
            },
          };
        })
      );

      setRegistrations(registrationsWithEmails);
    } catch (error) {
      console.error('Error loading registrations:', error);
      toast({
        title: "Error Loading Registrations",
        description: "Failed to load registrations data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelRegistration = (registration: Registration) => {
    toast({
      title: "Cancel Registration",
      description: `Cancel registration for ${registration.user.name} - Feature coming soon!`,
      variant: "destructive",
    });
  };

  const handleRefund = (registration: Registration) => {
    toast({
      title: "Process Refund",
      description: `Process refund for ${registration.user.name} - Feature coming soon!`,
    });
  };

  const handleExport = () => {
    toast({
      title: "Export Registrations",
      description: "Export functionality coming soon!",
    });
  };

  // Get unique events and statuses for filtering
  const events = [...new Set(registrations.map(r => r.event.title))].map(title => ({
    value: title,
    label: title,
  }));

  const statuses = [
    { value: 'pending', label: 'Pending' },
    { value: 'success', label: 'Success' },
    { value: 'failed', label: 'Failed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const filters = [
    {
      key: 'event' as keyof Registration,
      label: 'Event',
      options: events,
    },
    {
      key: 'status' as keyof Registration,
      label: 'Status',
      options: statuses,
    },
  ];

  const handleViewDetails = (registration: Registration) => {
    // Transform to match RegistrationDetailsModal interface
    const transformedRegistration = {
      id: registration.id,
      user: {
        name: registration.user.name,
        email: registration.user.email || `user${registration.user_id.slice(0, 8)}@example.com`, // Use actual email or fallback
        phone: undefined,
        photo_url: registration.user.photo_url,
      },
      event: {
        title: registration.event.title,
        date_time: registration.event.date_time,
        venue: registration.event.venue,
        price: registration.event.price,
        currency: registration.event.currency,
      },
      status: registration.status,
      payment_session: registration.payment_session,
      registered_at: registration.created_at,
      special_requests: undefined,
      dietary_preferences: undefined,
      emergency_contact: undefined,
    };
    setSelectedRegistration(transformedRegistration);
    setIsDetailsModalOpen(true);
  };



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1>Registrations</h1>
          <p className="text-muted-foreground">Manage event registrations and payments</p>
        </div>
        <Button onClick={handleExport} variant="outline" className="admin-focus">
          <Download className="h-4 w-4 mr-2" />
          Export Data
        </Button>
      </div>

      {/* Registrations Table */}
      <DataTable
        data={registrations}
        columns={columns}
        title="Event Registrations"
        isLoading={isLoading}
        onRefresh={loadRegistrations}
        onExport={handleExport}
        searchPlaceholder="Search registrations..."
        filters={filters}
        onRowClick={(r) => handleViewDetails(r as Registration)}
      />

      <RegistrationDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        registration={selectedRegistration}
        onContactUser={() => selectedRegistration && toast({ title: 'Contact User', description: `Contact ${selectedRegistration.user.name} - Feature coming soon!` })}
        onRefund={() => selectedRegistration && handleRefund(selectedRegistration)}
        onCancel={() => selectedRegistration && handleCancelRegistration(selectedRegistration)}
      />
    </div>
  );
}