import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Loader2, RefreshCw } from 'lucide-react';
import { usePostAppUpdate } from '../hooks/useQueries';
import { toast } from 'sonner';

interface AppUpdateModalProps {
  appId: string;
  appName: string;
  onClose: () => void;
}

export default function AppUpdateModal({ appId, appName, onClose }: AppUpdateModalProps) {
  const [updateDescription, setUpdateDescription] = useState('');
  const postUpdate = usePostAppUpdate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!updateDescription.trim()) {
      toast.error('Please enter an update description');
      return;
    }

    try {
      await postUpdate.mutateAsync({
        appId,
        updateDescription: updateDescription.trim(),
      });
      toast.success('App update posted successfully! Your followers have been notified.');
      onClose();
    } catch (error: any) {
      console.error('Post update error:', error);
      toast.error(error.message || 'Failed to post update');
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-[oklch(var(--cocoa))]" />
            Post App Update
          </DialogTitle>
          <DialogDescription>
            Share what's new with <span className="font-semibold">{appName}</span>. Your followers will be notified.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="updateDescription">
                Update Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="updateDescription"
                placeholder="What's new in this update? (e.g., new features, bug fixes, improvements...)"
                value={updateDescription}
                onChange={(e) => setUpdateDescription(e.target.value)}
                rows={5}
                className="resize-none"
                required
              />
              <p className="text-xs text-muted-foreground">
                Describe the changes or improvements you've made to your app.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={postUpdate.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={postUpdate.isPending || !updateDescription.trim()}>
              {postUpdate.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Posting...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Post Update
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
