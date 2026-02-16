import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { 
  Flag, 
  User, 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  XCircle, 
  UserX,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FlaggedContent {
  id: string;
  reason: string;
  created_at: string;
  status: 'open' | 'resolved' | 'urgent';
  resolved_at?: string;
  resolved_by?: string;
  flagged_by: {
    name: string;
    photo_url?: string;
  };
  flagged_user: {
    id: string;
    name: string;
    photo_url?: string;
  };
  comment?: {
    text: string;
    discussion: {
      title: string;
      community: {
        name: string;
      };
    };
  };
}

interface FlagDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  flag: FlaggedContent | null;
  onSuccess?: () => void;
}

export function FlagDetailsModal({ isOpen, onClose, flag, onSuccess }: FlagDetailsModalProps) {
  const [actionNotes, setActionNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  if (!flag) return null;

  const handleAction = async (action: 'resolve' | 'dismiss' | 'ban') => {
    setIsProcessing(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const actionMessages = {
        resolve: `Flag resolved successfully`,
        dismiss: `Flag dismissed`,
        ban: `User ${flag.flagged_user.name} has been banned`
      };

      toast({
        title: "Action Completed",
        description: actionMessages[action],
        variant: action === 'ban' ? 'destructive' : 'default',
      });

      onSuccess?.();
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process action. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-destructive" />
            Flag Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Flag Information */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <h3 className="font-semibold">Flag Reason</h3>
              </div>
              <Badge variant="destructive">{flag.reason}</Badge>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Reported on {new Date(flag.created_at).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</span>
            </div>
          </div>

          <Separator />

          {/* People Involved */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Reporter */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">REPORTED BY</h4>
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={flag.flagged_by.photo_url} />
                  <AvatarFallback>
                    {flag.flagged_by.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{flag.flagged_by.name}</p>
                  <p className="text-sm text-muted-foreground">Reporter</p>
                </div>
              </div>
            </div>

            {/* Flagged User */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">FLAGGED USER</h4>
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={flag.flagged_user.photo_url} />
                  <AvatarFallback>
                    {flag.flagged_user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{flag.flagged_user.name}</p>
                  <p className="text-sm text-muted-foreground">Flagged User</p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Flagged Content */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">FLAGGED CONTENT</h4>
            {flag.comment ? (
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Comment in Discussion</span>
                </div>
                <blockquote className="border-l-2 border-primary pl-4 italic">
                  "{flag.comment.text}"
                </blockquote>
                <div className="text-sm text-muted-foreground">
                  <p>Discussion: <span className="font-medium">{flag.comment.discussion.title}</span></p>
                  <p>Community: <span className="font-medium">{flag.comment.discussion.community.name}</span></p>
                </div>
              </div>
            ) : (
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">User Profile</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  This flag is related to the user's profile or general behavior.
                </p>
              </div>
            )}
          </div>

          <Separator />

          {/* Action Notes */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">ACTION NOTES (OPTIONAL)</h4>
            <Textarea
              placeholder="Add notes about your decision or action taken..."
              value={actionNotes}
              onChange={(e) => setActionNotes(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => handleAction('dismiss')}
              disabled={isProcessing}
              className="gap-2"
            >
              <XCircle className="h-4 w-4" />
              Dismiss Flag
            </Button>
            
            <Button
              variant="default"
              onClick={() => handleAction('resolve')}
              disabled={isProcessing}
              className="gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Resolve Flag
            </Button>
            
            <Button
              variant="destructive"
              onClick={() => handleAction('ban')}
              disabled={isProcessing}
              className="gap-2"
            >
              <UserX className="h-4 w-4" />
              Ban User
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}