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
  Clock,
  Mail,
  Copy,
  CreditCard,
  ExternalLink,
  Activity,
} from 'lucide-react';
import { useCurrency } from '@/context/CurrencyProvider';
import { useToast } from '@/hooks/use-toast';

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

interface PaymentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: Payment | null;
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

export function PaymentDetailsModal({ isOpen, onClose, payment }: PaymentDetailsModalProps) {
  const { formatCurrency } = useCurrency();
  const { toast } = useToast();

  if (!payment) return null;

  const copyToClipboard = async (text: string, label: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
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

  const sortedLogs = [...payment.payment_logs].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Payment Details</DialogTitle>
          <DialogDescription>
            Payment session for {payment.user.name} — {payment.event.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* User Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">User</h3>
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14">
                <AvatarImage src={payment.user.photo_url} />
                <AvatarFallback>
                  {payment.user.name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <h4 className="font-medium">{payment.user.name}</h4>
                {payment.user.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    {payment.user.email}
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Event Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Event</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{payment.event.title}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {payment.event.date_time ? new Date(payment.event.date_time).toLocaleString() : 'TBD'}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {payment.event.venue}
              </div>
              {payment.event.community && (
                <div className="text-sm text-muted-foreground">
                  <strong>Community:</strong> {payment.event.community.name}
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Payment Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Payment Information</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-muted-foreground w-32">Status</label>
                {statusBadge(payment.display_status)}
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-muted-foreground w-32">Amount</label>
                <span className="font-semibold">{formatCurrency(payment.amount)}</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-muted-foreground w-32">Gateway</label>
                <Badge variant="outline" className="capitalize">{payment.gateway}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-muted-foreground w-32">Created</label>
                <span className="text-sm">{new Date(payment.created_at).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-muted-foreground w-32">Last Updated</label>
                <span className="text-sm">{new Date(payment.updated_at).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-muted-foreground w-32">Expires</label>
                <span className="text-sm">{new Date(payment.expires_at).toLocaleString()}</span>
              </div>

              {/* Razorpay IDs with copy buttons */}
              {payment.razorpay_payment_id && (
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-muted-foreground w-32">Payment ID</label>
                  <code className="text-xs bg-muted px-2 py-1 rounded">{payment.razorpay_payment_id}</code>
                  <button
                    onClick={() => copyToClipboard(payment.razorpay_payment_id!, 'Payment ID')}
                    className="p-1 hover:bg-muted rounded transition-colors"
                    title="Copy Payment ID"
                  >
                    <Copy className="h-3 w-3 text-muted-foreground" />
                  </button>
                </div>
              )}
              {payment.razorpay_payment_link_id && (
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-muted-foreground w-32">Link ID</label>
                  <code className="text-xs bg-muted px-2 py-1 rounded">{payment.razorpay_payment_link_id}</code>
                  <button
                    onClick={() => copyToClipboard(payment.razorpay_payment_link_id!, 'Payment Link ID')}
                    className="p-1 hover:bg-muted rounded transition-colors"
                    title="Copy Payment Link ID"
                  >
                    <Copy className="h-3 w-3 text-muted-foreground" />
                  </button>
                </div>
              )}
              {payment.payment_url && (
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-muted-foreground w-32">Payment URL</label>
                  <a
                    href={payment.payment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    Open link <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-muted-foreground w-32">Session ID</label>
                <code className="text-xs bg-muted px-2 py-1 rounded">{payment.id}</code>
                <button
                  onClick={() => copyToClipboard(payment.id, 'Session ID')}
                  className="p-1 hover:bg-muted rounded transition-colors"
                  title="Copy Session ID"
                >
                  <Copy className="h-3 w-3 text-muted-foreground" />
                </button>
              </div>
            </div>
          </div>

          {/* Payment Logs Timeline */}
          {sortedLogs.length > 0 && (
            <>
              <Separator />
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Payment Logs ({sortedLogs.length})
                </h3>
                <div className="space-y-3">
                  {sortedLogs.map((log) => (
                    <div
                      key={log.id}
                      className="relative pl-6 pb-3 border-l-2 border-muted last:border-l-0 last:pb-0"
                    >
                      <div className="absolute left-[-5px] top-1 w-2 h-2 rounded-full bg-primary" />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{log.event_type}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(log.created_at).toLocaleString()}
                          </span>
                        </div>
                        {log.event_data && (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                              View payload
                            </summary>
                            <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto max-h-32">
                              {JSON.stringify(log.event_data, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => toast({ title: 'Process Refund', description: 'Refund feature coming soon!' })}
            className="gap-2"
          >
            <CreditCard className="h-4 w-4" />
            Refund
          </Button>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
