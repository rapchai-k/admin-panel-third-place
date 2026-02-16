import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  User,
  Clock,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RegistrationDetailsModal } from './RegistrationDetailsModal';

interface Registration {
  id: string;
  user: {
    name: string;
    email: string;
    phone?: string;
    photo_url?: string;
  };
  event: {
    title: string;
    date_time: string;
    venue: string;
    price?: number;
    currency?: string;
  };
  status: 'registered' | 'unregistered';
  payment_session?: {
    id: string;
    payment_status: 'yet_to_pay' | 'paid' | null;
    amount: number;
    currency: string;
    expires_at: string;
    razorpay_payment_link_id?: string | null;
    razorpay_payment_id?: string | null;
  } | null;
  registered_at: string;
  special_requests?: string;
  dietary_preferences?: string;
  emergency_contact?: {
    name: string;
    phone: string;
  };
}

interface EventRegistrationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string | null;
  eventTitle: string;
}

export function EventRegistrationsModal({
  isOpen,
  onClose,
  eventId,
  eventTitle,
}: EventRegistrationsModalProps) {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && eventId) {
      loadRegistrations();
    }
  }, [isOpen, eventId]);

  const loadRegistrations = async () => {
    if (!eventId) return;

    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('event_registrations')
        .select(`
          *,
          user:users!event_registrations_user_id_fkey(name, photo_url),
          event:events!event_registrations_event_id_fkey(title, date_time, venue, price, currency),
          payment_session:payment_sessions!event_registrations_payment_session_id_fkey(
            id,
            payment_status,
            amount,
            currency,
            expires_at,
            razorpay_payment_link_id,
            razorpay_payment_id
          )
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('Raw registration data:', data);

      // Fetch emails for all users
      const registrationsWithEmails = await Promise.all(
        (data || []).map(async (reg) => {
          console.log('Processing registration:', {
            id: reg.id,
            payment_session_id: reg.payment_session_id,
            payment_session: reg.payment_session,
            event_price: reg.event?.price
          });

          // Fetch email from auth.users using RPC function
          const { data: email } = await supabase.rpc('get_user_email', {
            _user_id: reg.user_id
          });

          return {
            id: reg.id,
            user: {
              ...reg.user,
              email: email || `user${reg.user_id.slice(0, 8)}@example.com`, // Fallback to placeholder if email fetch fails
              phone: undefined,
            },
            event: reg.event,
            status: reg.status,
            payment_session: reg.payment_session ? {
              id: (reg.payment_session as any).id,
              payment_status: (reg.payment_session as any).payment_status,
              amount: (reg.payment_session as any).amount,
              currency: (reg.payment_session as any).currency,
              expires_at: (reg.payment_session as any).expires_at,
              razorpay_payment_link_id: (reg.payment_session as any).razorpay_payment_link_id,
              razorpay_payment_id: (reg.payment_session as any).razorpay_payment_id,
            } : null,
            registered_at: reg.created_at,
            special_requests: undefined,
            dietary_preferences: undefined,
            emergency_contact: undefined,
          };
        })
      );

      setRegistrations(registrationsWithEmails as Registration[]);
    } catch (error) {
      console.error('Error loading registrations:', error);
      toast({
        title: "Error Loading Registrations",
        description: "Failed to load event registrations.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'registered':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'unregistered':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'registered':
        return 'default' as const;
      case 'unregistered':
        return 'destructive' as const;
      default:
        return 'secondary' as const;
    }
  };

  const getPaymentStatusBadge = (registration: Registration) => {
    const eventPrice = registration.event.price || 0;

    // Free event (price is 0)
    if (eventPrice === 0) {
      return <Badge variant="outline" className="bg-gray-100">Free</Badge>;
    }

    // Paid event but no payment session created yet
    if (!registration.payment_session) {
      return <Badge variant="secondary" className="bg-orange-600 text-white">Payment Pending</Badge>;
    }

    const paymentStatus = registration.payment_session.payment_status;
    const isExpired = new Date(registration.payment_session.expires_at) < new Date();

    if (paymentStatus === 'paid') {
      return <Badge variant="default" className="bg-green-600">Paid</Badge>;
    } else if (paymentStatus === 'yet_to_pay') {
      if (isExpired) {
        return <Badge variant="destructive" className="bg-red-600">Expired - Yet to Pay</Badge>;
      }
      return <Badge variant="secondary" className="bg-yellow-600 text-white">Yet to Pay</Badge>;
    }

    return <Badge variant="outline">Unknown</Badge>;
  };

  const handleViewDetails = (registration: Registration) => {
    setSelectedRegistration(registration);
    setIsDetailsModalOpen(true);
  };

  const handleCloseDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedRegistration(null);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Event Registrations</DialogTitle>
            <DialogDescription>
              All registrations for {eventTitle}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="h-16 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : registrations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No registrations found for this event</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-muted-foreground">
                    {registrations.length} registration{registrations.length !== 1 ? 's' : ''} found
                  </p>
                </div>
                
                {registrations.map((registration) => (
                  <div
                    key={registration.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleViewDetails(registration)}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={registration.user.photo_url} />
                        <AvatarFallback>
                          {registration.user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <p className="font-medium">{registration.user.name}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {registration.user.email}
                          </div>
                          {registration.user.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {registration.user.phone}
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(registration.registered_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(registration.status)}
                        <Badge variant={getStatusVariant(registration.status)}>
                          {registration.status.charAt(0).toUpperCase() + registration.status.slice(1)}
                        </Badge>
                      </div>

                      {getPaymentStatusBadge(registration)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <RegistrationDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={handleCloseDetailsModal}
        registration={selectedRegistration}
      />
    </>
  );
}