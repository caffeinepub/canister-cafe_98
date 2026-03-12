import { useState } from 'react';
import { useGetUserConversations, useGetUserProfile } from '../hooks/useQueries';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Loader2, MessageCircle, Plus } from 'lucide-react';
import NewMessageModal from '../components/NewMessageModal';
import type { View } from '../App';

interface MessagesPageProps {
  onNavigate: (view: View, userId?: string, conversationId?: string) => void;
}

export default function MessagesPage({ onNavigate }: MessagesPageProps) {
  const { data: conversations = [], isLoading } = useGetUserConversations();
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);

  // Filter out invalid conversations
  const validConversations = conversations.filter(conv => {
    const contactId = conv.contact.toString();
    return contactId && contactId !== 'aaaaa-aa' && contactId.trim() !== '';
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-primary">Messages</h1>
        <Button onClick={() => setShowNewMessageModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Message
        </Button>
      </div>

      {validConversations.length === 0 ? (
        <Card className="p-12 text-center">
          <MessageCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">No messages yet</h2>
          <p className="text-muted-foreground mb-4">
            Start a conversation by clicking the button above or visiting a user's profile.
          </p>
          <Button onClick={() => setShowNewMessageModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Start a Conversation
          </Button>
        </Card>
      ) : (
        <div className="max-w-3xl mx-auto space-y-2">
          {validConversations.map((conversation) => (
            <ConversationItem
              key={conversation.conversationId}
              conversation={conversation}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}

      <NewMessageModal
        isOpen={showNewMessageModal}
        onClose={() => setShowNewMessageModal(false)}
        onNavigate={onNavigate}
      />
    </div>
  );
}

interface ConversationItemProps {
  conversation: {
    conversationId: string;
    contact: any;
    lastMessage?: {
      content: string;
      timestamp: bigint;
      sender: any;
    };
    unreadCount: bigint;
  };
  onNavigate: (view: View, userId?: string, conversationId?: string) => void;
}

function ConversationItem({ conversation, onNavigate }: ConversationItemProps) {
  const contactId = conversation.contact.toString();
  const { data: contactProfile } = useGetUserProfile(contactId);

  const formatTimestamp = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) / 1000000);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleClick = () => {
    onNavigate('chat', undefined, conversation.conversationId);
  };

  const unreadCount = Number(conversation.unreadCount);

  return (
    <Card
      className="p-4 hover:bg-accent/50 cursor-pointer transition-colors"
      onClick={handleClick}
    >
      <div className="flex items-center gap-4">
        <Avatar className="h-12 w-12">
          {contactProfile?.profilePicture && (
            <AvatarImage src={contactProfile.profilePicture.getDirectURL()} alt={contactProfile.username} />
          )}
          <AvatarFallback className="bg-primary/10 text-primary">
            {contactProfile?.username?.[0]?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-foreground truncate">
              {contactProfile?.username || 'Loading...'}
            </h3>
            {conversation.lastMessage && (
              <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                {formatTimestamp(conversation.lastMessage.timestamp)}
              </span>
            )}
          </div>
          {conversation.lastMessage && (
            <p className="text-sm text-muted-foreground truncate">
              {conversation.lastMessage.content}
            </p>
          )}
        </div>

        {unreadCount > 0 && (
          <Badge variant="destructive" className="ml-2 flex-shrink-0">
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </div>
    </Card>
  );
}
