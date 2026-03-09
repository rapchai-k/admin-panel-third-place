import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Loader2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { fetchPostJobsForEvent, retryPostJob } from '@/lib/social-posting';
import type { PostJob, PostJobStatus } from '@/lib/social-posting.types';

interface PostJobDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string | null;
  eventTitle: string;
  onRetrySuccess?: () => void;
}

const statusVariant: Record<PostJobStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'outline',
  uploading: 'secondary',
  uploaded: 'secondary',
  scheduled: 'default',
  failed: 'destructive',
};

const statusLabel: Record<PostJobStatus, string> = {
  pending: 'Pending',
  uploading: 'Uploading',
  uploaded: 'Uploaded',
  scheduled: 'Scheduled',
  failed: 'Failed',
};

export function PostJobDetailsModal({
  isOpen,
  onClose,
  eventId,
  eventTitle,
  onRetrySuccess,
}: PostJobDetailsModalProps) {
  const [jobs, setJobs] = useState<PostJob[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && eventId) {
      void loadJobs(eventId);
    } else {
      setJobs([]);
    }
  }, [isOpen, eventId]);

  const loadJobs = async (id: string) => {
    setIsLoading(true);
    try {
      const data = await fetchPostJobsForEvent(id);
      setJobs(data);
    } catch (err) {
      console.error('Failed to load post jobs:', err);
      toast({ title: 'Error', description: 'Failed to load social post jobs.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = async (job: PostJob) => {
    setRetryingId(job.id);
    try {
      await retryPostJob(job.id);
      toast({ title: 'Retry triggered', description: `Retrying post to ${job.social_target?.profile_name ?? 'channel'}.` });
      if (eventId) await loadJobs(eventId);
      onRetrySuccess?.();
    } catch (err) {
      console.error('Retry failed:', err);
      toast({ title: 'Retry failed', description: 'Could not retry the post job.', variant: 'destructive' });
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Social Post Jobs</DialogTitle>
          <p className="text-sm text-muted-foreground truncate">{eventTitle}</p>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No social posts for this event yet.
          </p>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {jobs.map((job, idx) => (
              <div key={job.id}>
                {idx > 0 && <Separator />}
                <div className="py-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium capitalize">
                        {job.social_target?.provider ?? '—'}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {job.social_target?.profile_name ?? ''}
                      </span>
                    </div>
                    <Badge variant={statusVariant[job.status as PostJobStatus] ?? 'outline'}>
                      {statusLabel[job.status as PostJobStatus] ?? job.status}
                    </Badge>
                  </div>

                  {job.scheduled_send_time && (
                    <p className="text-xs text-muted-foreground">
                      Scheduled: {new Date(job.scheduled_send_time).toLocaleString()}
                    </p>
                  )}

                  {job.last_error && (
                    <p className="text-xs text-destructive break-words">{job.last_error}</p>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Attempts: {job.attempts}</span>
                    {job.status === 'failed' && job.attempts < 3 && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1"
                        onClick={() => handleRetry(job)}
                        disabled={retryingId === job.id}
                      >
                        {retryingId === job.id
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : <RefreshCw className="h-3 w-3" />}
                        Retry
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

