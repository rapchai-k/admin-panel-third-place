import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  MapPin,
  User,
  CreditCard,
  Clock,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  AlertCircle,
  Copy,
} from 'lucide-react';
import { useCurrency } from '@/context/CurrencyProvider';
import { useToast } from '@/hooks/use-toast';

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
    date_time: string | null;
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
    gateway?: string | null;
    updated_at?: string | null;
  } | null;
  registered_at: string;
  special_requests?: string;
  dietary_preferences?: string;
  emergency_contact?: {
    name: string;
    phone: string;
  };
}


interface RegistrationDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  registration: Registration | null;
  onContactUser?: () => void;
  onRefund?: () => void;
  onCancel?: () => void;
}

const safeString = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  try { return String(v); } catch { return ''; }
};

export function RegistrationDetailsModal({
  isOpen,
  onClose,
  registration,
  onContactUser,
  onRefund,
  onCancel,
}: RegistrationDetailsModalProps) {

  const { formatCurrency } = useCurrency();
  const { toast } = useToast();

  if (!registration) return null;

  const copyToClipboard = async (text: string, label: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for older browsers / non-HTTPS contexts
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      toast({ title: 'Copied', description: `${label} copied to clipboard.` });
    } catch {
      toast({ title: 'Copy Failed', description: 'Could not copy to clipboard.', variant: 'destructive' });
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

  const getPaymentStatusDisplay = (registration: Registration) => {
    const eventPrice = registration.event.price || 0;

    // Free event (price is 0)
    if (eventPrice === 0) {
      return {
        badge: <Badge variant="outline" className="bg-gray-100">Free Event</Badge>,
        details: (
          <div className="space-y-2 mt-2">
            <div className="text-sm text-muted-foreground">
              This is a free event. No payment required.
            </div>
          </div>
        )
      };
    }

    // Paid event but no payment session created yet
    if (!registration.payment_session) {
      return {
        badge: <Badge variant="secondary" className="bg-orange-600 text-white">Payment Pending</Badge>,
        details: (
          <div className="space-y-2 mt-2">
            <div className="text-sm text-muted-foreground">
              <strong>Event Price:</strong> {formatCurrency(eventPrice)}
            </div>
            <div className="text-sm text-orange-600">
              Payment session not yet created. User may need to complete registration.
            </div>
          </div>
        )
      };
    }

    const paymentStatus = registration.payment_session.payment_status;
    const isExpired = new Date(registration.payment_session.expires_at) < new Date();

    if (paymentStatus === 'paid') {
      return {
        badge: <Badge variant="default" className="bg-green-600">Paid</Badge>,
        details: (
          <div className="space-y-2 mt-2">
            <div className="text-sm text-muted-foreground">
              <strong>Amount:</strong> {formatCurrency(registration.payment_session.amount)}
            </div>
            {registration.payment_session.updated_at && (
              <div className="text-sm text-muted-foreground">
                <strong>Paid At:</strong> {new Date(registration.payment_session.updated_at).toLocaleString()}
              </div>
            )}
            {registration.payment_session.gateway && (
              <div className="text-sm text-muted-foreground">
                <strong>Gateway:</strong> {registration.payment_session.gateway.charAt(0).toUpperCase() + registration.payment_session.gateway.slice(1)}
              </div>
            )}
            {registration.payment_session.razorpay_payment_id && (
              <div className="text-sm text-muted-foreground flex items-center gap-1.5">
                <strong>Payment ID:</strong>
                <code className="text-xs bg-muted px-2 py-1 rounded">{registration.payment_session.razorpay_payment_id}</code>
                <button
                  onClick={() => copyToClipboard(registration.payment_session!.razorpay_payment_id!, 'Payment ID')}
                  className="p-1 hover:bg-muted rounded transition-colors"
                  title="Copy Payment ID"
                >
                  <Copy className="h-3 w-3 text-muted-foreground" />
                </button>
              </div>
            )}
          </div>
        )
      };
    } else if (paymentStatus === 'yet_to_pay') {
      if (isExpired) {
        return {
          badge: <Badge variant="destructive" className="bg-red-600">Expired - Yet to Pay</Badge>,
          details: (
            <div className="space-y-2 mt-2">
              <div className="text-sm text-destructive">
                <strong>Expired:</strong> {new Date(registration.payment_session.expires_at).toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">
                <strong>Amount Due:</strong> {formatCurrency(registration.payment_session.amount)}
              </div>
              {registration.payment_session.gateway && (
                <div className="text-sm text-muted-foreground">
                  <strong>Gateway:</strong> {registration.payment_session.gateway.charAt(0).toUpperCase() + registration.payment_session.gateway.slice(1)}
                </div>
              )}
            </div>
          )
        };
      }
      return {
        badge: <Badge variant="secondary" className="bg-yellow-600 text-white">Yet to Pay</Badge>,
        details: (
          <div className="space-y-2 mt-2">
            <div className="text-sm text-muted-foreground">
              <strong>Amount Due:</strong> {formatCurrency(registration.payment_session.amount)}
            </div>
            <div className="text-sm text-muted-foreground">
              <strong>Expires:</strong> {new Date(registration.payment_session.expires_at).toLocaleString()}
            </div>
            {registration.payment_session.gateway && (
              <div className="text-sm text-muted-foreground">
                <strong>Gateway:</strong> {registration.payment_session.gateway.charAt(0).toUpperCase() + registration.payment_session.gateway.slice(1)}
              </div>
            )}
            {registration.payment_session.razorpay_payment_link_id && (
              <div className="text-sm text-muted-foreground flex items-center gap-1.5">
                <strong>Payment Link ID:</strong>
                <code className="text-xs bg-muted px-2 py-1 rounded">{registration.payment_session.razorpay_payment_link_id}</code>
                <button
                  onClick={() => copyToClipboard(registration.payment_session!.razorpay_payment_link_id!, 'Payment Link ID')}
                  className="p-1 hover:bg-muted rounded transition-colors"
                  title="Copy Payment Link ID"
                >
                  <Copy className="h-3 w-3 text-muted-foreground" />
                </button>
              </div>
            )}
          </div>
        )
      };
    }

    return {
      badge: <Badge variant="outline">Unknown Status</Badge>,
      details: null
    };
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registration Details</DialogTitle>
          <DialogDescription>
            Complete registration information for {registration.user.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* User Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">User Information</h3>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={registration.user.photo_url} />
                <AvatarFallback>
                  {registration.user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <h4 className="font-medium">{registration.user.name}</h4>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  {registration.user.email}
                </div>
                {registration.user.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    {registration.user.phone}
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Event Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Event Information</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{registration.event.title}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {registration.event.date_time ? new Date(registration.event.date_time).toLocaleString() : 'TBD'}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {registration.event.venue}
              </div>
              {registration.event.price && registration.event.price > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {formatCurrency(Number(registration.event.price))}
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Registration Status */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Registration & Payment Status</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Registration Status</label>
                <div className="flex items-center gap-2">
                  {getStatusIcon(registration.status)}
                  <Badge variant={getStatusVariant(registration.status)}>
                    {registration.status.charAt(0).toUpperCase() + registration.status.slice(1)}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Payment Status</label>
                {getPaymentStatusDisplay(registration).badge}
                {getPaymentStatusDisplay(registration).details}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Registered At</label>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                {new Date(registration.registered_at).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Additional Information */}
          {(registration.special_requests || registration.dietary_preferences || registration.emergency_contact) && (
            <>
              <Separator />
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Additional Information</h3>

                {registration.special_requests && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Special Requests</label>
                    <p className="text-sm bg-muted p-3 rounded-md">
                      {registration.special_requests}
                    </p>
                  </div>
                )}

                {registration.dietary_preferences && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Dietary Preferences</label>
                    <p className="text-sm bg-muted p-3 rounded-md">
                      {registration.dietary_preferences}
                    </p>
                  </div>
                )}

                {registration.emergency_contact && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Emergency Contact</label>
                    <div className="bg-muted p-3 rounded-md space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4" />
                        {registration.emergency_contact.name}
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4" />
                        {registration.emergency_contact.phone}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

          {/* Actions (replaces table dropdown) */}
          <div className="flex items-center justify-end gap-2 pt-2">
            {onContactUser && (
              <Button variant="outline" onClick={onContactUser} className="gap-2">
                Contact User
              </Button>
            )}
            {onRefund && (
              <Button variant="outline" onClick={onRefund} className="gap-2">
                Process Refund
              </Button>
            )}
            {onCancel && (
              <Button variant="destructive" onClick={onCancel} className="gap-2">
                Cancel Registration
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>
      </DialogContent>
    </Dialog>
  );
}