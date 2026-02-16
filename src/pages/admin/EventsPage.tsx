import { useEffect, useMemo, useState } from 'react';
import { DataTable, Column } from '@/components/admin/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, Calendar, MapPin, Users, Clock, Repeat } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { EventModal } from '@/components/admin/EventModal';
import { EventRegistrationsModal } from '@/components/admin/EventRegistrationsModal';
import { EventDetailsModal } from '@/components/admin/EventDetailsModal';
import { useCurrency } from '@/context/CurrencyProvider';

interface Event {
  id: string;
  title: string;
  description?: string;
  date_time: string | null;
  venue: string;
  capacity: number;
  price?: number;
  currency?: string;
  image_url?: string;
  external_link?: string;
  community_id: string;
  host_id?: string;
  is_cancelled: boolean;
  is_recurring_parent?: boolean;
  parent_event_id?: string | null;
  series_index?: number | null;
  created_at: string;
  updated_at: string;
  community: {
    name: string;
    city: string;
  };
  host: {
    name: string;
    photo_url?: string;
  } | null;
  registration_count?: number;
  short_code?: string;
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


const createColumns = (formatCurrency: (value: number, code?: string) => string): Column<Event>[] => [
  {
    key: 'title',
    header: 'Event',
    sortable: true,
    render: (_value, row) => (
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage
            src={safeString(row.image_url) || undefined}
            alt={safeString(row.title) || 'Event image'}
            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = ''; }}
          />
          <AvatarFallback>
            <Calendar className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="flex items-center gap-1.5">
            <p className="font-medium">{row.title}</p>
            {(row.parent_event_id || row.is_recurring_parent) && (
              <Badge variant="outline" className="text-xs gap-1 px-1.5 py-0">
                <Repeat className="h-3 w-3" />
                {row.series_index ? `#${row.series_index}` : 'Series'}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate max-w-[200px]">
            {row.description || 'No description'}
          </p>
        </div>
      </div>
    ),
  },
  {
    key: 'date_time',
    header: 'Date & Time',
    sortable: true,
    render: (value) => (
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <div>
          {value ? (
            <>
              <p className="text-sm font-medium">
                {new Date(value).toLocaleDateString()}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(value).toLocaleTimeString()}
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
    key: 'host',
    header: 'Host',
    render: (_value, row) => (
      <div className="flex items-center gap-2">
        {row.host ? (
          <>
            <Avatar className="h-6 w-6">
              <AvatarImage
                src={safeString(row.host.photo_url) || undefined}
                alt={safeString(row.host.name) || 'Host avatar'}
                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = ''; }}
              />
              <AvatarFallback className="text-xs">
                {getInitials(row.host.name)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">{row.host.name}</span>
          </>
        ) : (
          <span className="text-sm text-muted-foreground">No host</span>
        )}
      </div>
    ),
  },
  {
    key: 'capacity',
    header: 'Capacity',
    sortable: true,
    render: (value, row) => (
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <span>{row.registration_count || 0}/{value}</span>
      </div>
    ),
  },
  {
    key: 'price',
    header: 'Price',
    sortable: true,
    render: (_value, row) => (
      <div className="flex items-center gap-2">

        <span>
          {row.price && row.price > 0
            ? formatCurrency(Number(row.price))
            : 'Free'
          }
        </span>
      </div>
    ),
  },
  {
    key: 'is_cancelled',
    header: 'Status',
    filterable: true,
    render: (value, row) => {
      const isPast = row.date_time ? new Date(row.date_time) < new Date() : false;
      if (value) {
        return <Badge variant="destructive">Cancelled</Badge>;
      }
      if (!row.date_time) {
        return <Badge variant="outline">TBD</Badge>;
      }
      if (isPast) {
        return <Badge variant="secondary">Completed</Badge>;
      }
      return <Badge variant="default">Upcoming</Badge>;
    },
  },
  {
    key: 'created_at',
    header: 'Created',
    sortable: true,
    render: (value) => new Date(value).toLocaleDateString(),
  },
];

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | undefined>();
  const [isRegistrationsModalOpen, setIsRegistrationsModalOpen] = useState(false);
  const [isEventDetailsModalOpen, setIsEventDetailsModalOpen] = useState(false);
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();

  const columns = useMemo(() => createColumns(formatCurrency), [formatCurrency]);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setIsLoading(true);

      const { data: eventsData, error } = await supabase
        .from('events')
        .select(`
          *,
          community:communities(name, city),
          host:users(name, photo_url),
          registration_count:event_registrations(count)
        `)
        .order('date_time', { ascending: false });

      if (error) throw error;

      const transformedData = eventsData?.map(event => ({
        ...event,
        registration_count: event.registration_count?.[0]?.count || 0,
      })) || [];

      setEvents(transformedData as Event[]);
    } catch (error) {
      console.error('Error loading events:', error);
      toast({
        title: "Error Loading Events",
        description: "Failed to load events data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };



  const handleCreate = () => {
    setSelectedEvent(undefined);
    setIsModalOpen(true);
  };

  const handleModalSuccess = () => {
    loadEvents();
  };

  const handleCancel = async (event: Event) => {
    // Optimistic UI: close details modal
    setIsEventDetailsModalOpen(false);
    const prev = events;
    // Immediately reflect cancelled status in local list
    setEvents((cur) => cur.map(e => e.id === event.id ? { ...e, is_cancelled: true } : e));
    try {
      const { error } = await supabase.from('events').update({ is_cancelled: true }).eq('id', event.id);
      if (error) throw error;
      toast({ title: 'Event Cancelled', description: `${event.title} has been cancelled.` });
      // Refresh from server
      await loadEvents();
    } catch (err) {
      console.error('Cancel event failed', err);
      setEvents(prev); // revert
      toast({ title: 'Failed to cancel', description: 'Please try again.', variant: 'destructive' });
    }
  };

  const handleExport = () => {
    toast({
      title: "Export Events",
      description: "Export functionality coming soon!",
    });
  };

  // Get unique communities and statuses for filtering
  const communities = [...new Set(events.map(e => e.community.name))].map(name => ({
    value: name,
    label: name,
  }));

  const statuses = [
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const filters = [
    {
      key: 'community' as keyof Event,
      label: 'Community',
      options: communities,
    },
    {
      key: 'is_cancelled' as keyof Event,
      label: 'Status',
      options: statuses,
    },
  ];



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1>Events</h1>
          <p className="text-muted-foreground">Manage events across all communities</p>
        </div>
        <Button onClick={handleCreate} className="admin-focus">
          <Plus className="h-4 w-4 mr-2" />
          Create Event
        </Button>
      </div>

      {/* Events Table */}
      <DataTable
        data={events}
        columns={columns}
        title="Events Overview"
        isLoading={isLoading}
        onRefresh={loadEvents}
        onExport={handleExport}
        searchPlaceholder="Search events..."
        filters={filters}
        onRowClick={(event) => { setSelectedEvent(event as unknown as Event); setIsEventDetailsModalOpen(true); }}
      />

      <EventModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleModalSuccess}
        event={selectedEvent}
      />

      <EventRegistrationsModal
        isOpen={isRegistrationsModalOpen}
        onClose={() => setIsRegistrationsModalOpen(false)}
        eventId={selectedEvent?.id || ''}
        eventTitle={selectedEvent?.title || ''}
      />

      <EventDetailsModal
        isOpen={isEventDetailsModalOpen}
        onClose={() => setIsEventDetailsModalOpen(false)}
        event={selectedEvent || null}
        onSuccess={loadEvents}
        onViewRegistrations={() => setIsRegistrationsModalOpen(true)}
        onCancel={() => selectedEvent && handleCancel(selectedEvent)}
      />
    </div>
  );
}