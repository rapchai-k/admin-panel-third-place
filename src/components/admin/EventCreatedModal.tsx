import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Calendar,
  MapPin,
  Users,
  Check,
  Copy,
  ExternalLink,
  Link2,
} from 'lucide-react';

export interface CreatedEventInfo {
  id: string;
  title: string;
  date_time?: string | null;
  venue: string;
  capacity: number;
  shortUrl: string;
  instanceCount?: number; // > 1 for recurring events
}

interface EventCreatedModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: CreatedEventInfo | null;
}

export function EventCreatedModal({ isOpen, onClose, event }: EventCreatedModalProps) {
  const [copied, setCopied] = useState(false);

  if (!event) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(event.shortUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement('input');
      input.value = event.shortUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenUrl = () => {
    window.open(event.shortUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-600" />
            Event Created!
          </DialogTitle>
          <DialogDescription>
            {event.instanceCount && event.instanceCount > 1
              ? `${event.instanceCount} recurring instances created successfully.`
              : 'Your event is ready to share.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Event Summary */}
          <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
            <h3 className="font-semibold text-base">{event.title}</h3>
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              {event.date_time && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(event.date_time).toLocaleDateString('en-IN', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {event.venue}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {event.capacity} spots
              </span>
            </div>
            {event.instanceCount && event.instanceCount > 1 && (
              <Badge variant="secondary" className="text-xs mt-1">
                {event.instanceCount} instances
              </Badge>
            )}
          </div>

          <Separator />

          {/* Short URL Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <Link2 className="h-4 w-4 text-primary" />
              Shareable Event Link
            </label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={event.shortUrl}
                className="font-mono text-sm bg-background"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <Button
                variant={copied ? 'default' : 'outline'}
                size="icon"
                onClick={handleCopy}
                title="Copy link"
                className="shrink-0"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleOpenUrl}
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

          <div className="flex justify-end pt-2">
            <Button onClick={onClose}>Done</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

