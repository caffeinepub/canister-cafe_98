import { useGetUserNotifications, useMarkNotificationAsRead, useGetUserProfile } from '../hooks/useQueries';
import { Card } from '../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Loader2, Heart, MessageSquare, Flame, Users, MessageCircle, RefreshCw } from 'lucide-react';
import type { View } from '../App';

interface NotificationsPageProps {
  onNavigate: (view: View, userId?: string, conversationId?: string) => void;
}

export default function NotificationsPage({ onNavigate }: NotificationsPageProps) {
  const { data: notifications = [], isLoading } = useGetUserNotifications();
  const markAsRead = useMarkNotificationAsRead();

  const handleNotificationClick = (notification: any) => {
    if (!notification.read) {
      markAsRead.mutate(notification.id);
    }

    // Navigate based on notification type
    if (notification.eventType === 'follow') {
      onNavigate('user-profile', notification.sourceUser.toString());
    } else if (notification.eventType === 'message') {
      onNavigate('chat', undefined, notification.entityId);
    } else {
      // For like, comment, appRoast, appUpdate - could navigate to app detail view
      // For now, just mark as read
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="h-5 w-5 text-red-500" />;
      case 'comment':
        return <MessageSquare className="h-5 w-5 text-blue-500" />;
      case 'appRoast':
        return <Flame className="h-5 w-5 text-orange-500" />;
      case 'follow':
        return <Users className="h-5 w-5 text-green-500" />;
      case 'message':
        return <MessageCircle className="h-5 w-5 text-purple-500" />;
      case 'appUpdate':
        return <RefreshCw className="h-5 w-5 text-[oklch(var(--cocoa))]" />;
      default:
        return null;
    }
  };

  const getNotificationText = (notification: any, sourceProfile: any) => {
    const username = sourceProfile?.username || 'Someone';
    switch (notification.eventType) {
      case 'like':
        return `${username} liked your app`;
      case 'comment':
        return `${username} commented on your app`;
      case 'appRoast':
        return `${username} roasted your app`;
      case 'follow':
        return `${username} started following you`;
      case 'message':
        return `${username} sent you a message`;
      case 'appUpdate':
        return `${username} posted an update to their app`;
      default:
        return 'New notification';
    }
  };

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
      <h1 className="text-3xl font-bold mb-8 text-primary">Notifications</h1>

      {notifications.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No notifications yet</p>
        </Card>
      ) : (
        <div className="max-w-3xl mx-auto space-y-2">
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onClick={() => handleNotificationClick(notification)}
              getIcon={getNotificationIcon}
              getText={getNotificationText}
              formatTime={formatTimestamp}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface NotificationItemProps {
  notification: any;
  onClick: () => void;
  getIcon: (type: string) => React.ReactNode;
  getText: (notification: any, sourceProfile: any) => string;
  formatTime: (timestamp: bigint) => string;
}

function NotificationItem({ notification, onClick, getIcon, getText, formatTime }: NotificationItemProps) {
  const sourceUserId = notification.sourceUser.toString();
  const { data: sourceProfile } = useGetUserProfile(sourceUserId);

  return (
    <Card
      className={`p-4 cursor-pointer transition-colors hover:bg-accent/50 ${
        !notification.read ? 'bg-accent/20' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">{getIcon(notification.eventType)}</div>

        <Avatar className="h-10 w-10">
          {sourceProfile?.profilePicture && (
            <AvatarImage src={sourceProfile.profilePicture.getDirectURL()} alt={sourceProfile.username} />
          )}
          <AvatarFallback className="bg-primary/10 text-primary">
            {sourceProfile?.username?.[0]?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{getText(notification, sourceProfile)}</p>
          <p className="text-xs text-muted-foreground">{formatTime(notification.timestamp)}</p>
        </div>

        {!notification.read && (
          <Badge variant="default" className="ml-2">
            New
          </Badge>
        )}
      </div>
    </Card>
  );
}
