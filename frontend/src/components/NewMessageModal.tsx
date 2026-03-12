import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Loader2, Search, MessageCircle, AlertCircle } from 'lucide-react';
import { useGetAllUsersForMessaging, useStartConversation } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { toast } from 'sonner';
import { Principal } from '@icp-sdk/core/principal';
import type { View } from '../App';
import { Alert, AlertDescription } from './ui/alert';

interface NewMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: View, userId?: string, conversationId?: string) => void;
}

export default function NewMessageModal({ isOpen, onClose, onNavigate }: NewMessageModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const { identity } = useInternetIdentity();
  const { data: allUsers = [], isLoading } = useGetAllUsersForMessaging();
  const startConversation = useStartConversation();

  const currentUserId = identity?.getPrincipal().toString();

  // Filter users based on search term and exclude current user
  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return [];
    
    const lowerSearch = searchTerm.toLowerCase();
    return allUsers.filter((user) => {
      // Exclude current user
      if (user.principalId === currentUserId) return false;
      
      // Exclude invalid principals
      if (!user.principalId || user.principalId === 'aaaaa-aa' || user.principalId.trim() === '') {
        return false;
      }
      
      // Validate principal format
      try {
        Principal.fromText(user.principalId);
      } catch {
        return false;
      }
      
      // Search by username or bio
      return (
        user.username.toLowerCase().includes(lowerSearch) ||
        (user.bio && user.bio.toLowerCase().includes(lowerSearch))
      );
    });
  }, [allUsers, searchTerm, currentUserId]);

  const handleStartConversation = async (principalId: string, username: string) => {
    // Validate principal ID before attempting to start conversation
    if (!principalId || principalId.trim() === '' || principalId === 'aaaaa-aa') {
      toast.error('Invalid user. Cannot start conversation.');
      return;
    }

    try {
      // Validate principal format
      Principal.fromText(principalId);
      
      const conversationId = await startConversation.mutateAsync(principalId);
      toast.success(`Starting conversation with ${username}...`);
      onClose();
      setSearchTerm(''); // Reset search
      onNavigate('chat', undefined, conversationId);
    } catch (error: any) {
      console.error('Start conversation error:', error);
      
      // User-friendly error messages
      if (error.message?.includes('Invalid receiver principal id')) {
        toast.error(`${username} does not have a valid profile. Cannot start conversation.`);
      } else if (error.message?.includes('does not exist')) {
        toast.error(`${username} does not exist or does not have a profile.`);
      } else if (error.message?.includes('checksum') || error.message?.includes('Invalid principal')) {
        toast.error('Invalid user ID. Please try selecting a different user.');
      } else if (error.message?.includes('Cannot start conversation with yourself')) {
        toast.error('You cannot send messages to yourself.');
      } else {
        toast.error(error?.message || 'Failed to start conversation. Please try again.');
      }
    }
  };

  const handleClose = () => {
    setSearchTerm(''); // Reset search on close
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Message</DialogTitle>
          <DialogDescription>
            Search for a user to start a conversation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>

          {allUsers.length === 0 && !isLoading && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No users available for messaging yet. Users need to have profiles to receive messages.
              </AlertDescription>
            </Alert>
          )}

          <div className="max-h-[300px] overflow-y-auto space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : searchTerm.trim() === '' ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Start typing to search for users</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No users found</p>
              </div>
            ) : (
              filteredUsers.map((user) => (
                <div
                  key={user.principalId}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => handleStartConversation(user.principalId, user.username)}
                >
                  <Avatar className="h-10 w-10">
                    {user.profilePicture && (
                      <AvatarImage
                        src={user.profilePicture.getDirectURL()}
                        alt={user.username}
                      />
                    )}
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {user.username[0]?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{user.username}</p>
                    {user.bio && (
                      <p className="text-sm text-muted-foreground truncate">
                        {user.bio}
                      </p>
                    )}
                  </div>
                  <MessageCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
