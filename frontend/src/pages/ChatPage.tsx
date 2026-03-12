import { useState, useEffect, useRef } from 'react';
import { useGetMessages, useSendMessage, useMarkMessageAsRead, useGetUserProfile } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Card } from '../components/ui/card';
import { ArrowLeft, Send, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Principal } from '@icp-sdk/core/principal';
import type { View } from '../App';

interface ChatPageProps {
  conversationId: string;
  onNavigate: (view: View) => void;
}

export default function ChatPage({ conversationId, onNavigate }: ChatPageProps) {
  const { identity } = useInternetIdentity();
  const { data: messages = [], isLoading, refetch } = useGetMessages(conversationId);
  const sendMessage = useSendMessage();
  const markAsRead = useMarkMessageAsRead();
  const [messageContent, setMessageContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentUserId = identity?.getPrincipal().toString();

  // Extract contact ID from conversation ID
  // Conversation ID format: "principalA-principalB" (sorted alphabetically)
  const extractContactId = (convId: string, currentUser: string | undefined): string | null => {
    if (!currentUser) return null;
    
    try {
      // Split conversation ID by hyphen
      const parts = convId.split('-');
      
      // Try to reconstruct both possible principals
      let principal1 = '';
      let principal2 = '';
      let foundSeparator = false;
      
      for (let i = 0; i < parts.length; i++) {
        if (!foundSeparator) {
          if (principal1) principal1 += '-';
          principal1 += parts[i];
          
          // Try to validate if this is a complete principal
          try {
            Principal.fromText(principal1);
            // If valid, the rest is the second principal
            principal2 = parts.slice(i + 1).join('-');
            foundSeparator = true;
          } catch {
            // Not yet a valid principal, continue building
          }
        }
      }
      
      // Validate both principals
      if (!principal1 || !principal2) return null;
      
      try {
        Principal.fromText(principal1);
        Principal.fromText(principal2);
      } catch {
        return null;
      }
      
      // Return the one that's not the current user
      if (principal1 === currentUser) return principal2;
      if (principal2 === currentUser) return principal1;
      
      return null;
    } catch (error) {
      console.error('Error extracting contact ID:', error);
      return null;
    }
  };

  const contactId = extractContactId(conversationId, currentUserId);

  // Validate contact ID
  const isValidContactId = contactId && contactId !== 'aaaaa-aa' && contactId.trim() !== '';

  const { data: contactProfile } = useGetUserProfile(isValidContactId ? contactId : null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark unread messages as read
  useEffect(() => {
    if (!currentUserId || messages.length === 0) return;
    
    const unreadMessages = messages.filter(
      (msg) => !msg.read && msg.receiver.toString() === currentUserId
    );
    
    unreadMessages.forEach((msg) => {
      markAsRead.mutate(msg.id);
    });
  }, [messages, currentUserId, markAsRead]);

  const handleSendMessage = async () => {
    if (!messageContent.trim()) {
      toast.error('Please enter a message');
      return;
    }

    if (!isValidContactId) {
      toast.error('Invalid conversation. Cannot send message.');
      return;
    }

    try {
      // Validate the principal format before sending
      Principal.fromText(contactId);
      
      await sendMessage.mutateAsync({
        receiver: contactId,
        content: messageContent.trim(),
      });
      setMessageContent('');
      // Immediately refetch messages to show the new message
      refetch();
    } catch (error: any) {
      console.error('Send message error:', error);
      
      // User-friendly error messages
      if (error.message?.includes('Invalid receiver principal id')) {
        toast.error('This user does not have a profile. Cannot send message.');
      } else if (error.message?.includes('checksum') || error.message?.includes('Invalid principal')) {
        toast.error('Invalid recipient ID. Please return to messages and try again.');
      } else if (error.message?.includes('does not exist')) {
        toast.error('This user no longer exists or does not have a profile.');
      } else {
        toast.error(error.message || 'Failed to send message. Please try again.');
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTimestamp = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) / 1000000);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!isValidContactId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onNavigate('messages')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="font-semibold text-lg">Invalid Conversation</h2>
        </div>
        <Card className="p-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h3 className="text-lg font-semibold mb-2">Cannot Load Conversation</h3>
          <p className="text-muted-foreground mb-4">
            This conversation has an invalid recipient or the user no longer exists. Please return to messages and try again.
          </p>
          <Button onClick={() => onNavigate('messages')}>
            Back to Messages
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onNavigate('messages')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Avatar className="h-10 w-10">
          {contactProfile?.profilePicture && (
            <AvatarImage src={contactProfile.profilePicture.getDirectURL()} alt={contactProfile.username} />
          )}
          <AvatarFallback className="bg-primary/10 text-primary">
            {contactProfile?.username?.[0]?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
        <div>
          <h2 className="font-semibold text-lg">{contactProfile?.username || 'Loading...'}</h2>
        </div>
      </div>

      {/* Messages */}
      <Card className="p-4 mb-4 min-h-[500px] max-h-[600px] overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => {
              const isOwnMessage = message.sender.toString() === currentUserId;
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      isOwnMessage
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm break-words">{message.content}</p>
                    <span
                      className={`text-xs mt-1 block ${
                        isOwnMessage ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      }`}
                    >
                      {formatTimestamp(message.timestamp)}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </Card>

      {/* Message Input */}
      <div className="flex gap-2">
        <Textarea
          placeholder="Type a message..."
          value={messageContent}
          onChange={(e) => setMessageContent(e.target.value)}
          onKeyDown={handleKeyPress}
          className="resize-none"
          rows={2}
          disabled={sendMessage.isPending}
        />
        <Button
          onClick={handleSendMessage}
          disabled={!messageContent.trim() || sendMessage.isPending}
          size="icon"
          className="h-auto"
        >
          {sendMessage.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>
    </div>
  );
}
