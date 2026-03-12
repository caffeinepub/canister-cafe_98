import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Loader2 } from 'lucide-react';
import { useSubmitAppRoast } from '../hooks/useQueries';
import { toast } from 'sonner';

interface AppRoastModalProps {
  appId: string;
  appName: string;
  onClose: () => void;
}

export default function AppRoastModal({ appId, appName, onClose }: AppRoastModalProps) {
  const [content, setContent] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const submitRoast = useSubmitAppRoast();

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error('Please enter your feedback');
      return;
    }

    try {
      await submitRoast.mutateAsync({
        appId,
        content: content.trim(),
        anonymous,
      });
      toast.success('App Roast submitted successfully! Only the creator can see it.');
      onClose();
    } catch (error: any) {
      console.error('Submit roast error:', error);
      if (error.message?.includes('empty')) {
        toast.error('Feedback cannot be empty');
      } else {
        toast.error('Failed to submit feedback');
      }
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>App Roast: {appName}</DialogTitle>
          <DialogDescription>
            Share constructive criticism to help improve this app. Your feedback will only be visible to the app creator.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="roast-content">Your Feedback</Label>
            <Textarea
              id="roast-content"
              placeholder="Share your honest thoughts and suggestions for improvement..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground">
              {content.length}/1000 characters
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="anonymous"
              checked={anonymous}
              onCheckedChange={(checked) => setAnonymous(checked === true)}
            />
            <Label
              htmlFor="anonymous"
              className="text-sm font-normal cursor-pointer"
            >
              Post anonymously (your identity will be hidden from the creator)
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitRoast.isPending || !content.trim()}>
            {submitRoast.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Roast'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
