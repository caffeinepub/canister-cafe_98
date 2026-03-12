import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Loader2, MessageCircle, User } from 'lucide-react';
import { useGetFollowersList, useGetFollowingList, useStartConversation } from '../hooks/useQueries';
import { toast } from 'sonner';
import type { View } from '../App';

interface FollowersModalProps {
  userId: string;
  type: 'followers' | 'following';
  onClose: () => void;
  onNavigate: (view: View, userId?: string, conversationId?: string) => void;
}

export default function FollowersModal({ userId, type, onClose, onNavigate }: FollowersModalProps) {
  const { data: followersList, isLoading: followersLoading } = useGetFollowersList(type === 'followers' ? userId : null);
  const { data: followingList, isLoading: followingLoading } = useGetFollowingList(type === 'following' ? userId : null);
  const startConversation = useStartConversation();

  const isLoading = type === 'followers' ? followersLoading : followingLoading;
  const userList = type === 'followers' ? followersList : followingList;

  const handleViewProfile = (principalId: string) => {
    onClose();
    onNavigate('profile', principalId);
  };

  const handleMessage = async (principalId: string) => {
    try {
      const conversationId = await startConversation.mutateAsync(principalId);
      onClose();
      onNavigate('chat', undefined, conversationId);
    } catch (error: any) {
      console.error('Start conversation error:', error);
      toast.error(error?.message || 'Failed to start conversation');
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {type === 'followers' ? 'Followers' : 'Following'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : userList && userList.length > 0 ? (
            <div className="space-y-3">
              {userList.map(([principal, profile]) => {
                const principalId = principal.toString();
                
                if (!profile) {
                  return (
                    <div key={principalId} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback>
                          <User className="h-6 w-6" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-muted-foreground truncate">Unknown User</p>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={principalId} className="flex items-center gap-3 p-3 rounded-lg bg-card border hover:border-primary/50 transition-colors">
                    <Avatar className="h-12 w-12 cursor-pointer" onClick={() => handleViewProfile(principalId)}>
                      <AvatarImage src={profile.profilePicture?.getDirectURL() || '/assets/generated/default-avatar.dim_150x150.png'} />
                      <AvatarFallback className="text-lg">{profile.username[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <p 
                        className="font-semibold truncate cursor-pointer hover:text-primary transition-colors"
                        onClick={() => handleViewProfile(principalId)}
                      >
                        {profile.username}
                      </p>
                      {profile.bio && (
                        <p className="text-sm text-muted-foreground truncate">{profile.bio}</p>
                      )}
                    </div>

                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewProfile(principalId)}
                      >
                        <User className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMessage(principalId)}
                        disabled={startConversation.isPending}
                      >
                        {startConversation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <MessageCircle className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No {type === 'followers' ? 'followers' : 'following'} yet</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
