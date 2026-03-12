import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { Loader2 } from 'lucide-react';
import { useGetAppRoasts, useGetUserProfile } from '../hooks/useQueries';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

interface ViewAppRoastsModalProps {
  appId: string;
  appName: string;
  onClose: () => void;
}

export default function ViewAppRoastsModal({ appId, appName, onClose }: ViewAppRoastsModalProps) {
  const { data: roasts, isLoading } = useGetAppRoasts(appId);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>App Roasts: {appName}</DialogTitle>
          <DialogDescription>
            Constructive feedback from the community to help you improve your app.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : roasts && roasts.length > 0 ? (
            <div className="space-y-4">
              {roasts.map((roast) => (
                <RoastItem key={roast.id} roast={roast} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No roasts yet. When users submit feedback, it will appear here.</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function RoastItem({ roast }: { roast: any }) {
  const { data: submitterProfile } = useGetUserProfile(
    roast.submitter ? roast.submitter.toString() : null
  );

  const displayName = roast.anonymous ? 'Anonymous User' : (submitterProfile?.username || 'Unknown User');
  const avatarUrl = roast.anonymous ? '/assets/generated/default-avatar.dim_150x150.png' : (submitterProfile?.profilePicture?.getDirectURL() || '/assets/generated/default-avatar.dim_150x150.png');

  const date = new Date(Number(roast.timestamp) / 1000000);
  const formattedDate = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="bg-muted rounded-lg p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Avatar className="h-8 w-8">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback className="text-xs">
            {displayName[0]?.toUpperCase() || 'A'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="text-sm font-medium">{displayName}</p>
          <p className="text-xs text-muted-foreground">{formattedDate}</p>
        </div>
      </div>
      <p className="text-sm whitespace-pre-wrap">{roast.content}</p>
    </div>
  );
}
